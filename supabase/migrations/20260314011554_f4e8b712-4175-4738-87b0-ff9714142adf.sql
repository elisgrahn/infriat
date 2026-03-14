
-- Create source type enum
CREATE TYPE public.source_type AS ENUM ('news', 'official', 'research', 'other');

-- Create promise_sources table
CREATE TABLE public.promise_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promise_id UUID NOT NULL REFERENCES public.promises(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT,
  published_date DATE,
  description TEXT,
  source_type public.source_type NOT NULL DEFAULT 'other',
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.promise_sources ENABLE ROW LEVEL SECURITY;

-- Public SELECT
CREATE POLICY "Anyone can view promise sources"
ON public.promise_sources FOR SELECT TO public
USING (true);

-- Admin INSERT
CREATE POLICY "Admins can insert promise sources"
ON public.promise_sources FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admin UPDATE
CREATE POLICY "Admins can update promise sources"
ON public.promise_sources FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin DELETE
CREATE POLICY "Admins can delete promise sources"
ON public.promise_sources FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Service role can always insert (for edge functions) - handled by service role bypassing RLS

-- Backfill existing status_sources into promise_sources
INSERT INTO public.promise_sources (promise_id, url, source_type)
SELECT p.id, unnest(p.status_sources), 'other'::public.source_type
FROM public.promises p
WHERE p.status_sources IS NOT NULL AND array_length(p.status_sources, 1) > 0;

-- Index for fast lookups
CREATE INDEX idx_promise_sources_promise_id ON public.promise_sources(promise_id);
