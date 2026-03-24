-- Drop the permissive UPDATE policy
DROP POLICY IF EXISTS "Users can update their own suggestions" ON public.status_suggestions;

-- Recreate with WITH CHECK that prevents vote counter manipulation
CREATE POLICY "Users can update their own suggestions"
  ON public.status_suggestions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND upvotes = (SELECT s.upvotes FROM public.status_suggestions s WHERE s.id = status_suggestions.id)
    AND downvotes = (SELECT s.downvotes FROM public.status_suggestions s WHERE s.id = status_suggestions.id)
  );

-- Attach the existing trigger functions that were created but never bound
CREATE TRIGGER trg_prevent_vote_count_manipulation
  BEFORE UPDATE ON public.status_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_vote_count_manipulation();

CREATE TRIGGER trg_recompute_vote_counts
  AFTER INSERT OR UPDATE OR DELETE ON public.suggestion_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.recompute_vote_counts();