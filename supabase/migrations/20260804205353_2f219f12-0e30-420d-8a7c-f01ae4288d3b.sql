CREATE TYPE public.enrollment_session_status AS ENUM (
  'intake_in_progress',
  'ready_for_agent_review',
  'needs_consumer_correction',
  'agent_approved',
  'healthsherpa_handoff_created',
  'enrollment_completion_unknown',
  'enrollment_confirmed',
  'follow_up_required'
);

CREATE TABLE public.enrollment_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  public_token text NOT NULL UNIQUE,
  status public.enrollment_session_status NOT NULL DEFAULT 'intake_in_progress',
  zip_code text,
  county_fips text,
  state text,
  household_size integer,
  annual_income numeric,
  income_period text,
  effective_date date,
  members jsonb NOT NULL DEFAULT '[]'::jsonb,
  saved_doctors jsonb NOT NULL DEFAULT '[]'::jsonb,
  saved_prescriptions jsonb NOT NULL DEFAULT '[]'::jsonb,
  selected_plan jsonb,
  compared_plans jsonb NOT NULL DEFAULT '[]'::jsonb,
  contact jsonb,
  external_id text,
  healthsherpa_enrollment_session_id text,
  healthsherpa_confirmation_id text,
  healthsherpa_enrollment_url text,
  policy_status jsonb NOT NULL DEFAULT '{"application_status":"unknown","policy_status":"unknown","payment_status":"unknown","effective_date":null,"balance":null,"grace_period":null}'::jsonb,
  assigned_agent text,
  agent_note text,
  correction_note text,
  reviewed_at timestamp with time zone,
  handoff_at timestamp with time zone,
  last_reconciled_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT enrollment_sessions_token_len CHECK (length(public_token) >= 24)
);

CREATE INDEX enrollment_sessions_status_idx ON public.enrollment_sessions (status, updated_at DESC);
CREATE INDEX enrollment_sessions_external_id_idx ON public.enrollment_sessions (external_id);

GRANT SELECT, UPDATE ON public.enrollment_sessions TO authenticated;
GRANT ALL ON public.enrollment_sessions TO service_role;

ALTER TABLE public.enrollment_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read enrollment sessions"
  ON public.enrollment_sessions FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update enrollment sessions"
  ON public.enrollment_sessions FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE TRIGGER update_enrollment_sessions_updated_at
  BEFORE UPDATE ON public.enrollment_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE FUNCTION public.start_enrollment_session()
RETURNS TABLE (id uuid, public_token text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_token text := encode(extensions.gen_random_bytes(24), 'hex');
BEGIN
  RETURN QUERY
  INSERT INTO public.enrollment_sessions (public_token)
  VALUES (new_token)
  RETURNING enrollment_sessions.id, enrollment_sessions.public_token;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_enrollment_session(_public_token text)
RETURNS SETOF public.enrollment_sessions
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.enrollment_sessions
  WHERE public_token = _public_token
    AND length(_public_token) >= 24
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.save_enrollment_session(_public_token text, _patch jsonb)
RETURNS SETOF public.enrollment_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target public.enrollment_sessions;
BEGIN
  SELECT * INTO target FROM public.enrollment_sessions
   WHERE public_token = _public_token AND length(_public_token) >= 24;

  IF target.id IS NULL THEN
    RAISE EXCEPTION 'enrollment session not found';
  END IF;

  IF target.status NOT IN ('intake_in_progress', 'needs_consumer_correction') THEN
    RAISE EXCEPTION 'enrollment session is locked for agent review';
  END IF;

  RETURN QUERY
  UPDATE public.enrollment_sessions s SET
    zip_code            = COALESCE(_patch->>'zip_code', s.zip_code),
    county_fips         = COALESCE(_patch->>'county_fips', s.county_fips),
    state               = COALESCE(_patch->>'state', s.state),
    household_size      = COALESCE((_patch->>'household_size')::integer, s.household_size),
    annual_income       = COALESCE((_patch->>'annual_income')::numeric, s.annual_income),
    income_period       = COALESCE(_patch->>'income_period', s.income_period),
    effective_date      = COALESCE((_patch->>'effective_date')::date, s.effective_date),
    members             = COALESCE(_patch->'members', s.members),
    saved_doctors       = COALESCE(_patch->'saved_doctors', s.saved_doctors),
    saved_prescriptions = COALESCE(_patch->'saved_prescriptions', s.saved_prescriptions),
    selected_plan       = COALESCE(_patch->'selected_plan', s.selected_plan),
    compared_plans      = COALESCE(_patch->'compared_plans', s.compared_plans),
    contact             = COALESCE(_patch->'contact', s.contact),
    status              = CASE
                            WHEN _patch->>'status' = 'ready_for_agent_review'
                            THEN 'ready_for_agent_review'::public.enrollment_session_status
                            ELSE s.status
                          END
  WHERE s.id = target.id
  RETURNING s.*;
END;
$$;

REVOKE ALL ON FUNCTION public.start_enrollment_session() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_enrollment_session(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_enrollment_session(text, jsonb) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.start_enrollment_session() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_enrollment_session(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.save_enrollment_session(text, jsonb) TO anon, authenticated, service_role;

GRANT SELECT ON public.plans TO anon, authenticated;
GRANT SELECT ON public.providers TO anon, authenticated;
GRANT SELECT ON public.medications TO anon, authenticated;
GRANT SELECT ON public.carriers TO anon, authenticated;
GRANT SELECT ON public.formularies TO anon, authenticated;
GRANT SELECT ON public.provider_networks TO anon, authenticated;
GRANT SELECT ON public.networks TO anon, authenticated;
GRANT SELECT ON public.pharmacies TO anon, authenticated;
GRANT SELECT ON public.plan_pharmacies TO anon, authenticated;
GRANT ALL ON public.plans TO service_role;
GRANT ALL ON public.providers TO service_role;
GRANT ALL ON public.medications TO service_role;
GRANT ALL ON public.carriers TO service_role;
GRANT ALL ON public.formularies TO service_role;
GRANT ALL ON public.provider_networks TO service_role;
GRANT ALL ON public.networks TO service_role;
GRANT ALL ON public.pharmacies TO service_role;
GRANT ALL ON public.plan_pharmacies TO service_role;