CREATE OR REPLACE FUNCTION public.agent_add_note(_session_id uuid, _note text)
RETURNS SETOF enrollment_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  actor text := public.current_actor();
  updated public.enrollment_sessions;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'not authorized'; END IF;
  IF COALESCE(btrim(_note), '') = '' THEN RAISE EXCEPTION 'a note is required'; END IF;
  IF length(_note) > 500 THEN
    RAISE EXCEPTION 'agent_note_too_long: notes must be 500 characters or fewer (got %)', length(_note);
  END IF;

  UPDATE public.enrollment_sessions s SET agent_note = _note
   WHERE s.id = _session_id
     AND s.assigned_agent = actor
     AND s.status IN ('in_agent_review','needs_consumer_correction','agent_approved',
                      'healthsherpa_handoff_created','enrollment_in_progress',
                      'reconciliation_required','enrollment_completion_unknown','follow_up_required')
  RETURNING s.* INTO updated;

  IF updated.id IS NULL THEN
    RAISE EXCEPTION 'only the assigned agent can add a note to an active case';
  END IF;

  PERFORM public.record_enrollment_event(_session_id, 'agent_note_added', jsonb_build_object('agent', actor, 'note', _note));
  RETURN NEXT updated;
END;
$function$;