/**
 * Supabase database type definitions.
 *
 * These types mirror the Postgres schema and are used by supabase-js
 * for type-safe queries.  In a mature setup these would be generated
 * via `supabase gen types typescript`, but we hand-maintain them here
 * to avoid a build-time dependency on the Supabase CLI.
 *
 * IMPORTANT: @supabase/supabase-js v2.97+ requires Database['public'] to
 * satisfy `GenericSchema` = { Tables, Views, Functions }.  Each table's
 * Row / Insert / Update must satisfy `Record<string, unknown>`.  TypeScript
 * interfaces do NOT have implicit index signatures in strict mode, so we
 * use `type` aliases (not `interface`) for all Row/Insert/Update shapes.
 * This ensures compatibility across all TS strictness levels.
 */

// ── Row types (what SELECT returns) ─────────────────────────────────────────

export type OrganizationRow = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
};

export type ProfileRow = {
  id: string;          // matches auth.users.id
  email: string;
  full_name: string;
  avatar_url: string;
  org_id: string;
  role: 'super_admin' | 'admin' | 'staff';
  created_at: string;
  updated_at: string;
};

export type DraftRow = {
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
};

export type AuditLogRow = {
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
};

export type AppConfigRow = {
  id: string;
  org_id: string;
  config_type: 'auth' | 'sheets' | 'email' | 'branding';
  config_data: Record<string, unknown>;
  updated_by: string | null;
  updated_at: string;
};

// ── Insert types (what INSERT expects) ──────────────────────────────────────

export type DraftInsert = {
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
};

export type DraftUpdate = {
  client_name?: string;
  status?: 'draft' | 'submitted';
  current_step?: number;
  linked_assessment_id?: string | null;
  form_data?: Record<string, unknown>;
  updated_by?: string | null;
};

export type AuditLogInsert = {
  org_id: string;
  user_email: string;
  action: string;
  resource?: string | null;
  details?: string | null;
  status?: 'success' | 'failure' | 'info';
  device_id?: string | null;
};

// ── Supabase Database type map (for createClient<Database>) ────────────────
//
// The `public` schema must satisfy @supabase/supabase-js's `GenericSchema`:
//   { Tables: Record<string, GenericTable>; Views: Record<string, GenericView>; Functions: Record<string, GenericFunction> }
// where GenericTable = { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: ... }
//
// Using `type` aliases (not `interface`) ensures all Row/Insert/Update types
// carry an implicit index signature and satisfy Record<string, unknown>.

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: OrganizationRow;
        Insert: Omit<OrganizationRow, 'id' | 'created_at'> & { id?: string };
        Update: Partial<Omit<OrganizationRow, 'id' | 'created_at'>>;
        Relationships: [];
      };
      profiles: {
        Row: ProfileRow;
        Insert: Omit<ProfileRow, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ProfileRow, 'id' | 'created_at'>>;
        Relationships: [];
      };
      drafts: {
        Row: DraftRow;
        Insert: DraftInsert;
        Update: DraftUpdate;
        Relationships: [];
      };
      audit_logs: {
        Row: AuditLogRow;
        Insert: AuditLogInsert;
        Update: Record<string, unknown>;  // audit logs are append-only
        Relationships: [];
      };
      app_config: {
        Row: AppConfigRow;
        Insert: Omit<AppConfigRow, 'id' | 'updated_at'> & { id?: string };
        Update: Partial<Pick<AppConfigRow, 'config_data' | 'updated_by'>>;
        Relationships: [];
      };
    };
    Views: {
      org_summary: {
        Row: {
          id: string;
          name: string;
          slug: string;
          is_active: boolean;
          user_count: number;
          created_at: string;
        };
        Relationships: [];
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
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
