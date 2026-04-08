
-- Fix 1: suggestion_votes - replace tautological WITH CHECK with a proper trigger
DROP POLICY IF EXISTS "Users can update their own votes" ON public.suggestion_votes;

CREATE POLICY "Users can update their own votes"
  ON public.suggestion_votes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger to prevent changing suggestion_id on update
CREATE OR REPLACE FUNCTION public.prevent_vote_suggestion_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.suggestion_id IS DISTINCT FROM OLD.suggestion_id THEN
    RAISE EXCEPTION 'Cannot change the suggestion a vote belongs to';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_immutable_suggestion_id
  BEFORE UPDATE ON public.suggestion_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_vote_suggestion_change();

-- Fix 2: government_periods - scope write policies to authenticated
ALTER POLICY "Admins can insert government periods" ON public.government_periods TO authenticated;
ALTER POLICY "Admins can update government periods" ON public.government_periods TO authenticated;
ALTER POLICY "Admins can delete government periods" ON public.government_periods TO authenticated;
