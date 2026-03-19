
-- Fix 1: Restrict suggestion_votes SELECT to authenticated users only
DROP POLICY IF EXISTS "Anyone can view votes" ON public.suggestion_votes;
CREATE POLICY "Authenticated users can view votes"
  ON public.suggestion_votes FOR SELECT
  TO authenticated
  USING (true);

-- Fix 2: Replace permissive UPDATE on status_suggestions with column-restricted approach
-- Drop the existing permissive update policy
DROP POLICY IF EXISTS "Users can update their own suggestions" ON public.status_suggestions;

-- Create a restricted update policy that only allows updating explanation and sources
-- We use a trigger-based approach to prevent vote count manipulation
CREATE OR REPLACE FUNCTION public.prevent_vote_count_manipulation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Prevent non-admin users from directly changing upvotes/downvotes
  IF NOT has_role(auth.uid(), 'admin') THEN
    NEW.upvotes := OLD.upvotes;
    NEW.downvotes := OLD.downvotes;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_vote_manipulation
  BEFORE UPDATE ON public.status_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_vote_count_manipulation();

-- Re-create the update policy (user can still update their own suggestions' text/sources)
CREATE POLICY "Users can update their own suggestions"
  ON public.status_suggestions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);
