-- 1. New review stages
ALTER TYPE public.enrollment_session_status ADD VALUE IF NOT EXISTS 'in_agent_review';
ALTER TYPE public.enrollment_session_status ADD VALUE IF NOT EXISTS 'enrollment_in_progress';
ALTER TYPE public.enrollment_session_status ADD VALUE IF NOT EXISTS 'completed';
ALTER TYPE public.enrollment_session_status ADD VALUE IF NOT EXISTS 'reconciliation_required';

-- 2. Handoff + reconciliation columns
ALTER TABLE public.enrollment_sessions
  ADD COLUMN IF NOT EXISTS handoff_status text,
  ADD COLUMN IF NOT EXISTS handoff_request_id text,
  ADD COLUMN IF NOT EXISTS handoff_idempotency_key text,
  ADD COLUMN IF NOT EXISTS healthsherpa_shopping_url text,
  ADD COLUMN IF NOT EXISTS healthsherpa_client_apply_url text,
  ADD COLUMN IF NOT EXISTS handoff_opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_reconciliation_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS reconciliation_error text,
  ADD COLUMN IF NOT EXISTS field_corrections jsonb NOT NULL DEFAULT '[]'::jsonb;

GRANT SELECT, UPDATE ON public.enrollment_sessions TO authenticated;
GRANT ALL ON public.enrollment_sessions TO service_role;

-- 3. Immutable audit history
CREATE TABLE IF NOT EXISTS public.enrollment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.enrollment_sessions(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  actor text,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS enrollment_events_session_idx
  ON public.enrollment_events (session_id, created_at DESC);

GRANT SELECT ON public.enrollment_events TO authenticated;
GRANT ALL ON public.enrollment_events TO service_role;

ALTER TABLE public.enrollment_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read enrollment events" ON public.enrollment_events;
CREATE POLICY "Staff can read enrollment events"
  ON public.enrollment_events FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
