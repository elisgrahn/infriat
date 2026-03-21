
-- Add unique constraint on suggestion_votes to prevent duplicate votes
ALTER TABLE public.suggestion_votes ADD CONSTRAINT suggestion_votes_suggestion_user_unique UNIQUE (suggestion_id, user_id);

-- Create trigger function to recompute vote counts from suggestion_votes
CREATE OR REPLACE FUNCTION public.recompute_vote_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_suggestion_id uuid;
BEGIN
  -- Determine which suggestion_id was affected
  IF TG_OP = 'DELETE' THEN
    target_suggestion_id := OLD.suggestion_id;
  ELSE
    target_suggestion_id := NEW.suggestion_id;
  END IF;

  -- Also handle old suggestion_id on UPDATE (if suggestion_id changed)
  IF TG_OP = 'UPDATE' AND OLD.suggestion_id IS DISTINCT FROM NEW.suggestion_id THEN
    UPDATE public.status_suggestions SET
      upvotes = (SELECT count(*) FROM public.suggestion_votes WHERE suggestion_id = OLD.suggestion_id AND vote_type = 'up'),
      downvotes = (SELECT count(*) FROM public.suggestion_votes WHERE suggestion_id = OLD.suggestion_id AND vote_type = 'down')
    WHERE id = OLD.suggestion_id;
  END IF;

  UPDATE public.status_suggestions SET
    upvotes = (SELECT count(*) FROM public.suggestion_votes WHERE suggestion_id = target_suggestion_id AND vote_type = 'up'),
    downvotes = (SELECT count(*) FROM public.suggestion_votes WHERE suggestion_id = target_suggestion_id AND vote_type = 'down')
  WHERE id = target_suggestion_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on suggestion_votes
CREATE TRIGGER recompute_vote_counts_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.suggestion_votes
FOR EACH ROW EXECUTE FUNCTION public.recompute_vote_counts();

-- Restrict suggestion_votes UPDATE to only allow vote_type changes (not suggestion_id)
DROP POLICY IF EXISTS "Users can update their own votes" ON public.suggestion_votes;
CREATE POLICY "Users can update their own votes" ON public.suggestion_votes
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id AND suggestion_id = suggestion_id);
