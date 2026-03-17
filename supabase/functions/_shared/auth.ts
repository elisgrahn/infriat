import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface AuthClients {
  /** Client with user's auth header — respects RLS */
  userClient: SupabaseClient;
  /** Client with service role key — bypasses RLS for writes */
  adminClient: SupabaseClient;
  /** The authenticated user */
  user: { id: string; email?: string };
}

/**
 * Verify the request's authorization header, check for admin role,
 * and return both a user-scoped and admin-scoped Supabase client.
 *
 * Throws a structured { message, status } error on failure.
 */
export async function requireAdmin(req: Request): Promise<AuthClients> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    throw { message: 'Unauthorized', status: 401 };
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // User client — passes the caller's JWT so RLS applies to reads
  const userClient = createClient(supabaseUrl, supabaseServiceKey, {
    global: { headers: { Authorization: authHeader } },
  });

  // Admin client — uses service role, bypasses RLS for writes
  const adminClient = createClient(supabaseUrl, supabaseServiceKey);

  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    throw { message: 'Unauthorized', status: 401 };
  }

  const { data: roleData, error: roleError } = await userClient
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle();

  if (roleError || !roleData) {
    throw { message: 'Forbidden - Admin access required', status: 403 };
  }

  return { userClient, adminClient, user };
}
