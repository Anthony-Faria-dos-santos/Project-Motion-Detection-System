import { Resend } from 'resend';
import { logger } from './logger';
import { Role } from '@prisma/client';

const FROM = process.env.EMAIL_FROM || 'MotionOps <noreply@motionops.local>';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const APP_NAME = 'MotionOps';

let resendClient: Resend | null = null;
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

async function sendEmail(opts: EmailOptions): Promise<void> {
  const resend = getResend();
  if (!resend) {
    // Dev fallback: log to console
    logger.info(
      { to: opts.to, subject: opts.subject, mode: 'console_fallback' },
      `[DEV EMAIL] ${opts.subject}\n${opts.text}`,
    );
    return;
  }

  try {
    const result = await resend.emails.send({
      from: FROM,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });
    logger.info({ to: opts.to, id: result.data?.id }, 'Email sent');
  } catch (err) {
    logger.error({ err, to: opts.to, subject: opts.subject }, 'Failed to send email');
    // Do not throw — email failure should not block the auth flow.
    // The user can request a resend.
  }
}

// ── Templates ──────────────────────────────────

function baseLayout(content: string): string {
  return `<!DOCTYPE html>
<html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f7; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.06);">
    <div style="font-size: 18px; font-weight: 600; color: #111; margin-bottom: 24px;">${APP_NAME}</div>
    ${content}
    <div style="font-size: 12px; color: #888; margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee;">
      You received this email because someone (hopefully you) is using ${APP_NAME}.
      If this wasn't you, you can safely ignore this message.
    </div>
  </div>
</body></html>`;
}

// ── Verification email ─────────────────────────

export async function sendVerificationEmail(to: string, displayName: string, token: string): Promise<void> {
  const link = `${FRONTEND_URL}/verify-email?token=${token}`;
  const subject = `Verify your ${APP_NAME} account`;
  const html = baseLayout(`
    <h1 style="font-size: 22px; font-weight: 600; color: #111; margin: 0 0 16px;">Welcome, ${escapeHtml(displayName)}!</h1>
    <p style="font-size: 15px; color: #444; line-height: 1.6;">
      Click the button below to verify your email address and activate your account.
      This link expires in 1 hour.
    </p>
    <a href="${link}" style="display: inline-block; background: #111; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; margin: 16px 0;">Verify email</a>
    <p style="font-size: 13px; color: #888;">Or copy this link into your browser:<br>${link}</p>
  `);
  const text = `Welcome to ${APP_NAME}!\n\nVerify your email by clicking this link (expires in 1 hour):\n${link}\n\nIf you didn't sign up, ignore this email.`;
  await sendEmail({ to, subject, html, text });
}

// ── Password reset email ───────────────────────

export async function sendPasswordResetEmail(to: string, displayName: string, token: string, ipAddress?: string | null): Promise<void> {
  const link = `${FRONTEND_URL}/reset-password?token=${token}`;
  const subject = `Reset your ${APP_NAME} password`;
  const ipLine = ipAddress ? `<p style="font-size: 13px; color: #888;">Request originated from IP: ${escapeHtml(ipAddress)}</p>` : '';
  const html = baseLayout(`
    <h1 style="font-size: 22px; font-weight: 600; color: #111; margin: 0 0 16px;">Password reset request</h1>
    <p style="font-size: 15px; color: #444; line-height: 1.6;">
      Hi ${escapeHtml(displayName)}, you (or someone else) requested to reset your password.
      Click the button below to choose a new password. This link expires in 1 hour.
    </p>
    <a href="${link}" style="display: inline-block; background: #111; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; margin: 16px 0;">Reset password</a>
    <p style="font-size: 13px; color: #888;">Or copy this link into your browser:<br>${link}</p>
    ${ipLine}
    <p style="font-size: 13px; color: #c00; margin-top: 16px;">If you didn't request this, your account is still safe — but consider changing your password soon.</p>
  `);
  const text = `Password reset request for ${APP_NAME}\n\nReset your password (expires in 1 hour):\n${link}\n\n${ipAddress ? `IP: ${ipAddress}\n\n` : ''}If you didn't request this, ignore this email.`;
  await sendEmail({ to, subject, html, text });
}

// ── Passkey recovery email ─────────────────────

export async function sendPasskeyRecoveryEmail(to: string, displayName: string, token: string, ipAddress?: string | null): Promise<void> {
  const link = `${FRONTEND_URL}/forgot-passkey?token=${token}`;
  const subject = `Recover access to your ${APP_NAME} account`;
  const ipLine = ipAddress ? `<p style="font-size: 13px; color: #888;">Request originated from IP: ${escapeHtml(ipAddress)}</p>` : '';
  const html = baseLayout(`
    <h1 style="font-size: 22px; font-weight: 600; color: #111; margin: 0 0 16px;">Passkey recovery</h1>
    <p style="font-size: 15px; color: #444; line-height: 1.6;">
      Hi ${escapeHtml(displayName)}, you (or someone else) requested to recover access to your account after losing a passkey device.
      Click the button below to enrol a new passkey on your current device. This link expires in 1 hour and can be used only once.
    </p>
    <a href="${link}" style="display: inline-block; background: #111; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; margin: 16px 0;">Enrol a new passkey</a>
    <p style="font-size: 13px; color: #888;">Or copy this link into your browser:<br>${link}</p>
    ${ipLine}
    <p style="font-size: 13px; color: #c00; margin-top: 16px;">If you didn't request this, ignore this email — your existing passkeys remain active.</p>
  `);
  const text = `Passkey recovery for ${APP_NAME}\n\nEnrol a new passkey (expires in 1 hour):\n${link}\n\n${ipAddress ? `IP: ${ipAddress}\n\n` : ''}If you didn't request this, ignore this email.`;
  await sendEmail({ to, subject, html, text });
}

// ── Invitation email ───────────────────────────

export async function sendInvitationEmail(
  to: string,
  inviterName: string,
  role: Role,
  token: string,
  message?: string | null,
): Promise<void> {
  const link = `${FRONTEND_URL}/signup?invite=${token}`;
  const subject = `${inviterName} invited you to ${APP_NAME}`;
  const messageBlock = message
    ? `<div style="background: #f5f5f7; border-radius: 8px; padding: 16px; margin: 16px 0; font-size: 14px; color: #444; font-style: italic;">"${escapeHtml(message)}"</div>`
    : '';
  const html = baseLayout(`
    <h1 style="font-size: 22px; font-weight: 600; color: #111; margin: 0 0 16px;">You're invited to ${APP_NAME}</h1>
    <p style="font-size: 15px; color: #444; line-height: 1.6;">
      ${escapeHtml(inviterName)} has invited you to join ${APP_NAME} as <strong>${role}</strong>.
    </p>
    ${messageBlock}
    <p style="font-size: 15px; color: #444; line-height: 1.6;">
      Click below to create your account. This invitation expires in 7 days.
    </p>
    <a href="${link}" style="display: inline-block; background: #111; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; margin: 16px 0;">Accept invitation</a>
    <p style="font-size: 13px; color: #888;">Or copy this link into your browser:<br>${link}</p>
  `);
  const text = `${inviterName} invited you to ${APP_NAME} as ${role}\n\n${message ? `Message: "${message}"\n\n` : ''}Accept invitation (expires in 7 days):\n${link}`;
  await sendEmail({ to, subject, html, text });
}

// ── Helper ─────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
