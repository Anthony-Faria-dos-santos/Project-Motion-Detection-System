/**
 * Email whitelist for auto-registration.
 * If empty, all Supabase-authenticated users are allowed.
 * If populated, only listed emails/domains can create accounts.
 *
 * Configure via ALLOWED_EMAILS env var (comma-separated):
 * ALLOWED_EMAILS=admin@motionops.local,*@company.com
 */

export function isEmailAllowed(email: string): boolean {
  const allowList = process.env.ALLOWED_EMAILS?.split(',').map(s => s.trim()).filter(Boolean);

  // If no whitelist configured, allow all
  if (!allowList || allowList.length === 0) return true;

  return allowList.some(pattern => {
    if (pattern.startsWith('*@')) {
      // Domain wildcard: *@company.com
      const domain = pattern.slice(2);
      return email.endsWith(`@${domain}`);
    }
    return email.toLowerCase() === pattern.toLowerCase();
  });
}
