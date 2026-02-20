-- =============================================================================
-- EHC Assessment App — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New query → paste → Run
-- =============================================================================

-- ── Extensions ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Organizations (multi-tenant) ────────────────────────────────────────────
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Profiles (extends auth.users) ───────────────────────────────────────────
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT DEFAULT '',
  org_id UUID NOT NULL REFERENCES organizations(id),
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Drafts (core data store) ────────────────────────────────────────────────
CREATE TABLE drafts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  client_name TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL CHECK (type IN ('assessment', 'serviceContract')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
  current_step INTEGER DEFAULT 0,
  linked_assessment_id UUID REFERENCES drafts(id) ON DELETE SET NULL,
  form_data JSONB NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1,
  locked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  locked_at TIMESTAMPTZ,
  lock_device_id TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_drafts_org_id ON drafts(org_id);
CREATE INDEX idx_drafts_org_status ON drafts(org_id, status);
CREATE INDEX idx_drafts_org_type ON drafts(org_id, type);
CREATE INDEX idx_drafts_client_name ON drafts(org_id, client_name);
CREATE INDEX idx_drafts_updated_at ON drafts(updated_at DESC);
CREATE INDEX idx_drafts_locked_by ON drafts(locked_by) WHERE locked_by IS NOT NULL;
CREATE INDEX idx_drafts_form_data ON drafts USING GIN (form_data jsonb_path_ops);

-- ── Audit Logs ──────────────────────────────────────────────────────────────
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id),
  user_email TEXT NOT NULL DEFAULT 'system',
  action TEXT NOT NULL,
  resource TEXT,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failure', 'info')),
  device_id TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_org ON audit_logs(org_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(org_id, action);
CREATE INDEX idx_audit_logs_user ON audit_logs(org_id, user_email);

-- ── App Config ──────────────────────────────────────────────────────────────
CREATE TABLE app_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  config_type TEXT NOT NULL CHECK (config_type IN ('auth', 'sheets', 'email')),
  config_data JSONB NOT NULL DEFAULT '{}',
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, config_type)
);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER drafts_updated_at
  BEFORE UPDATE ON drafts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-increment version when form_data changes
CREATE OR REPLACE FUNCTION increment_draft_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER drafts_version_increment
  BEFORE UPDATE ON drafts
  FOR EACH ROW
  WHEN (OLD.form_data IS DISTINCT FROM NEW.form_data)
  EXECUTE FUNCTION increment_draft_version();

-- =============================================================================
-- LOCK FUNCTIONS
-- =============================================================================

-- Release locks older than 30 minutes
CREATE OR REPLACE FUNCTION release_stale_locks()
RETURNS void AS $$
BEGIN
  UPDATE drafts
  SET locked_by = NULL, locked_at = NULL, lock_device_id = NULL
  WHERE locked_by IS NOT NULL
    AND locked_at < now() - INTERVAL '30 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomically acquire a lock on a draft
CREATE OR REPLACE FUNCTION acquire_draft_lock(
  p_draft_id UUID,
  p_user_id UUID,
  p_device_id TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_locked_by UUID;
BEGIN
  -- Clean up stale locks first
  PERFORM release_stale_locks();

  -- Lock the row for atomic check-and-update
  SELECT locked_by INTO v_locked_by
  FROM drafts WHERE id = p_draft_id FOR UPDATE;

  -- Lock available or already held by this user
  IF v_locked_by IS NULL OR v_locked_by = p_user_id THEN
    UPDATE drafts
    SET locked_by = p_user_id,
        locked_at = now(),
        lock_device_id = p_device_id
    WHERE id = p_draft_id;
    RETURN TRUE;
  END IF;

  -- Locked by someone else
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Release a lock (only if held by the requesting user)
CREATE OR REPLACE FUNCTION release_draft_lock(
  p_draft_id UUID,
  p_user_id UUID
)
RETURNS void AS $$
BEGIN
  UPDATE drafts
  SET locked_by = NULL, locked_at = NULL, lock_device_id = NULL
  WHERE id = p_draft_id AND locked_by = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- ROW-LEVEL SECURITY
-- =============================================================================

ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Helper: get the current user's org_id (in PUBLIC schema, not auth)
CREATE OR REPLACE FUNCTION public.user_org_id()
RETURNS UUID AS $$
  SELECT org_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Organizations: users can only see their own org
CREATE POLICY org_select ON organizations
  FOR SELECT USING (
    id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

-- Profiles: read within org (uses inline subquery to avoid circular dep)
CREATE POLICY profiles_select ON profiles
  FOR SELECT USING (
    org_id IN (SELECT p.org_id FROM profiles p WHERE p.id = auth.uid())
  );

CREATE POLICY profiles_update ON profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY profiles_insert ON profiles
  FOR INSERT WITH CHECK (true);

-- Drafts: full CRUD within org
CREATE POLICY drafts_select ON drafts
  FOR SELECT USING (org_id = public.user_org_id());

CREATE POLICY drafts_insert ON drafts
  FOR INSERT WITH CHECK (org_id = public.user_org_id());

CREATE POLICY drafts_update ON drafts
  FOR UPDATE USING (org_id = public.user_org_id());

CREATE POLICY drafts_delete ON drafts
  FOR DELETE USING (org_id = public.user_org_id());

-- Audit logs: read and insert within org
CREATE POLICY audit_logs_select ON audit_logs
  FOR SELECT USING (org_id = public.user_org_id());

CREATE POLICY audit_logs_insert ON audit_logs
  FOR INSERT WITH CHECK (org_id = public.user_org_id());

-- App config: read within org, write for admins
CREATE POLICY app_config_select ON app_config
  FOR SELECT USING (org_id = public.user_org_id());

CREATE POLICY app_config_update ON app_config
  FOR UPDATE USING (
    org_id = public.user_org_id()
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY app_config_insert ON app_config
  FOR INSERT WITH CHECK (
    org_id = public.user_org_id()
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================================================
-- SEED: Create your organization
-- =============================================================================

INSERT INTO organizations (name, slug)
VALUES ('Executive Home Care of Chester County', 'ehc-chester')
RETURNING id;

-- ⚠️  COPY the returned org ID — you'll need it to create your admin profile
-- after your first Google sign-in via Supabase Auth.
--
-- After signing in for the first time, find your user ID:
--   SELECT id, email FROM auth.users ORDER BY created_at DESC LIMIT 1;
--
-- Then create your admin profile:
--   INSERT INTO profiles (id, email, full_name, org_id, role)
--   VALUES (
--     '<your-auth-user-id>',
--     'snegi@executivehomecare.com',
--     'Your Name',
--     '<org-id-from-above>',
--     'admin'
--   );

-- =============================================================================
-- ENABLE REALTIME on drafts table
-- =============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE drafts;
