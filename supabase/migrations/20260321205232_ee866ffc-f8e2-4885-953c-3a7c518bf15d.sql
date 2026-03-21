
-- Fix 1: Restrict user_roles policies to authenticated role instead of public
DROP POLICY IF EXISTS "Only admins can delete roles" ON public.user_roles;
CREATE POLICY "Only admins can delete roles" ON public.user_roles
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Only admins can insert roles" ON public.user_roles;
CREATE POLICY "Only admins can insert roles" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Only admins can update roles" ON public.user_roles;
CREATE POLICY "Only admins can update roles" ON public.user_roles
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix 2: Restrict suggestion_votes SELECT to own votes only
DROP POLICY IF EXISTS "Authenticated users can view votes" ON public.suggestion_votes;
CREATE POLICY "Users can view their own votes" ON public.suggestion_votes
FOR SELECT TO authenticated
USING (auth.uid() = user_id);
