-- Update RLS policy on promises table to allow anyone to view promises
DROP POLICY IF EXISTS "Anyone can view promises" ON public.promises;

CREATE POLICY "Anyone can view promises" 
ON public.promises 
FOR SELECT 
USING (true);