CREATE OR REPLACE FUNCTION public.validate_enrollment_session_row(s public.enrollment_sessions)
RETURNS text[] LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE
  errs text[] := '{}'::text[];
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

  IF COALESCE(s.zip_code,'') !~ '^[0-9]{5}$' THEN errs := errs || 'A valid 5-digit ZIP code is required.'::text; END IF;
  IF COALESCE(s.county_fips,'') !~ '^[0-9]{4,5}$' THEN errs := errs || 'A valid county FIPS code is required.'::text; END IF;
  IF COALESCE(s.state,'') !~ '^[A-Za-z]{2}$' THEN errs := errs || 'A valid two-letter state is required.'::text; END IF;
  IF COALESCE(s.household_size, 0) < 1 THEN errs := errs || 'Household size must be at least 1.'::text; END IF;
  IF s.annual_income IS NULL OR s.annual_income < 0 THEN errs := errs || 'A non-negative household income is required.'::text; END IF;
  IF COALESCE(s.income_period,'') NOT IN ('year','month') THEN errs := errs || 'Income period must be year or month.'::text; END IF;
  IF s.effective_date IS NULL THEN errs := errs || 'A requested coverage effective date is required.'::text; END IF;

  IF jsonb_typeof(s.members) <> 'array' OR jsonb_array_length(s.members) < 1 THEN
    errs := errs || 'At least one applicant is required.'::text;
  ELSE
    FOR m IN SELECT * FROM jsonb_array_elements(s.members) LOOP
      cnt := cnt + 1;
      IF COALESCE(m->>'relationship','') = 'primary' THEN primaries := primaries + 1; END IF;
      IF COALESCE(m->>'relationship','') NOT IN ('primary','spouse','dependent','child') THEN
        errs := errs || format('Applicant %s has an invalid relationship.', cnt)::text;
      END IF;
      BEGIN
        dob := (m->>'dob')::date;
      EXCEPTION WHEN others THEN
        dob := NULL;
      END;
      IF dob IS NULL THEN
        errs := errs || format('Applicant %s has an invalid date of birth.', cnt)::text;
      ELSIF dob > current_date THEN
        errs := errs || format('Applicant %s has a future date of birth.', cnt)::text;
      END IF;
    END LOOP;
    IF primaries <> 1 THEN errs := errs || 'Exactly one primary applicant is required.'::text; END IF;
  END IF;

  IF COALESCE(c->>'firstName','') = '' THEN errs := errs || 'Contact first name is required.'::text; END IF;
  IF COALESCE(c->>'lastName','') = '' THEN errs := errs || 'Contact last name is required.'::text; END IF;
  IF email IS NULL AND phone IS NULL THEN errs := errs || 'An email address or phone number is required.'::text; END IF;
  IF email IS NOT NULL AND email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]{2,}$' THEN
    errs := errs || 'The email address is invalid.'::text;
  END IF;
  IF phone IS NOT NULL AND length(regexp_replace(phone, '[^0-9]', '', 'g')) < 10 THEN
    errs := errs || 'The phone number must be a full 10-digit US number.'::text;
  END IF;
  IF COALESCE(c->>'answersConfirmedAt','') = '' THEN errs := errs || 'Answers must be confirmed before review.'::text; END IF;
  IF COALESCE(c->>'reviewConsentAt','') = '' THEN errs := errs || 'Review consent is required before submission.'::text; END IF;

  RETURN errs;
END;
$$;