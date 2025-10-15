-- Add page_number and manifest_pdf_url columns to promises table
ALTER TABLE public.promises 
ADD COLUMN page_number INTEGER,
ADD COLUMN manifest_pdf_url TEXT;