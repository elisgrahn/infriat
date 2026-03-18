-- Add category and is_status_quo columns to promises table

-- Create the policy_category enum
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

-- Add category column
ALTER TABLE public.promises
  ADD COLUMN category public.policy_category;

-- Add is_status_quo column (default false = förändring)
ALTER TABLE public.promises
  ADD COLUMN is_status_quo BOOLEAN DEFAULT false;
