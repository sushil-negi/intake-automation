-- =============================================================================
-- EHC Assessment App — Schema Migration v2: Multi-Tenant Foundation
-- Run this AFTER schema.sql in: Supabase Dashboard → SQL Editor
-- =============================================================================

-- ── 1. Add is_active column to organizations ─────────────────────────────────
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- ── 2. Expand role CHECK to include super_admin ──────────────────────────────
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('super_admin', 'admin', 'staff'));

-- ── 2b. Make org_id nullable ────────────────────────────────────────────────
-- Super-admins may not belong to a specific org (they manage all orgs).
-- The invite flow also pre-creates profiles before org assignment.
ALTER TABLE profiles ALTER COLUMN org_id DROP NOT NULL;

-- ── 3. Index on profiles.email for invite lookup ─────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_org_id ON profiles(org_id);

-- ── 4. SECURITY DEFINER helper for super_admin check ────────────────────────
-- All RLS policies that need to check the current user's role MUST use this
-- function instead of inline subqueries on profiles. Inline subqueries trigger
-- the profiles RLS policies recursively, causing "infinite recursion detected
-- in policy for relation profiles" errors.
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── 5. Fix circular RLS on profiles ─────────────────────────────────────────
-- The original profiles_select policy used an inline subquery on profiles,
-- creating a circular RLS dependency. Replace with SECURITY DEFINER functions.
-- Consolidate into ONE policy: own row + org-mates + super-admin sees all.
DROP POLICY IF EXISTS profiles_select ON profiles;
DROP POLICY IF EXISTS profiles_select_super ON profiles;

CREATE POLICY profiles_select ON profiles
  FOR SELECT USING (
    id = auth.uid()
    OR org_id = public.user_org_id()
    OR public.is_super_admin()
  );

-- ── 6. Super-admin RLS: read all organizations ──────────────────────────────
-- Uses SECURITY DEFINER function to avoid circular RLS on profiles.
DROP POLICY IF EXISTS org_select_super ON organizations;

CREATE POLICY org_select_super ON organizations
  FOR SELECT USING (
    public.is_super_admin()
  );

-- ── 7. Auto-link profile on first sign-in ────────────────────────────────────
-- When a new auth.user is created, check if their email matches a pre-created
-- profile (invitation flow). If yes, link the profile to the auth user.
-- If no match, user lands in "no org" state until super-admin assigns them.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_existing_id UUID;
BEGIN
  -- Check if a profile was pre-created via invite (has email but no auth id yet)
  SELECT id INTO v_existing_id
  FROM profiles
  WHERE email = NEW.email AND id != NEW.id
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    -- Update the pre-created profile: set id to auth.user id, fill metadata
    UPDATE profiles
    SET id = NEW.id,
        full_name = COALESCE(
          NEW.raw_user_meta_data->>'full_name',
          NEW.raw_user_meta_data->>'name',
          full_name
        ),
        avatar_url = COALESCE(
          NEW.raw_user_meta_data->>'avatar_url',
          NEW.raw_user_meta_data->>'picture',
          avatar_url
        ),
        updated_at = now()
    WHERE email = NEW.email AND id = v_existing_id;
  END IF;

  -- If no pre-created profile exists, user will land in "no org" state.
  -- Super-admin assigns them via the admin portal.

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it already exists (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── 8. View: org with user count (for admin portal) ─────────────────────────
CREATE OR REPLACE VIEW org_summary AS
SELECT
  o.id,
  o.name,
  o.slug,
  o.is_active,
  o.created_at,
  COUNT(p.id) AS user_count
FROM organizations o
LEFT JOIN profiles p ON p.org_id = o.id
GROUP BY o.id, o.name, o.slug, o.is_active, o.created_at;

-- Grant access to the view
GRANT SELECT ON org_summary TO authenticated;

-- ── 9. Bootstrap: Create super_admin profile ─────────────────────────────────
-- After running this migration, create the initial super_admin profile.
-- This links your Supabase auth user to the existing org with super_admin role.

-- INSERT INTO profiles (id, email, full_name, org_id, role)
-- SELECT
--   u.id,
--   u.email,
--   COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', 'Sushil Negi'),
--   o.id,
--   'super_admin'
-- FROM auth.users u
-- CROSS JOIN organizations o
-- WHERE u.email = 'snegi@executivehomecare.com'
--   AND o.slug = 'ehc-chester'
-- ON CONFLICT (id) DO UPDATE SET
--   role = 'super_admin',
--   org_id = EXCLUDED.org_id;

-- ── Done ─────────────────────────────────────────────────────────────────────
-- After running this migration:
-- 1. Uncomment and run the bootstrap INSERT above (or run it separately)
-- 2. Add SUPABASE_SERVICE_ROLE_KEY to Netlify environment variables
