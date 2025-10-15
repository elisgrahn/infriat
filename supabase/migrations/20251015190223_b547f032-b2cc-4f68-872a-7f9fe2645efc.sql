-- Förbättra RLS-policyn för promises UPDATE så att endast autentiserade admins kan uppdatera
-- Tar bort den gamla policyn som tillät public (icke-autentiserade) att försöka uppdatera
DROP POLICY IF EXISTS "Only admins can update promise status" ON public.promises;

-- Skapar ny policy som endast tillåter autentiserade admins att uppdatera
CREATE POLICY "Only admins can update promises" 
ON public.promises 
FOR UPDATE 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));