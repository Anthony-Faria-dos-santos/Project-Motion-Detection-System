import { createClient } from '@supabase/supabase-js';

function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Integration tests need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function purgeSupabaseTestUsers(emails: string[]): Promise<void> {
  if (emails.length === 0) return;
  const supabase = adminClient();
  const wanted = new Set(emails.map((e) => e.toLowerCase()));
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error || !data?.users) return;
  const matches = data.users.filter((u) => u.email && wanted.has(u.email.toLowerCase()));
  for (const user of matches) {
    await supabase.auth.admin.deleteUser(user.id);
  }
}
