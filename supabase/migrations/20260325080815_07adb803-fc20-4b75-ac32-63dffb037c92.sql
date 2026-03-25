CREATE OR REPLACE FUNCTION public.increment_view_count(_promise_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE promises SET view_count = view_count + 1 WHERE id = _promise_id;
$$;