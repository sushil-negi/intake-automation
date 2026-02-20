/**
 * Admin API types for the super-admin portal.
 *
 * All requests go to POST /api/admin with an action-based dispatch.
 * The Netlify Function verifies the caller is a super_admin via JWT.
 */

// ── Request types ────────────────────────────────────────────────────────────

export interface ListOrgsRequest {
  action: 'listOrgs';
}

export interface CreateOrgRequest {
  action: 'createOrg';
  name: string;
  slug: string;
}

export interface SuspendOrgRequest {
  action: 'suspendOrg';
  orgId: string;
  suspend: boolean;
}

export interface ListUsersRequest {
  action: 'listUsers';
  orgId?: string; // optional — omit to list all users
}

export interface InviteUserRequest {
  action: 'inviteUser';
  email: string;
  orgId: string;
  role: 'admin' | 'staff';
  fullName?: string;
}

export interface RemoveUserRequest {
  action: 'removeUser';
  userId: string;
}

export type AdminRequest =
  | ListOrgsRequest
  | CreateOrgRequest
  | SuspendOrgRequest
  | ListUsersRequest
  | InviteUserRequest
  | RemoveUserRequest;

// ── Response types ───────────────────────────────────────────────────────────

export interface OrgSummary {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
  user_count: number;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  org_id: string;
  role: 'super_admin' | 'admin' | 'staff';
  created_at: string;
  updated_at: string;
}

export interface AdminSuccessResponse<T = unknown> {
  ok: true;
  data: T;
}

export interface AdminErrorResponse {
  ok: false;
  error: string;
}

export type AdminResponse<T = unknown> = AdminSuccessResponse<T> | AdminErrorResponse;
