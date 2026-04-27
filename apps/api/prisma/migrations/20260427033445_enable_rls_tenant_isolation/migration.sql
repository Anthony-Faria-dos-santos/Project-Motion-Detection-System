-- RLS tenant isolation — defense-in-depth for OWASP A01
-- See PR description and docs/04-operations/rls-tenant-isolation.md for context.

CREATE TABLE IF NOT EXISTS "organizations" (
  "id"        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"      TEXT NOT NULL,
  "slug"      TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "organizations" ("id", "name", "slug")
VALUES ('00000000-0000-0000-0000-000000000001', 'MotionOps Default', 'motionops-default')
ON CONFLICT ("id") DO NOTHING;

CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS UUID AS $$
  SELECT NULLIF(current_setting('app.current_tenant_id', TRUE), '')::UUID;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION is_super_admin() RETURNS BOOLEAN AS $$
  SELECT COALESCE(NULLIF(current_setting('app.is_super_admin', TRUE), '')::BOOLEAN, FALSE);
$$ LANGUAGE SQL STABLE;

DO $do$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'users','cameras','zones','scene_profiles','rules','events','tracks',
    'incidents','incident_events','audit_logs','system_metrics',
    'user_invitations','system_messages','presets'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS "organizationId" UUID', t);
    EXECUTE format('UPDATE %I SET "organizationId" = ''00000000-0000-0000-0000-000000000001'' WHERE "organizationId" IS NULL', t);
    EXECUTE format('ALTER TABLE %I ALTER COLUMN "organizationId" SET NOT NULL', t);
    EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT', t, t || '_organization_fk');
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I ("organizationId")', t || '_organization_idx', t);
  END LOOP;
END
$do$;

DO $do$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'users','cameras','zones','scene_profiles','rules','events','tracks',
    'incidents','incident_events','audit_logs','system_metrics',
    'user_invitations','system_messages','presets'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'tenant_isolation_select', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'tenant_isolation_insert', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'tenant_isolation_update', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'tenant_isolation_delete', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT USING (is_super_admin() OR "organizationId" = current_tenant_id())', 'tenant_isolation_select', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR INSERT WITH CHECK (is_super_admin() OR "organizationId" = current_tenant_id())', 'tenant_isolation_insert', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR UPDATE USING (is_super_admin() OR "organizationId" = current_tenant_id()) WITH CHECK (is_super_admin() OR "organizationId" = current_tenant_id())', 'tenant_isolation_update', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR DELETE USING (is_super_admin() OR "organizationId" = current_tenant_id())', 'tenant_isolation_delete', t);
  END LOOP;
END
$do$;
