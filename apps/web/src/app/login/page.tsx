'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, AlertCircle, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/lib/store';

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err?.error?.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--background))]">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-[hsl(var(--primary))]" />
            <span className="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">MotionOps</span>
          </div>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Intelligent video analysis platform</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
              placeholder="admin@motionops.local"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
              placeholder="••••••••••"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-[hsl(var(--primary-foreground))] transition-colors hover:bg-[hsl(var(--primary))]/90 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-[10px] text-[hsl(var(--muted-foreground))]">
          Secured by MotionOps v0.0.1
        </p>
      </div>
    </div>
  );
}
