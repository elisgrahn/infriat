-- Add INSERT, UPDATE, and DELETE policies for parties table
-- Only admins should be able to modify party data

CREATE POLICY "Admins can insert parties"
ON public.parties
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update parties"
ON public.parties
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete parties"
ON public.parties
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));