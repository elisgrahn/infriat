-- Make manifests bucket publicly readable but only admins can write
-- First, ensure the bucket is public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'manifests';

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view manifests" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload manifests" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update manifests" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete manifests" ON storage.objects;

-- Allow public read access to manifests bucket
CREATE POLICY "Anyone can view manifests"
ON storage.objects
FOR SELECT
USING (bucket_id = 'manifests');

-- Only admins can upload files
CREATE POLICY "Admins can upload manifests"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'manifests' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Only admins can update files
CREATE POLICY "Admins can update manifests"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'manifests' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Only admins can delete files
CREATE POLICY "Admins can delete manifests"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'manifests' 
  AND has_role(auth.uid(), 'admin'::app_role)
);