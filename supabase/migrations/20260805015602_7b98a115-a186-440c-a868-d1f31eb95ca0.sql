-- ============ shared helpers ============

CREATE OR REPLACE FUNCTION public.enrollment_correction_paths()
RETURNS text[] LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT ARRAY[
    'zip_code','county_fips','state','household_size','annual_income','members',
    'effective_date','contact.firstName','contact.lastName','contact.email',
    'contact.phone','acknowledgements','saved_doctors','saved_prescriptions','selected_plan'
  ]::text[]
$$;

REVOKE ALL ON FUNCTION public.enrollment_correction_paths() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enrollment_correction_paths() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.validate_enrollment_session_row(s public.enrollment_sessions)
RETURNS text[] LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE
  errs text[] := '{}';
  m jsonb;
  primaries int := 0;
  cnt int := 0;
  dob date;
  c jsonb := COALESCE(s.contact, '{}'::jsonb);
  email text;
  phone text;
BEGIN
  IF jsonb_typeof(c) <> 'object' THEN c := '{}'::jsonb; END IF;
  email := NULLIF(c->>'email', '');
  phone := NULLIF(c->>'phone', '');

  IF COALESCE(s.zip_code,'') !~ '^[0-9]{5}$' THEN errs := errs || 'A valid 5-digit ZIP code is required.'; END IF;
  IF COALESCE(s.county_fips,'') !~ '^[0-9]{4,5}$' THEN errs := errs || 'A valid county FIPS code is required.'; END IF;
  IF COALESCE(s.state,'') !~ '^[A-Za-z]{2}$' THEN errs := errs || 'A valid two-letter state is required.'; END IF;
  IF COALESCE(s.household_size, 0) < 1 THEN errs := errs || 'Household size must be at least 1.'; END IF;
  IF s.annual_income IS NULL OR s.annual_income < 0 THEN errs := errs || 'A non-negative household income is required.'; END IF;
  IF COALESCE(s.income_period,'') NOT IN ('year','month') THEN errs := errs || 'Income period must be year or month.'; END IF;
  IF s.effective_date IS NULL THEN errs := errs || 'A requested coverage effective date is required.'; END IF;

  IF jsonb_typeof(s.members) <> 'array' OR jsonb_array_length(s.members) < 1 THEN
    errs := errs || 'At least one applicant is required.';
  ELSE
    FOR m IN SELECT * FROM jsonb_array_elements(s.members) LOOP
      cnt := cnt + 1;
      IF COALESCE(m->>'relationship','') = 'primary' THEN primaries := primaries + 1; END IF;
      IF COALESCE(m->>'relationship','') NOT IN ('primary','spouse','dependent','child') THEN
        errs := errs || format('Applicant %s has an invalid relationship.', cnt);
      END IF;
      BEGIN
        dob := (m->>'dob')::date;
      EXCEPTION WHEN others THEN
        dob := NULL;
      END;
      IF dob IS NULL THEN
        errs := errs || format('Applicant %s has an invalid date of birth.', cnt);
      ELSIF dob > current_date THEN
        errs := errs || format('Applicant %s has a future date of birth.', cnt);
      END IF;
    END LOOP;
    IF primaries <> 1 THEN errs := errs || 'Exactly one primary applicant is required.'; END IF;
  END IF;

  IF COALESCE(c->>'firstName','') = '' THEN errs := errs || 'Contact first name is required.'; END IF;
  IF COALESCE(c->>'lastName','') = '' THEN errs := errs || 'Contact last name is required.'; END IF;
  IF email IS NULL AND phone IS NULL THEN errs := errs || 'An email address or phone number is required.'; END IF;
  IF email IS NOT NULL AND email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]{2,}$' THEN
    errs := errs || 'The email address is invalid.';
  END IF;
  IF phone IS NOT NULL AND length(regexp_replace(phone, '[^0-9]', '', 'g')) < 10 THEN
    errs := errs || 'The phone number must be a full 10-digit US number.';
  END IF;
  IF COALESCE(c->>'answersConfirmedAt','') = '' THEN errs := errs || 'Answers must be confirmed before review.'; END IF;
  IF COALESCE(c->>'reviewConsentAt','') = '' THEN errs := errs || 'Review consent is required before submission.'; END IF;

  RETURN errs;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_enrollment_session_row(public.enrollment_sessions) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_enrollment_session_row(public.enrollment_sessions) TO authenticated, service_role;

-- ============ consumer save ============

CREATE OR REPLACE FUNCTION public.save_enrollment_session(_public_token text, _patch jsonb)
RETURNS SETOF public.enrollment_sessions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s public.enrollment_sessions;
  was_correction boolean;
  corrections text[];
  errs text[];
  v_text text;
  v_json jsonb;
  v_num numeric;
  v_int integer;
  v_date date;
  contact_in jsonb;
  new_contact jsonb;
  k text;
  path text;
  submitting boolean := FALSE;

  FUNCTION_PLACEHOLDER boolean;
BEGIN
  IF _patch IS NULL OR jsonb_typeof(_patch) <> 'object' THEN
    RAISE EXCEPTION 'invalid patch';
  END IF;

  SELECT * INTO s FROM public.enrollment_sessions
   WHERE public_token = _public_token AND length(_public_token) >= 24;

  IF s.id IS NULL THEN
    RAISE EXCEPTION 'enrollment session not found';
  END IF;

  IF s.status NOT IN ('intake_in_progress', 'needs_consumer_correction') THEN
    RAISE EXCEPTION 'enrollment session is locked for agent review';
  END IF;

  was_correction := s.status = 'needs_consumer_correction';
  corrections := CASE
    WHEN jsonb_typeof(s.field_corrections) = 'array'
      THEN ARRAY(SELECT jsonb_array_elements_text(s.field_corrections))
    ELSE '{}'::text[]
  END;

  -- text fields
  IF _patch ? 'zip_code' THEN
    v_text := NULLIF(_patch->>'zip_code', '');
    IF v_text IS DISTINCT FROM s.zip_code THEN
      IF was_correction AND NOT ('zip_code' = ANY(corrections)) THEN
        RAISE EXCEPTION 'field not open for correction: zip_code';
      END IF;
      s.zip_code := v_text;
    END IF;
  END IF;

  IF _patch ? 'county_fips' THEN
    v_text := NULLIF(_patch->>'county_fips', '');
    IF v_text IS DISTINCT FROM s.county_fips THEN
      IF was_correction AND NOT ('county_fips' = ANY(corrections)) THEN
        RAISE EXCEPTION 'field not open for correction: county_fips';
      END IF;
      s.county_fips := v_text;
    END IF;
  END IF;

  IF _patch ? 'state' THEN
    v_text := NULLIF(_patch->>'state', '');
    IF v_text IS DISTINCT FROM s.state THEN
      IF was_correction AND NOT ('state' = ANY(corrections)) THEN
        RAISE EXCEPTION 'field not open for correction: state';
      END IF;
      s.state := v_text;
    END IF;
  END IF;

  IF _patch ? 'income_period' THEN
    v_text := NULLIF(_patch->>'income_period', '');
    IF v_text IS NOT NULL AND v_text NOT IN ('year','month') THEN
      RAISE EXCEPTION 'invalid income period';
    END IF;
    IF v_text IS DISTINCT FROM s.income_period THEN
      IF was_correction AND NOT ('annual_income' = ANY(corrections)) THEN
        RAISE EXCEPTION 'field not open for correction: income_period';
      END IF;
      s.income_period := v_text;
    END IF;
  END IF;

  IF _patch ? 'household_size' THEN
    v_int := NULLIF(_patch->>'household_size','')::integer;
    IF v_int IS DISTINCT FROM s.household_size THEN
      IF was_correction AND NOT ('household_size' = ANY(corrections)) THEN
        RAISE EXCEPTION 'field not open for correction: household_size';
      END IF;
      s.household_size := v_int;
    END IF;
  END IF;

  IF _patch ? 'annual_income' THEN
    v_num := NULLIF(_patch->>'annual_income','')::numeric;
    IF v_num IS DISTINCT FROM s.annual_income THEN
      IF was_correction AND NOT ('annual_income' = ANY(corrections)) THEN
        RAISE EXCEPTION 'field not open for correction: annual_income';
      END IF;
      s.annual_income := v_num;
    END IF;
  END IF;

  IF _patch ? 'effective_date' THEN
    v_date := NULLIF(_patch->>'effective_date','')::date;
    IF v_date IS DISTINCT FROM s.effective_date THEN
      IF was_correction AND NOT ('effective_date' = ANY(corrections)) THEN
        RAISE EXCEPTION 'field not open for correction: effective_date';
      END IF;
      s.effective_date := v_date;
    END IF;
  END IF;

  -- json collections
  IF _patch ? 'members' THEN
    v_json := _patch->'members';
    IF jsonb_typeof(v_json) <> 'array' THEN RAISE EXCEPTION 'members must be an array'; END IF;
    IF v_json IS DISTINCT FROM s.members THEN
      IF was_correction AND NOT ('members' = ANY(corrections)) THEN
        RAISE EXCEPTION 'field not open for correction: members';
      END IF;
      s.members := v_json;
    END IF;
  END IF;

  IF _patch ? 'saved_doctors' THEN
    v_json := _patch->'saved_doctors';
    IF jsonb_typeof(v_json) <> 'array' THEN RAISE EXCEPTION 'saved_doctors must be an array'; END IF;
    IF v_json IS DISTINCT FROM s.saved_doctors THEN
      IF was_correction AND NOT ('saved_doctors' = ANY(corrections)) THEN
        RAISE EXCEPTION 'field not open for correction: saved_doctors';
      END IF;
      s.saved_doctors := v_json;
    END IF;
  END IF;

  IF _patch ? 'saved_prescriptions' THEN
    v_json := _patch->'saved_prescriptions';
    IF jsonb_typeof(v_json) <> 'array' THEN RAISE EXCEPTION 'saved_prescriptions must be an array'; END IF;
    IF v_json IS DISTINCT FROM s.saved_prescriptions THEN
      IF was_correction AND NOT ('saved_prescriptions' = ANY(corrections)) THEN
        RAISE EXCEPTION 'field not open for correction: saved_prescriptions';
      END IF;
      s.saved_prescriptions := v_json;
    END IF;
  END IF;

  IF _patch ? 'compared_plans' THEN
    v_json := _patch->'compared_plans';
    IF jsonb_typeof(v_json) <> 'array' THEN RAISE EXCEPTION 'compared_plans must be an array'; END IF;
    IF v_json IS DISTINCT FROM s.compared_plans THEN
      IF was_correction AND NOT ('selected_plan' = ANY(corrections)) THEN
        RAISE EXCEPTION 'field not open for correction: compared_plans';
      END IF;
      s.compared_plans := v_json;
    END IF;
  END IF;

  IF _patch ? 'selected_plan' THEN
    v_json := _patch->'selected_plan';
    IF v_json = 'null'::jsonb THEN v_json := NULL; END IF;
    IF v_json IS NOT NULL AND jsonb_typeof(v_json) <> 'object' THEN
      RAISE EXCEPTION 'selected_plan must be an object';
    END IF;
    IF v_json IS DISTINCT FROM s.selected_plan THEN
      IF was_correction AND NOT ('selected_plan' = ANY(corrections)) THEN
        RAISE EXCEPTION 'field not open for correction: selected_plan';
      END IF;
      s.selected_plan := v_json;
    END IF;
  END IF;

  -- contact: merge only allowed properties
  IF _patch ? 'contact' THEN
    contact_in := _patch->'contact';
    IF jsonb_typeof(contact_in) <> 'object' THEN RAISE EXCEPTION 'contact must be an object'; END IF;
    new_contact := COALESCE(s.contact, '{}'::jsonb);
    IF jsonb_typeof(new_contact) <> 'object' THEN new_contact := '{}'::jsonb; END IF;

    FOR k IN SELECT * FROM jsonb_object_keys(contact_in) LOOP
      IF k NOT IN ('firstName','lastName','email','phone','answersConfirmedAt','reviewConsentAt') THEN
        CONTINUE;
      END IF;
      IF (contact_in->k) IS DISTINCT FROM (new_contact->k) THEN
        path := CASE
          WHEN k IN ('answersConfirmedAt','reviewConsentAt') THEN 'acknowledgements'
          ELSE 'contact.' || k
        END;
        IF was_correction AND NOT (path = ANY(corrections)) THEN
          RAISE EXCEPTION 'field not open for correction: %', path;
        END IF;
        new_contact := jsonb_set(new_contact, ARRAY[k], contact_in->k, true);
      END IF;
    END LOOP;
    s.contact := new_contact;
  END IF;

  -- status
  IF _patch ? 'status' THEN
    IF _patch->>'status' = 'ready_for_agent_review' THEN
      submitting := TRUE;
    ELSIF _patch->>'status' IS DISTINCT FROM s.status::text THEN
      RAISE EXCEPTION 'status change not permitted';
    END IF;
  END IF;

  IF submitting THEN
    errs := public.validate_enrollment_session_row(s);
    IF COALESCE(array_length(errs, 1), 0) > 0 THEN
      RAISE EXCEPTION 'enrollment_incomplete: %', array_to_string(errs, ' | ');
    END IF;
    s.status := 'ready_for_agent_review';
    s.correction_note := NULL;
    s.field_corrections := '[]'::jsonb;
  END IF;

  RETURN QUERY
  UPDATE public.enrollment_sessions t SET
    zip_code            = s.zip_code,
    county_fips         = s.county_fips,
    state               = s.state,
    household_size      = s.household_size,
    annual_income       = s.annual_income,
    income_period       = s.income_period,
    effective_date      = s.effective_date,
    members             = s.members,
    saved_doctors       = s.saved_doctors,
    saved_prescriptions = s.saved_prescriptions,
    selected_plan       = s.selected_plan,
    compared_plans      = s.compared_plans,
    contact             = s.contact,
    status              = s.status,
    correction_note     = s.correction_note,
    field_corrections   = s.field_corrections
  WHERE t.id = s.id
    AND t.status IN ('intake_in_progress', 'needs_consumer_correction')
  RETURNING t.*;

  IF submitting THEN
    PERFORM public.record_enrollment_event(
      s.id,
      CASE WHEN was_correction THEN 'consumer_correction_resubmitted' ELSE 'consumer_submitted_for_review' END,
      '{}'::jsonb
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.save_enrollment_session(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_enrollment_session(text, jsonb) TO anon, authenticated, service_role;

-- ============ agent transitions ============

CREATE OR REPLACE FUNCTION public.agent_claim_review(_session_id uuid)
RETURNS SETOF public.enrollment_sessions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  actor text := public.current_actor();
  updated public.enrollment_sessions;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'not authorized'; END IF;

  UPDATE public.enrollment_sessions s
     SET status = 'in_agent_review', assigned_agent = actor, reviewed_at = now()
   WHERE s.id = _session_id
     AND (s.assigned_agent IS NULL OR s.assigned_agent = actor)
     AND s.status IN ('ready_for_agent_review', 'in_agent_review', 'needs_consumer_correction', 'reconciliation_required')
  RETURNING s.* INTO updated;

  IF updated.id IS NULL THEN
    RAISE EXCEPTION 'this case cannot be claimed in its current state';
  END IF;

  PERFORM public.record_enrollment_event(_session_id, 'agent_claimed_review', jsonb_build_object('agent', actor));
  RETURN NEXT updated;
END;
$$;

CREATE OR REPLACE FUNCTION public.agent_release_review(_session_id uuid)
RETURNS SETOF public.enrollment_sessions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  actor text := public.current_actor();
  updated public.enrollment_sessions;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'not authorized'; END IF;

  UPDATE public.enrollment_sessions s
     SET assigned_agent = NULL, status = 'ready_for_agent_review'
   WHERE s.id = _session_id
     AND s.assigned_agent = actor
     AND s.status = 'in_agent_review'
  RETURNING s.* INTO updated;

  IF updated.id IS NULL THEN
    RAISE EXCEPTION 'only the assigned agent can release this case while it is in review';
  END IF;

  PERFORM public.record_enrollment_event(_session_id, 'agent_released_review', jsonb_build_object('agent', actor));
  RETURN NEXT updated;
END;
$$;

CREATE OR REPLACE FUNCTION public.agent_request_correction(_session_id uuid, _note text, _fields jsonb DEFAULT '[]'::jsonb)
RETURNS SETOF public.enrollment_sessions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  actor text := public.current_actor();
  updated public.enrollment_sessions;
  paths text[];
  valid text[] := public.enrollment_correction_paths();
  p text;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'not authorized'; END IF;
  IF COALESCE(btrim(_note), '') = '' THEN RAISE EXCEPTION 'a correction note is required'; END IF;
  IF jsonb_typeof(COALESCE(_fields, '[]'::jsonb)) <> 'array' THEN RAISE EXCEPTION 'fields must be an array'; END IF;

  paths := ARRAY(SELECT DISTINCT jsonb_array_elements_text(COALESCE(_fields, '[]'::jsonb)));
  IF COALESCE(array_length(paths, 1), 0) = 0 THEN
    RAISE EXCEPTION 'at least one correction field is required';
  END IF;
  FOREACH p IN ARRAY paths LOOP
    IF NOT (p = ANY(valid)) THEN RAISE EXCEPTION 'invalid correction field: %', p; END IF;
  END LOOP;

  UPDATE public.enrollment_sessions s
     SET status = 'needs_consumer_correction',
         correction_note = _note,
         field_corrections = to_jsonb(paths)
   WHERE s.id = _session_id
     AND s.assigned_agent = actor
     AND s.status = 'in_agent_review'
  RETURNING s.* INTO updated;

  IF updated.id IS NULL THEN
    RAISE EXCEPTION 'only the assigned agent can request corrections while the case is in review';
  END IF;

  PERFORM public.record_enrollment_event(_session_id, 'consumer_correction_requested',
    jsonb_build_object('agent', actor, 'note', _note, 'fields', to_jsonb(paths)));
  RETURN NEXT updated;
END;
$$;

CREATE OR REPLACE FUNCTION public.agent_approve_review(_session_id uuid)
RETURNS SETOF public.enrollment_sessions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  actor text := public.current_actor();
  current_row public.enrollment_sessions;
  updated public.enrollment_sessions;
  errs text[];
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'not authorized'; END IF;

  SELECT * INTO current_row FROM public.enrollment_sessions WHERE id = _session_id FOR UPDATE;
  IF current_row.id IS NULL THEN RAISE EXCEPTION 'enrollment session not found'; END IF;
  IF current_row.assigned_agent IS DISTINCT FROM actor OR current_row.status <> 'in_agent_review' THEN
    RAISE EXCEPTION 'only the assigned agent can approve a case that is in review';
  END IF;

  errs := public.validate_enrollment_session_row(current_row);
  IF COALESCE(array_length(errs, 1), 0) > 0 THEN
    RAISE EXCEPTION 'enrollment_incomplete: %', array_to_string(errs, ' | ');
  END IF;

  UPDATE public.enrollment_sessions s
     SET status = 'agent_approved', reviewed_at = now(),
         correction_note = NULL, field_corrections = '[]'::jsonb
   WHERE s.id = _session_id AND s.assigned_agent = actor AND s.status = 'in_agent_review'
  RETURNING s.* INTO updated;

  IF updated.id IS NULL THEN RAISE EXCEPTION 'this case is no longer approvable'; END IF;

  PERFORM public.record_enrollment_event(_session_id, 'agent_approved', jsonb_build_object('agent', actor));
  RETURN NEXT updated;
END;
$$;

CREATE OR REPLACE FUNCTION public.agent_add_note(_session_id uuid, _note text)
RETURNS SETOF public.enrollment_sessions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  actor text := public.current_actor();
  updated public.enrollment_sessions;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'not authorized'; END IF;
  IF COALESCE(btrim(_note), '') = '' THEN RAISE EXCEPTION 'a note is required'; END IF;

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
$$;

REVOKE EXECUTE ON FUNCTION public.agent_claim_review(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.agent_release_review(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.agent_approve_review(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.agent_request_correction(uuid, text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.agent_add_note(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.agent_claim_review(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.agent_release_review(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.agent_approve_review(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.agent_request_correction(uuid, text, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.agent_add_note(uuid, text) TO authenticated, service_role;