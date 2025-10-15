-- Create storage bucket for manifests
INSERT INTO storage.buckets (id, name, public)
VALUES ('manifests', 'manifests', true);

-- Create policies for manifest uploads
CREATE POLICY "Admins can upload manifests"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'manifests' AND
  (SELECT has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Anyone can view manifests"
ON storage.objects
FOR SELECT
USING (bucket_id = 'manifests');

CREATE POLICY "Admins can delete manifests"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'manifests' AND
  (SELECT has_role(auth.uid(), 'admin'::app_role))
);