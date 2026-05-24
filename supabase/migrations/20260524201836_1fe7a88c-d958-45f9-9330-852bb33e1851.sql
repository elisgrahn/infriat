
-- 1. Unique constraint to prevent vote stuffing
ALTER TABLE public.suggestion_votes
  ADD CONSTRAINT suggestion_votes_user_suggestion_unique UNIQUE (user_id, suggestion_id);

-- 2. Remove public listing on manifests bucket; direct URL access still works (public bucket)
DROP POLICY IF EXISTS "Anyone can view manifests" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view manifests" ON storage.objects;

-- 3. Revoke EXECUTE on internal SECURITY DEFINER functions from anon/authenticated.
--    Triggers still execute these as the table owner; edge functions use service_role.
REVOKE EXECUTE ON FUNCTION public.increment_view_count(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.recompute_vote_counts() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.prevent_vote_suggestion_change() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.prevent_vote_count_manipulation() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;
