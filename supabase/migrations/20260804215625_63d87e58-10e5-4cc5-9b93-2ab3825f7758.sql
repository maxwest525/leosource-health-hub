CREATE OR REPLACE FUNCTION public.current_actor()
RETURNS text LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT COALESCE(auth.jwt() ->> 'email', auth.uid()::text, 'system')
$$;

CREATE OR REPLACE FUNCTION public.record_enrollment_event(
  _session_id uuid, _event_type text, _detail jsonb DEFAULT '{}'::jsonb
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.enrollment_events (session_id, event_type, actor, detail)
  VALUES (_session_id, _event_type, public.current_actor(), COALESCE(_detail, '{}'::jsonb));
END;
$$;

CREATE OR REPLACE FUNCTION public.agent_claim_review(_session_id uuid)
RETURNS SETOF public.enrollment_sessions LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE actor text := public.current_actor();
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'not authorized'; END IF;
  PERFORM public.record_enrollment_event(_session_id, 'agent_claimed_review', jsonb_build_object('agent', actor));
  RETURN QUERY
  UPDATE public.enrollment_sessions s
     SET status = 'in_agent_review', assigned_agent = actor, reviewed_at = now()
   WHERE s.id = _session_id
     AND (s.assigned_agent IS NULL OR s.assigned_agent = actor)
     AND s.status IN ('ready_for_agent_review', 'in_agent_review', 'needs_consumer_correction', 'reconciliation_required')
  RETURNING s.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.agent_release_review(_session_id uuid)
RETURNS SETOF public.enrollment_sessions LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE actor text := public.current_actor();
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'not authorized'; END IF;
  PERFORM public.record_enrollment_event(_session_id, 'agent_released_review', jsonb_build_object('agent', actor));
  RETURN QUERY
  UPDATE public.enrollment_sessions s
     SET assigned_agent = NULL,
         status = CASE WHEN s.status = 'in_agent_review' THEN 'ready_for_agent_review'::public.enrollment_session_status ELSE s.status END
   WHERE s.id = _session_id
  RETURNING s.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.agent_approve_review(_session_id uuid)
RETURNS SETOF public.enrollment_sessions LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE actor text := public.current_actor();
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'not authorized'; END IF;
  PERFORM public.record_enrollment_event(_session_id, 'agent_approved', jsonb_build_object('agent', actor));
  RETURN QUERY
  UPDATE public.enrollment_sessions s
     SET status = 'agent_approved', assigned_agent = COALESCE(s.assigned_agent, actor),
         reviewed_at = now(), correction_note = NULL, field_corrections = '[]'::jsonb
   WHERE s.id = _session_id
     AND s.status IN ('ready_for_agent_review', 'in_agent_review')
  RETURNING s.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.agent_request_correction(
  _session_id uuid, _note text, _fields jsonb DEFAULT '[]'::jsonb
) RETURNS SETOF public.enrollment_sessions LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE actor text := public.current_actor();
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'not authorized'; END IF;
  PERFORM public.record_enrollment_event(_session_id, 'consumer_correction_requested',
    jsonb_build_object('agent', actor, 'note', _note, 'fields', COALESCE(_fields, '[]'::jsonb)));
  RETURN QUERY
  UPDATE public.enrollment_sessions s
     SET status = 'needs_consumer_correction',
         correction_note = _note,
         field_corrections = COALESCE(_fields, '[]'::jsonb)
   WHERE s.id = _session_id
  RETURNING s.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.agent_add_note(_session_id uuid, _note text)
RETURNS SETOF public.enrollment_sessions LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE actor text := public.current_actor();
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'not authorized'; END IF;
  PERFORM public.record_enrollment_event(_session_id, 'agent_note_added', jsonb_build_object('agent', actor, 'note', _note));
  RETURN QUERY
  UPDATE public.enrollment_sessions s SET agent_note = _note WHERE s.id = _session_id RETURNING s.*;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_enrollment_event(uuid, text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.agent_claim_review(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.agent_release_review(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.agent_approve_review(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.agent_request_correction(uuid, text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.agent_add_note(uuid, text) FROM anon;
