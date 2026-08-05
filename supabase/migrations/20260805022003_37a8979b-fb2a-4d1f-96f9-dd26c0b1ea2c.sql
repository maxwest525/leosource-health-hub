CREATE OR REPLACE FUNCTION public.claim_handoff(
  _session_id uuid,
  _actor text,
  _external_id text,
  _idempotency_key text,
  _regenerate boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  s public.enrollment_sessions;
  key text;
  ext text;
BEGIN
  SELECT * INTO s FROM public.enrollment_sessions WHERE id = _session_id FOR UPDATE;
  IF s.id IS NULL THEN
    RETURN jsonb_build_object('result','not_found');
  END IF;
  IF s.assigned_agent IS DISTINCT FROM _actor THEN
    RETURN jsonb_build_object('result','not_assigned');
  END IF;
  IF s.handoff_status = 'requested' THEN
    RETURN jsonb_build_object('result','in_progress');
  END IF;
  IF s.handoff_status = 'created' AND NOT COALESCE(_regenerate,false) THEN
    RETURN jsonb_build_object(
      'result','already_created',
      'shopping_url', s.healthsherpa_shopping_url,
      'client_apply_url', s.healthsherpa_client_apply_url
    );
  END IF;
  IF s.status <> 'agent_approved' AND NOT (COALESCE(_regenerate,false) AND s.handoff_status = 'created') THEN
    RETURN jsonb_build_object('result','not_approved');
  END IF;

  key := CASE WHEN COALESCE(_regenerate,false) THEN _idempotency_key
              ELSE COALESCE(s.handoff_idempotency_key, _idempotency_key) END;
  ext := COALESCE(s.external_id, _external_id);

  UPDATE public.enrollment_sessions
     SET handoff_status = 'requested',
         handoff_idempotency_key = key,
         external_id = ext
   WHERE id = _session_id;

  RETURN jsonb_build_object(
    'result','claimed',
    'idempotency_key', key,
    'external_id', ext,
    'previous_handoff_status', s.handoff_status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_handoff(uuid,text,text,text,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_handoff(uuid,text,text,text,boolean) TO service_role;