-- Add INSERT and DELETE policies for promises table to allow admin operations

-- Allow admins to insert promises
CREATE POLICY "Admins can insert promises"
ON public.promises
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete promises
CREATE POLICY "Admins can delete promises"
ON public.promises
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));