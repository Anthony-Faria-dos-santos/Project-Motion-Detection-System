import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../src/lib/prisma';
import { applyTenantGucs } from '../../src/middleware/tenant-context';

/**
 * RLS tenant isolation — DRAFT integration tests.
 *
 * Skipped pending:
 *   1. The migration 20260427033445_enable_rls_tenant_isolation being applied
 *      to the test schema.
 *   2. Schema.prisma carrying the Organization model + organizationId fields
 *      (so prisma client typings match the underlying tables).
 *   3. Request-scoped transaction wrapper landing for tenant-context (see
 *      middleware/tenant-context.ts).
 *
 * Once unlocked:
 *   pnpm --filter @motionops/api test:integration -- rls.spec
 */

const ORG_A = '11111111-1111-1111-1111-111111111111';
const ORG_B = '22222222-2222-2222-2222-222222222222';

describe.skip('RLS tenant isolation', () => {
  beforeAll(async () => {
    await prisma.$transaction(async (tx) => {
      await applyTenantGucs(tx, { isSuperAdmin: true });
      await tx.$executeRawUnsafe(
        `INSERT INTO "organizations" ("id", "name", "slug")
         VALUES ($1, 'Tenant A', 'tenant-a'), ($2, 'Tenant B', 'tenant-b')
         ON CONFLICT ("id") DO NOTHING`,
        ORG_A,
        ORG_B,
      );
      await tx.$executeRawUnsafe(
        `INSERT INTO "cameras" ("id", "name", "location", "sourceUrl", "organizationId", "createdAt", "updatedAt")
         VALUES
           (gen_random_uuid(), 'Cam A1', 'A', 'rtsp://a/1', $1, now(), now()),
           (gen_random_uuid(), 'Cam B1', 'B', 'rtsp://b/1', $2, now(), now())`,
        ORG_A,
        ORG_B,
      );
    });
  });

  afterAll(async () => {
    await prisma.$transaction(async (tx) => {
      await applyTenantGucs(tx, { isSuperAdmin: true });
      await tx.$executeRawUnsafe(`DELETE FROM "cameras" WHERE "organizationId" IN ($1, $2)`, ORG_A, ORG_B);
      await tx.$executeRawUnsafe(`DELETE FROM "organizations" WHERE "id" IN ($1, $2)`, ORG_A, ORG_B);
    });
  });

  it('isolates SELECT for tenant A', async () => {
    const result = await prisma.$transaction(async (tx) => {
      await applyTenantGucs(tx, { organizationId: ORG_A, isSuperAdmin: false });
      const rows = await tx.$queryRawUnsafe<{ id: string; organizationId: string }[]>(
        `SELECT "id", "organizationId" FROM "cameras"`,
      );
      return rows;
    });
    expect(result.every((c) => c.organizationId === ORG_A)).toBe(true);
  });

  it('isolates SELECT for tenant B', async () => {
    const result = await prisma.$transaction(async (tx) => {
      await applyTenantGucs(tx, { organizationId: ORG_B, isSuperAdmin: false });
      const rows = await tx.$queryRawUnsafe<{ id: string; organizationId: string }[]>(
        `SELECT "id", "organizationId" FROM "cameras"`,
      );
      return rows;
    });
    expect(result.every((c) => c.organizationId === ORG_B)).toBe(true);
  });

  it('SUPER_ADMIN sees both tenants', async () => {
    const result = await prisma.$transaction(async (tx) => {
      await applyTenantGucs(tx, { isSuperAdmin: true });
      const rows = await tx.$queryRawUnsafe<{ id: string; organizationId: string }[]>(
        `SELECT "id", "organizationId" FROM "cameras" WHERE "organizationId" IN ($1, $2)`,
        ORG_A,
        ORG_B,
      );
      return rows;
    });
    const orgs = new Set(result.map((c) => c.organizationId));
    expect(orgs.has(ORG_A)).toBe(true);
    expect(orgs.has(ORG_B)).toBe(true);
  });

  it('rejects UPDATE across tenants', async () => {
    const target = await prisma.$transaction(async (tx) => {
      await applyTenantGucs(tx, { isSuperAdmin: true });
      const rows = await tx.$queryRawUnsafe<{ id: string }[]>(
        `SELECT "id" FROM "cameras" WHERE "organizationId" = $1 LIMIT 1`,
        ORG_B,
      );
      return rows[0];
    });
    expect(target).toBeDefined();

    const affected = await prisma.$transaction(async (tx) => {
      await applyTenantGucs(tx, { organizationId: ORG_A, isSuperAdmin: false });
      return tx.$executeRawUnsafe(
        `UPDATE "cameras" SET "name" = 'pwned' WHERE "id" = $1`,
        target!.id,
      );
    });
    expect(affected).toBe(0);
  });

  it('denies access when GUCs are unset', async () => {
    const result = await prisma.$transaction(async (tx) => {
      await applyTenantGucs(tx, {});
      const rows = await tx.$queryRawUnsafe<{ id: string }[]>(
        `SELECT "id" FROM "cameras"`,
      );
      return rows;
    });
    expect(result.length).toBe(0);
  });
});
