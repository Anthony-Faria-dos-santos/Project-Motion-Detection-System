'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Shield, AlertCircle, Loader2, Fingerprint, CheckCircle2, Mail } from 'lucide-react';
import { startRegistration } from '@simplewebauthn/browser';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/lib/store';
import type { UserSessionView } from '@motionops/types';

interface OptionsResponse {
  options: Record<string, unknown>;
  registrationChallengeToken: string;
}

interface VerifyResponse {
  user: UserSessionView;
}

// ── Step 1: request recovery email ───────────────
function RequestRecoveryForm() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post('/api/auth/passkeys/recovery/request', { email });
      setSubmitted(true);
    } catch (err: unknown) {
      const apiErr = err as { error?: { message?: string } };
      setError(apiErr?.error?.message || 'Failed to request recovery email');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="space-y-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-6 text-center">
        <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400" />
        <h2 className="text-base font-semibold text-[hsl(var(--foreground))]">Check your inbox</h2>
        <p className="text-xs text-[hsl(var(--muted-foreground))]">
          If an account matches, you&apos;ll receive a recovery link within a few minutes. The link expires in 1 hour.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Email</label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
          placeholder="you@example.com"
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
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
        Send recovery link
      </button>
    </form>
  );
}

// ── Step 2: user has landed with ?token=xxx ──────
function EnrolNewPasskey({ token }: { token: string }) {
  const router = useRouter();
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [probed, setProbed] = useState(false);

  // Probe once on mount to see whether MFA is required.
  useEffect(() => {
    (async () => {
      try {
        await api.post('/api/auth/passkeys/recovery/options', { token });
        // If this succeeds, MFA was NOT required. Rare case — the next click will just re-trigger.
        setProbed(true);
      } catch (err: unknown) {
        const apiErr = err as { error?: { code?: string; message?: string } };
        if (apiErr?.error?.code === 'MFA_REQUIRED') {
          setMfaRequired(true);
        } else {
          setError(apiErr?.error?.message || 'Recovery link invalid or expired');
        }
        setProbed(true);
      }
    })();
  }, [token]);

  const handleEnrol = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // Re-request options (with MFA if needed) — now single-consume
      const { options, registrationChallengeToken } = await api.post<OptionsResponse>(
        '/api/auth/passkeys/recovery/options',
        { token, ...(mfaRequired && mfaCode ? { mfaCode } : {}) },
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const attestation = await startRegistration({ optionsJSON: options as any });

      const result = await api.post<VerifyResponse>('/api/auth/passkeys/recovery/verify', {
        registrationChallengeToken,
        attestationResponse: attestation,
        deviceName: deviceName || undefined,
      });

      useAuthStore.setState({
        user: result.user,
        isAuthenticated: true,
        isLoading: false,
      });
      router.push('/dashboard');
    } catch (err: unknown) {
      const e = err as { error?: { message?: string; code?: string }; name?: string; message?: string };
      if (e?.name === 'NotAllowedError' || e?.message?.includes('aborted')) {
        setError('Enrolment cancelled on the device');
      } else {
        setError(e?.error?.message || e?.message || 'Recovery failed');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!probed) {
    return (
      <div className="flex justify-center p-6">
        <Loader2 className="h-5 w-5 animate-spin text-[hsl(var(--muted-foreground))]" />
      </div>
    );
  }

  return (
    <form onSubmit={handleEnrol} className="space-y-4 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
      <div className="rounded-md border border-cyan-500/30 bg-cyan-500/5 p-3 text-xs text-cyan-200">
        Enrol a new passkey on <strong>this device</strong>. Your previous passkeys remain valid until you remove them from Settings.
      </div>
      {mfaRequired && (
        <div className="space-y-1.5">
          <label htmlFor="mfaCode" className="text-xs font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
            MFA code (from your authenticator app)
          </label>
          <input
            id="mfaCode"
            type="text"
            required
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            value={mfaCode}
            onChange={(e) => setMfaCode(e.target.value)}
            className="w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-center text-lg tracking-widest text-[hsl(var(--foreground))] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
            placeholder="123 456"
            maxLength={10}
          />
        </div>
      )}
      <div className="space-y-1.5">
        <label htmlFor="deviceName" className="text-xs font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Device name (optional)</label>
        <input
          id="deviceName"
          type="text"
          value={deviceName}
          onChange={(e) => setDeviceName(e.target.value)}
          className="w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
          placeholder="MacBook Touch ID"
          maxLength={100}
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
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Fingerprint className="h-4 w-4" />}
        Enrol new passkey
      </button>
    </form>
  );
}

function ForgotPasskeyContent() {
  const params = useSearchParams();
  const token = params.get('token');

  return (
    <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--background))] py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-[hsl(var(--primary))]" />
            <span className="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">MotionOps</span>
          </div>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {token ? 'Enrol a new passkey' : 'Lost your passkey device?'}
          </p>
        </div>

        {token ? <EnrolNewPasskey token={token} /> : <RequestRecoveryForm />}

        <p className="text-center text-xs text-[hsl(var(--muted-foreground))]">
          Remember your passkey?{' '}
          <Link href="/login" className="font-medium text-[hsl(var(--foreground))] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ForgotPasskeyPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--muted-foreground))]" /></div>}>
      <ForgotPasskeyContent />
    </Suspense>
  );
}
