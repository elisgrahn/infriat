CREATE POLICY "Admins can delete suggestions"
ON public.status_suggestions
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));