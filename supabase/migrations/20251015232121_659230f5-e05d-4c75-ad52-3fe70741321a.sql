-- Make manifests storage bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'manifests';

-- Drop the existing public policy
DROP POLICY IF EXISTS "Anyone can view manifests" ON storage.objects;

-- Create policy for authenticated users to view manifests
CREATE POLICY "Authenticated users can view manifests"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'manifests' AND
  auth.role() = 'authenticated'
);

-- Fix timestamp trigger to use SECURITY INVOKER instead of SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public;