'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Shield, AlertCircle, Loader2, CheckCircle2, UserPlus } from 'lucide-react';
import { api } from '@/lib/api-client';

const TERMS_VERSION = '2026-04-10-v1';
const PRIVACY_VERSION = '2026-04-10-v1';

type InvitationData = {
  email: string;
  role: string;
  message: string | null;
  expiresAt: string;
  inviter: { displayName: string };
};

function AcceptInvitationForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token');

  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [verifying, setVerifying] = useState(true);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setVerifyError('Missing invitation token.');
      setVerifying(false);
      return;
    }
    (async () => {
      try {
        const data = await api.get<InvitationData>(`/api/users/invitations/verify/${token}`);
        setInvitation(data);
      } catch (err: unknown) {
        const apiErr = err as { error?: { message?: string; code?: string } };
        setVerifyError(apiErr?.error?.message || 'This invitation link is invalid or has expired.');
      } finally {
        setVerifying(false);
      }
    })();
  }, [token]);

  const passwordStrength = (() => {
    if (!password) return null;
    if (password.length < 12) return { ok: false, msg: 'Password must be at least 12 characters' };
    return { ok: true, msg: 'Strong enough' };
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!invitation || !token) return;

    if (!termsAccepted || !privacyAccepted) {
      setSubmitError('You must accept both the Terms and the Privacy Policy.');
      return;
    }
    if (password.length < 12) {
      setSubmitError('Password must be at least 12 characters.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/api/auth/signup', {
        email: invitation.email,
        password,
        displayName,
        termsAccepted: true,
        privacyPolicyAccepted: true,
        termsVersion: TERMS_VERSION,
        privacyPolicyVersion: PRIVACY_VERSION,
        inviteToken: token,
      });
      router.push('/verify-email-sent?email=' + encodeURIComponent(invitation.email));
    } catch (err: unknown) {
      const apiErr = err as { error?: { message?: string } };
      setSubmitError(apiErr?.error?.message || 'Failed to accept invitation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (verifying) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--background))]">
        <div className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Verifying invitation…
        </div>
      </div>
    );
  }

  if (verifyError || !invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--background))]">
        <div className="w-full max-w-sm space-y-4 rounded-lg border border-red-500/30 bg-red-500/5 p-6 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-red-400" />
          <h2 className="text-base font-semibold text-[hsl(var(--foreground))]">Invitation unavailable</h2>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">{verifyError}</p>
          <Link href="/login" className="block text-xs font-medium text-[hsl(var(--primary))] hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--background))] py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-[hsl(var(--primary))]" />
            <span className="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">MotionOps</span>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-300">
            <UserPlus className="h-3.5 w-3.5" />
            Invited by <strong className="font-semibold">{invitation.inviter.displayName}</strong>
          </div>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Role: <strong className="text-[hsl(var(--foreground))]">{invitation.role}</strong></p>
          {invitation.message && (
            <div className="w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-3 py-2 text-xs italic text-[hsl(var(--muted-foreground))]">
              “{invitation.message}”
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Email</label>
            <input
              type="email"
              value={invitation.email}
              readOnly
              className="w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-3 py-2 text-sm text-[hsl(var(--muted-foreground))]"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="displayName" className="text-xs font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Display name</label>
            <input
              id="displayName"
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
              placeholder="Jane Doe"
              maxLength={100}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Password (12+ chars)</label>
            <input
              id="password"
              type="password"
              required
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
              placeholder="••••••••••••"
            />
            {passwordStrength && (
              <div className={`flex items-center gap-1 text-[10px] ${passwordStrength.ok ? 'text-emerald-400' : 'text-amber-400'}`}>
                {passwordStrength.ok && <CheckCircle2 className="h-3 w-3" />}
                {passwordStrength.msg}
              </div>
            )}
          </div>

          <div className="space-y-2 pt-2">
            <label className="flex items-start gap-2 text-xs text-[hsl(var(--muted-foreground))]">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-0.5 h-3.5 w-3.5"
                required
              />
              <span>
                I accept the <Link href="/legal/terms" className="underline">Terms of Service</Link>
              </span>
            </label>
            <label className="flex items-start gap-2 text-xs text-[hsl(var(--muted-foreground))]">
              <input
                type="checkbox"
                checked={privacyAccepted}
                onChange={(e) => setPrivacyAccepted(e.target.checked)}
                className="mt-0.5 h-3.5 w-3.5"
                required
              />
              <span>
                I accept the <Link href="/legal/privacy" className="underline">Privacy Policy</Link>
              </span>
            </label>
          </div>

          {submitError && (
            <div className="flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {submitError}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-[hsl(var(--primary-foreground))] transition-colors hover:bg-[hsl(var(--primary))]/90 disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? 'Creating account…' : 'Accept invitation'}
          </button>
        </form>

        <p className="text-center text-xs text-[hsl(var(--muted-foreground))]">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-[hsl(var(--foreground))] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--muted-foreground))]" /></div>}>
      <AcceptInvitationForm />
    </Suspense>
  );
}
