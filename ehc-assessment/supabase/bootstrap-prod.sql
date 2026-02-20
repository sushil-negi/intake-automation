-- =============================================================================
-- EHC Assessment App — Production Bootstrap
-- =============================================================================
-- Run this AFTER schema.sql and schema-v2-multi-tenant.sql on the PROD database.
-- Prerequisites: Sign in once via the app to create your auth.users row.
-- =============================================================================

-- Step 1: Create super_admin profile linked to the seed org
-- (The seed org "ehc-chester" was created by schema.sql)

INSERT INTO profiles (id, email, full_name, org_id, role)
SELECT
  u.id,
  u.email,
  COALESCE(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    'Sushil Negi'
  ),
  o.id,
  'super_admin'
FROM auth.users u
CROSS JOIN organizations o
WHERE u.email = 'snegi@executivehomecare.com'
  AND o.slug = 'ehc-chester'
ON CONFLICT (id) DO UPDATE SET
  role = 'super_admin',
  org_id = EXCLUDED.org_id;

-- Step 2: Verify (should show 1 row with super_admin role)
SELECT id, email, full_name, role, org_id FROM profiles
WHERE email = 'snegi@executivehomecare.com';

-- =============================================================================
-- Done! Refresh the browser to access the Dashboard and Admin Portal.
-- =============================================================================
