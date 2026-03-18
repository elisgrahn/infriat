DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'policy_category'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.policy_category AS ENUM (
      'valfard',
      'halsa',
      'utbildning',
      'arbetsmarknad',
      'migration',
      'rattssakerhet',
      'forsvar',
      'klimat-miljo',
      'bostad',
      'demokrati',
      'ovrigt'
    );
  END IF;
END $$;

ALTER TABLE public.promises
  ADD COLUMN IF NOT EXISTS category public.policy_category,
  ADD COLUMN IF NOT EXISTS is_status_quo boolean NOT NULL DEFAULT false;