const REQUIRED_VARS = [
  'DATABASE_URL',
  'JWT_SECRET',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'WORKER_API_KEY',
];

export function validateEnv(): void {
  const missing = REQUIRED_VARS.filter(v => !process.env[v]);
  if (missing.length > 0) {
    console.error(`FATAL: Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }

  // Warn about weak secrets
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.warn('WARNING: JWT_SECRET is too short (minimum 32 characters recommended)');
  }
  if (process.env.JWT_SECRET?.includes('dev') || process.env.JWT_SECRET?.includes('change')) {
    console.warn('WARNING: JWT_SECRET appears to be a development placeholder');
  }
}
