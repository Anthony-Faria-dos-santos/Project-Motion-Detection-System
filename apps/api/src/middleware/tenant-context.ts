import { Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import type { AuthenticatedRequest } from './auth';

/**
 * Sets per-request Postgres session variables that the RLS policies (see
 * migration 20260427033445_enable_rls_tenant_isolation) read via the helper
 * functions current_tenant_id() and is_super_admin().
 *
 * IMPLEMENTATION STATUS — DRAFT, do not mount in production yet.
 *   set_config(..., true) only persists for the lifetime of the surrounding
 *   transaction. Until the Prisma client is wrapped in a request-scoped
 *   interactive transaction this middleware cannot enforce isolation across
 *   the request — the GUCs are reset between queries.
 *
 * Follow-up tasks:
 *   1. Wrap each authenticated request in prisma.$transaction (interactive)
 *      and pin all subsequent queries to that transaction client (e.g. via
 *      AsyncLocalStorage), then call applyTenantGucs(tx, ...) inside it.
 *   2. Confirm Supabase / pgbouncer transaction-mode pooling preserves the
 *      GUC across the transaction lifetime.
 *   3. Mount tenantContext on every authenticated router and update
 *      integration tests in tests/integration/rls.spec.ts.
 */

interface TenantContextOptions {
  organizationId?: string;
  isSuperAdmin?: boolean;
}

async function resolveOrganizationId(userId: string): Promise<string> {
  // TODO(phase-5): once users.organizationId is populated, look it up here.
  void userId;
  return '00000000-0000-0000-0000-000000000001';
}

export async function tenantContext(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.user) {
    res.status(401).json({
      error: { code: 'AUTH_MISSING_TOKEN', message: 'Not authenticated', retryable: false },
    });
    return;
  }
  try {
    const organizationId = await resolveOrganizationId(req.user.id);
    const isSuperAdmin = req.user.role === 'SUPER_ADMIN';
    await applyTenantGucs(prisma, { organizationId, isSuperAdmin });
    next();
  } catch (err) {
    next(err);
  }
}

export async function applyTenantGucs(
  client: Prisma.TransactionClient | typeof prisma,
  opts: TenantContextOptions,
): Promise<void> {
  const orgId = opts.organizationId ?? '';
  const superFlag = opts.isSuperAdmin ? 'true' : 'false';
  await client.$executeRawUnsafe(
    `SELECT set_config('app.current_tenant_id', $1, true)`,
    orgId,
  );
  await client.$executeRawUnsafe(
    `SELECT set_config('app.is_super_admin', $1, true)`,
    superFlag,
  );
}
