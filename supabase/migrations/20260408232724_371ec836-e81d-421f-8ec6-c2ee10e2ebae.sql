-- Re-grant execute to authenticated - RLS policies need this to call has_role
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;