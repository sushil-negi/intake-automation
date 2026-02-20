/**
 * Supabase database type definitions.
 *
 * These types mirror the Postgres schema and are used by supabase-js
 * for type-safe queries.  In a mature setup these would be generated
 * via `supabase gen types typescript`, but we hand-maintain them here
 * to avoid a build-time dependency on the Supabase CLI.
 */

// ── Row types (what SELECT returns) ─────────────────────────────────────────

export interface OrganizationRow {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface ProfileRow {
  id: string;          // matches auth.users.id
  email: string;
  full_name: string;
  avatar_url: string;
  org_id: string;
  role: 'admin' | 'staff';
  created_at: string;
  updated_at: string;
}

export interface DraftRow {
  id: string;
  org_id: string;
  client_name: string;
  type: 'assessment' | 'serviceContract';
  status: 'draft' | 'submitted';
  current_step: number;
  linked_assessment_id: string | null;
  form_data: Record<string, unknown>;   // JSONB — typed loosely, cast at usage
  version: number;
  locked_by: string | null;
  locked_at: string | null;
  lock_device_id: string | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLogRow {
  id: number;
  org_id: string;
  user_email: string;
  action: string;
  resource: string | null;
  details: string | null;
  status: 'success' | 'failure' | 'info';
  device_id: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface AppConfigRow {
  id: string;
  org_id: string;
  config_type: 'auth' | 'sheets' | 'email';
  config_data: Record<string, unknown>;
  updated_by: string | null;
  updated_at: string;
}

// ── Insert types (what INSERT expects) ──────────────────────────────────────

export interface DraftInsert {
  id?: string;
  org_id: string;
  client_name: string;
  type: 'assessment' | 'serviceContract';
  status?: 'draft' | 'submitted';
  current_step?: number;
  linked_assessment_id?: string | null;
  form_data: Record<string, unknown>;
  created_by: string;
  updated_by?: string | null;
}

export interface DraftUpdate {
  client_name?: string;
  status?: 'draft' | 'submitted';
  current_step?: number;
  linked_assessment_id?: string | null;
  form_data?: Record<string, unknown>;
  updated_by?: string | null;
}

export interface AuditLogInsert {
  org_id: string;
  user_email: string;
  action: string;
  resource?: string | null;
  details?: string | null;
  status?: 'success' | 'failure' | 'info';
  device_id?: string | null;
}

// ── Supabase Database type map (for createClient<Database>) ────────────────

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: OrganizationRow;
        Insert: Omit<OrganizationRow, 'id' | 'created_at'> & { id?: string };
        Update: Partial<Omit<OrganizationRow, 'id' | 'created_at'>>;
      };
      profiles: {
        Row: ProfileRow;
        Insert: Omit<ProfileRow, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ProfileRow, 'id' | 'created_at'>>;
      };
      drafts: {
        Row: DraftRow;
        Insert: DraftInsert;
        Update: DraftUpdate;
      };
      audit_logs: {
        Row: AuditLogRow;
        Insert: AuditLogInsert;
        Update: never;
      };
      app_config: {
        Row: AppConfigRow;
        Insert: Omit<AppConfigRow, 'id' | 'updated_at'> & { id?: string };
        Update: Partial<Pick<AppConfigRow, 'config_data' | 'updated_by'>>;
      };
    };
    Functions: {
      acquire_draft_lock: {
        Args: { p_draft_id: string; p_user_id: string; p_device_id: string };
        Returns: boolean;
      };
      release_draft_lock: {
        Args: { p_draft_id: string; p_user_id: string };
        Returns: void;
      };
      release_stale_locks: {
        Args: Record<string, never>;
        Returns: void;
      };
    };
  };
}
