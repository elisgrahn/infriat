ALTER TABLE analysis_jobs
  ADD COLUMN IF NOT EXISTS manifest_text text,
  ADD COLUMN IF NOT EXISTS manifest_pdf_url text,
  ADD COLUMN IF NOT EXISTS current_chunk integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS accumulated_promises jsonb DEFAULT '[]'::jsonb;