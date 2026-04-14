import { Router, Request } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { authenticate, authorize, type AuthenticatedRequest } from '../middleware/auth';
import { createInvitationToken } from '../lib/tokens';
import { sendInvitationEmail } from '../lib/email';
import { Role, UserStatus } from '@prisma/client';

export const userRouter: ReturnType<typeof Router> = Router();

// Helpers to extract IP / UA safely (Express types may widen these to string|string[])
function getIp(req: Request): string | null {
  return typeof req.ip === 'string' ? req.ip : null;
}
function getUserAgent(req: Request): string | null {
  const ua = req.headers['user-agent'];
  return typeof ua === 'string' ? ua : null;
}

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  status: z.nativeEnum(UserStatus).optional(),
  role: z.nativeEnum(Role).optional(),
  search: z.string().max(100).optional(),
  hasMfa: z.enum(['true', 'false', 'all']).default('all'),
});

const updateUserSchema = z.object({
  role: z.nativeEnum(Role).optional(),
  status: z.nativeEnum(UserStatus).optional(),
  comment: z.string().min(10).max(500),
}).refine(data => data.role !== undefined || data.status !== undefined, {
  message: 'At least one of role or status must be provided',
});

const inviteSchema = z.object({
  email: z.string().email().max(254),
  role: z.nativeEnum(Role),
  message: z.string().max(500).optional().nullable(),
});

// ── GET /api/users/invitations/verify/:token (public) ─
// Validates an invitation token and returns the data needed to pre-fill
// the acceptance form (email + role + optional message + inviter display name).
// Consumption of the invitation still happens through POST /api/auth/signup
// with `inviteToken` in the payload — this endpoint is read-only.

userRouter.get('/invitations/verify/:token', async (req, res) => {
  try {
    const token = req.params.token as string;
    if (!token || token.length !== 64) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid token format', retryable: false } });
    }
    const invitation = await prisma.userInvitation.findUnique({
      where: { token },
      include: { invitedBy: { select: { displayName: true, email: true } } },
    });
    if (!invitation) {
      return res.status(404).json({ error: { code: 'INVITATION_NOT_FOUND', message: 'Invitation not found', retryable: false } });
    }
    if (invitation.acceptedAt) {
      return res.status(410).json({ error: { code: 'INVITATION_ALREADY_ACCEPTED', message: 'This invitation has already been accepted', retryable: false } });
    }
    if (invitation.revokedAt) {
      return res.status(410).json({ error: { code: 'INVITATION_REVOKED', message: 'This invitation has been revoked', retryable: false } });
    }
    if (invitation.expiresAt < new Date()) {
      return res.status(410).json({ error: { code: 'INVITATION_EXPIRED', message: 'This invitation has expired', retryable: false } });
    }
    res.json({
      email: invitation.email,
      role: invitation.role,
      message: invitation.message,
      expiresAt: invitation.expiresAt.toISOString(),
      inviter: {
        displayName: invitation.invitedBy.displayName,
      },
    });
  } catch (err) {
    logger.error({ err }, 'Verify invitation token failed');
    res.status(500).json({ error: { code: 'SYSTEM_INTERNAL_ERROR', message: 'Failed to verify invitation', retryable: true } });
  }
});

// ── GET /api/users — List users (SUPER_ADMIN) ──

userRouter.get('/', authenticate, authorize('user:read'), async (req: AuthenticatedRequest, res) => {
  try {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || 'Invalid query', retryable: false } });
    }
    const { page, limit, status, role, search, hasMfa } = parsed.data;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (role) where.role = role;
    if (search) where.email = { contains: search, mode: 'insensitive' };
    if (hasMfa === 'true') where.mfaEnabled = true;
    if (hasMfa === 'false') where.mfaEnabled = false;

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          email: true,
          displayName: true,
          role: true,
          status: true,
          mfaEnabled: true,
          emailVerifiedAt: true,
          lastLoginAt: true,
          createdAt: true,
          firstName: true,
          lastName: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    logger.error({ err }, 'List users failed');
    res.status(500).json({ error: { code: 'SYSTEM_INTERNAL_ERROR', message: 'Failed to list users', retryable: true } });
  }
});

// ── GET /api/users/invitations ─────────────────

userRouter.get('/invitations', authenticate, authorize('user:read'), async (_req: AuthenticatedRequest, res) => {
  try {
    const invitations = await prisma.userInvitation.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        invitedBy: { select: { id: true, displayName: true, email: true } },
      },
    });
    res.json({
      items: invitations.map(inv => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        invitedBy: inv.invitedBy,
        message: inv.message,
        expiresAt: inv.expiresAt.toISOString(),
        acceptedAt: inv.acceptedAt?.toISOString() || null,
        revokedAt: inv.revokedAt?.toISOString() || null,
        createdAt: inv.createdAt.toISOString(),
        status: inv.acceptedAt
          ? 'accepted'
          : inv.revokedAt
            ? 'revoked'
            : inv.expiresAt < new Date()
              ? 'expired'
              : 'pending',
      })),
    });
  } catch (err) {
    logger.error({ err }, 'List invitations failed');
    res.status(500).json({ error: { code: 'SYSTEM_INTERNAL_ERROR', message: 'Failed to list invitations', retryable: true } });
  }
});

// ── POST /api/users/invite ─────────────────────

userRouter.post('/invite', authenticate, authorize('user:create'), async (req: AuthenticatedRequest, res) => {
  try {
    const parsed = inviteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || 'Invalid input', retryable: false } });
    }
    const { email, role, message } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing && existing.status !== UserStatus.DELETED) {
      return res.status(409).json({ error: { code: 'USER_ALREADY_EXISTS', message: 'A user with this email already exists', retryable: false } });
    }

    // Check pending invitation
    const pendingInvite = await prisma.userInvitation.findFirst({
      where: { email: normalizedEmail, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
    });
    if (pendingInvite) {
      return res.status(409).json({ error: { code: 'INVITATION_PENDING', message: 'A pending invitation already exists for this email', retryable: false } });
    }

    const { token, expiresAt } = await createInvitationToken();
    const invitation = await prisma.userInvitation.create({
      data: {
        email: normalizedEmail,
        role,
        token,
        invitedById: req.user!.id,
        expiresAt,
        message: message || null,
      },
    });

    const inviter = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
    await sendInvitationEmail(normalizedEmail, inviter.displayName, role, token, message);

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'user:invited',
        resource: 'user_invitation',
        resourceId: invitation.id,
        ipAddress: getIp(req),
        userAgent: getUserAgent(req),
        comment: `Invited ${normalizedEmail} as ${role}`,
      },
    });

    res.status(201).json({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt.toISOString(),
      message: 'Invitation sent successfully',
    });
  } catch (err) {
    logger.error({ err }, 'Invite user failed');
    res.status(500).json({ error: { code: 'SYSTEM_INTERNAL_ERROR', message: 'Failed to send invitation', retryable: true } });
  }
});

// ── DELETE /api/users/invitations/:id ──────────

userRouter.delete('/invitations/:id', authenticate, authorize('user:create'), async (req: AuthenticatedRequest, res) => {
  try {
    const id = req.params.id as string;
    const invitation = await prisma.userInvitation.findUnique({ where: { id } });
    if (!invitation) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Invitation not found', retryable: false } });
    }
    if (invitation.acceptedAt || invitation.revokedAt) {
      return res.status(400).json({ error: { code: 'INVITATION_FINALIZED', message: 'Invitation already finalized', retryable: false } });
    }
    await prisma.userInvitation.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'user:invitation_revoked',
        resource: 'user_invitation',
        resourceId: id,
        ipAddress: getIp(req),
      },
    });
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, 'Revoke invitation failed');
    res.status(500).json({ error: { code: 'SYSTEM_INTERNAL_ERROR', message: 'Failed to revoke invitation', retryable: true } });
  }
});

// ── GET /api/users/:id — User detail ───────────

userRouter.get('/:id', authenticate, authorize('user:read'), async (req: AuthenticatedRequest, res) => {
  try {
    const id = req.params.id as string;
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        linkedAccounts: {
          select: { id: true, provider: true, providerEmail: true, lastUsedAt: true, createdAt: true },
        },
        passkeys: {
          select: { id: true, deviceName: true, transports: true, lastUsedAt: true, createdAt: true },
        },
      },
    });
    if (!user) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found', retryable: false } });
    }

    const [activeSessions, recentAudit] = await Promise.all([
      prisma.refreshToken.findMany({
        where: { userId: id, revokedAt: null, expiresAt: { gt: new Date() } },
        select: { id: true, expiresAt: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: { id: true, action: true, resource: true, resourceId: true, ipAddress: true, comment: true, createdAt: true },
      }),
    ]);

    res.json({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      locale: user.locale,
      timezone: user.timezone,
      role: user.role,
      status: user.status,
      mfaEnabled: user.mfaEnabled,
      mfaEnrolledAt: user.mfaEnrolledAt?.toISOString() || null,
      emailVerifiedAt: user.emailVerifiedAt?.toISOString() || null,
      termsAcceptedAt: user.termsAcceptedAt?.toISOString() || null,
      termsVersion: user.termsVersion,
      privacyPolicyAcceptedAt: user.privacyPolicyAcceptedAt?.toISOString() || null,
      privacyPolicyVersion: user.privacyPolicyVersion,
      failedLoginAttempts: user.failedLoginAttempts,
      lockedUntil: user.lockedUntil?.toISOString() || null,
      passwordChangedAt: user.passwordChangedAt?.toISOString() || null,
      lastLoginAt: user.lastLoginAt?.toISOString() || null,
      lastLoginIp: user.lastLoginIp,
      isDemoAccount: user.isDemoAccount,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      linkedAccounts: user.linkedAccounts.map(la => ({
        ...la,
        lastUsedAt: la.lastUsedAt?.toISOString() || null,
        createdAt: la.createdAt.toISOString(),
      })),
      passkeys: user.passkeys.map(p => ({
        ...p,
        lastUsedAt: p.lastUsedAt?.toISOString() || null,
        createdAt: p.createdAt.toISOString(),
      })),
      activeSessions: activeSessions.map(s => ({
        id: s.id,
        expiresAt: s.expiresAt.toISOString(),
        createdAt: s.createdAt.toISOString(),
      })),
      recentAudit: recentAudit.map(a => ({
        id: a.id,
        action: a.action,
        resource: a.resource,
        resourceId: a.resourceId,
        ipAddress: a.ipAddress,
        comment: a.comment,
        createdAt: a.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    logger.error({ err }, 'Get user detail failed');
    res.status(500).json({ error: { code: 'SYSTEM_INTERNAL_ERROR', message: 'Failed to load user', retryable: true } });
  }
});

// ── PATCH /api/users/:id ───────────────────────

userRouter.patch('/:id', authenticate, authorize('user:update'), async (req: AuthenticatedRequest, res) => {
  try {
    const id = req.params.id as string;

    // Self-modification protection
    if (id === req.user!.id) {
      return res.status(403).json({ error: { code: 'SELF_MODIFICATION_FORBIDDEN', message: 'You cannot modify your own role or status', retryable: false } });
    }

    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || 'Invalid input', retryable: false } });
    }
    const { role, status, comment } = parsed.data;

    const before = await prisma.user.findUnique({ where: { id } });
    if (!before) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found', retryable: false } });
    }

    // Last SUPER_ADMIN protection
    if (before.role === Role.SUPER_ADMIN && role && role !== Role.SUPER_ADMIN) {
      const superAdminCount = await prisma.user.count({ where: { role: Role.SUPER_ADMIN, status: UserStatus.ACTIVE, id: { not: id } } });
      if (superAdminCount === 0) {
        return res.status(400).json({ error: { code: 'LAST_SUPER_ADMIN', message: 'Cannot remove the last active SUPER_ADMIN', retryable: false } });
      }
    }

    const updates: { role?: Role; status?: UserStatus; failedLoginAttempts?: number; lockedUntil?: Date | null } = {};
    if (role) updates.role = role;
    if (status) {
      updates.status = status;
      // Unlock = reset failed attempts
      if (status === UserStatus.ACTIVE && before.status === UserStatus.LOCKED) {
        updates.failedLoginAttempts = 0;
        updates.lockedUntil = null;
      }
    }

    const after = await prisma.user.update({ where: { id }, data: updates });

    // Revoke all refresh tokens (force re-login with new permissions/status)
    await prisma.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'user:updated',
        resource: 'user',
        resourceId: id,
        before: { role: before.role, status: before.status },
        after: { role: after.role, status: after.status },
        ipAddress: getIp(req),
        userAgent: getUserAgent(req),
        comment,
      },
    });

    res.json({ id: after.id, role: after.role, status: after.status });
  } catch (err) {
    logger.error({ err }, 'Update user failed');
    res.status(500).json({ error: { code: 'SYSTEM_INTERNAL_ERROR', message: 'Failed to update user', retryable: true } });
  }
});

// ── DELETE /api/users/:id (RGPD pseudonymize) ──

userRouter.delete('/:id', authenticate, authorize('user:delete'), async (req: AuthenticatedRequest, res) => {
  try {
    const id = req.params.id as string;

    if (id === req.user!.id) {
      return res.status(403).json({ error: { code: 'SELF_MODIFICATION_FORBIDDEN', message: 'You cannot delete your own account from here. Use the GDPR self-delete endpoint.', retryable: false } });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found', retryable: false } });
    }

    // Last SUPER_ADMIN protection
    if (user.role === Role.SUPER_ADMIN) {
      const superAdminCount = await prisma.user.count({ where: { role: Role.SUPER_ADMIN, status: UserStatus.ACTIVE, id: { not: id } } });
      if (superAdminCount === 0) {
        return res.status(400).json({ error: { code: 'LAST_SUPER_ADMIN', message: 'Cannot delete the last active SUPER_ADMIN', retryable: false } });
      }
    }

    const pseudonym = `deleted_${id.slice(0, 8)}`;
    await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data: {
          email: `${pseudonym}@deleted.motionops.local`,
          displayName: 'Deleted User',
          firstName: null,
          lastName: null,
          avatarUrl: null,
          status: UserStatus.DELETED,
          deletedAt: new Date(),
        },
      }),
      prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'user:deleted',
        resource: 'user',
        resourceId: id,
        before: { email: user.email, displayName: user.displayName, role: user.role },
        after: { email: `${pseudonym}@deleted.motionops.local`, status: UserStatus.DELETED },
        ipAddress: getIp(req),
        userAgent: getUserAgent(req),
        comment: `Pseudonymized by SUPER_ADMIN`,
      },
    });

    res.status(204).send();
  } catch (err) {
    logger.error({ err }, 'Delete user failed');
    res.status(500).json({ error: { code: 'SYSTEM_INTERNAL_ERROR', message: 'Failed to delete user', retryable: true } });
  }
});
