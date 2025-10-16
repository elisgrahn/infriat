-- Create table for government periods
CREATE TABLE public.government_periods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  start_year INTEGER NOT NULL,
  end_year INTEGER,
  governing_parties TEXT[] NOT NULL,
  support_parties TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.government_periods ENABLE ROW LEVEL SECURITY;

-- Anyone can view government periods
CREATE POLICY "Anyone can view government periods"
ON public.government_periods
FOR SELECT
USING (true);

-- Only admins can insert government periods
CREATE POLICY "Admins can insert government periods"
ON public.government_periods
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update government periods
CREATE POLICY "Admins can update government periods"
ON public.government_periods
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete government periods
CREATE POLICY "Admins can delete government periods"
ON public.government_periods
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert government periods data
INSERT INTO public.government_periods (name, start_year, end_year, governing_parties) VALUES
  ('Carlsson III', 1994, 1996, ARRAY['Socialdemokraterna']),
  ('Persson', 1996, 2006, ARRAY['Socialdemokraterna']),
  ('Reinfeldt', 2006, 2014, ARRAY['Moderaterna', 'Liberalerna', 'Centerpartiet', 'Kristdemokraterna']),
  ('Löfven I', 2014, 2018, ARRAY['Socialdemokraterna', 'Miljöpartiet']),
  ('Löfven II', 2019, 2021, ARRAY['Socialdemokraterna', 'Miljöpartiet']),
  ('Löfven III', 2021, 2021, ARRAY['Socialdemokraterna', 'Miljöpartiet']),
  ('Andersson', 2021, 2022, ARRAY['Socialdemokraterna']),
  ('Kristersson', 2022, NULL, ARRAY['Moderaterna', 'Kristdemokraterna', 'Liberalerna']);