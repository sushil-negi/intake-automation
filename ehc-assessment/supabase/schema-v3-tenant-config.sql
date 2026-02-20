-- ── Schema v3: Tenant Configuration ─────────────────────────────────────────
-- Extends app_config table for per-tenant configuration and branding.
-- Prerequisite: schema.sql (base tables) + schema-v2-multi-tenant.sql
-- ────────────────────────────────────────────────────────────────────────────

-- Add 'branding' to allowed config types
ALTER TABLE app_config DROP CONSTRAINT IF EXISTS app_config_config_type_check;
ALTER TABLE app_config ADD CONSTRAINT app_config_config_type_check
  CHECK (config_type IN ('auth', 'sheets', 'email', 'branding'));

-- Ensure one config row per org per type (enables upsert pattern)
CREATE UNIQUE INDEX IF NOT EXISTS idx_app_config_org_type
  ON app_config(org_id, config_type);

-- Super-admin can read all app_config rows (for admin portal)
CREATE POLICY IF NOT EXISTS app_config_select_super ON app_config
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Super-admin can update any app_config row
CREATE POLICY IF NOT EXISTS app_config_update_super ON app_config
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Super-admin can insert app_config rows for any org
CREATE POLICY IF NOT EXISTS app_config_insert_super ON app_config
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );
