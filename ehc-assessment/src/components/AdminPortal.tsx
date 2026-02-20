/**
 * Super-admin portal for managing organizations and users.
 *
 * Only accessible to users with role === 'super_admin'.
 * Uses the useAdminApi hook to call the admin Netlify Function.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAdminApi } from '../hooks/useAdminApi';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { useBranding } from '../contexts/BrandingContext';
import { useTenantConfig } from '../hooks/useTenantConfig';
import { BrandingEditor } from './BrandingEditor';
import { AccordionSection } from './ui/AccordionSection';
import type { OrgSummary, UserProfile } from '../types/admin';

interface AdminPortalProps {
  onGoHome: () => void;
}

// ── Slug helpers ─────────────────────────────────────────────────────────────

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function isValidSlug(slug: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?$/.test(slug);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ── Sub-views ────────────────────────────────────────────────────────────────

type AdminView =
  | { tab: 'orgs' }
  | { tab: 'orgDetail'; org: OrgSummary }
  | { tab: 'createOrg' };

// ── Component ────────────────────────────────────────────────────────────────

export function AdminPortal({ onGoHome }: AdminPortalProps) {
  const branding = useBranding();
  const api = useAdminApi();

  const [adminView, setAdminView] = useState<AdminView>({ tab: 'orgs' });
  const [orgs, setOrgs] = useState<OrgSummary[]>([]);
  const [initialLoad, setInitialLoad] = useState(true);

  // Load orgs on mount
  const refreshOrgs = useCallback(async () => {
    const list = await api.listOrgs();
    setOrgs(list);
    setInitialLoad(false);
  }, [api.listOrgs]);

  useEffect(() => {
    refreshOrgs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-sky-50/60 dark:bg-slate-900 relative">
      {/* Background watermark */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `url(${branding.logoUrl})`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center center',
          backgroundSize: 'clamp(280px, 55vw, 700px) auto',
          opacity: 0.06,
        }}
      />

      {/* Header */}
      <header
        className="sticky top-0 z-10 shadow-md"
        style={{ background: 'var(--brand-gradient)' }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={branding.logoUrl}
              alt={branding.companyName}
              className="h-10 sm:h-14 w-auto object-contain brightness-0 invert flex-shrink-0"
            />
            <span className="text-white/70 text-xs font-medium hidden sm:inline">
              Super Admin
            </span>
          </div>
          <div className="flex items-center gap-2">
            {adminView.tab !== 'orgs' && (
              <button
                type="button"
                onClick={() => setAdminView({ tab: 'orgs' })}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-white/20 text-white/80 hover:bg-white/10 transition-all min-h-[36px]"
              >
                ← All Orgs
              </button>
            )}
            <button
              type="button"
              onClick={onGoHome}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-white/20 text-white/80 hover:bg-white/10 transition-all min-h-[36px]"
            >
              Home
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 pb-8 relative z-[1]">
        {/* Error banner */}
        {api.error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-center justify-between">
            <p className="text-sm text-red-700 dark:text-red-300">{api.error}</p>
            <button
              type="button"
              onClick={api.clearError}
              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-200 text-xs font-medium"
            >
              Dismiss
            </button>
          </div>
        )}

        {adminView.tab === 'orgs' && (
          <OrgList
            orgs={orgs}
            loading={initialLoad && api.loading}
            onSelectOrg={(org) => setAdminView({ tab: 'orgDetail', org })}
            onCreateOrg={() => setAdminView({ tab: 'createOrg' })}
          />
        )}

        {adminView.tab === 'createOrg' && (
          <CreateOrgForm
            loading={api.loading}
            onSubmit={async (name, slug) => {
              await api.createOrg(name, slug);
              await refreshOrgs();
              setAdminView({ tab: 'orgs' });
            }}
            onCancel={() => setAdminView({ tab: 'orgs' })}
          />
        )}

        {adminView.tab === 'orgDetail' && (
          <OrgDetail
            org={adminView.org}
            api={api}
            onBack={() => setAdminView({ tab: 'orgs' })}
            onOrgUpdated={async () => {
              await refreshOrgs();
              // Re-fetch the updated org
              const updated = (await api.listOrgs()).find(o => o.id === adminView.org.id);
              if (updated) setAdminView({ tab: 'orgDetail', org: updated });
              else setAdminView({ tab: 'orgs' });
            }}
          />
        )}
      </main>
    </div>
  );
}

// ── Org List ─────────────────────────────────────────────────────────────────

interface OrgListProps {
  orgs: OrgSummary[];
  loading: boolean;
  onSelectOrg: (org: OrgSummary) => void;
  onCreateOrg: () => void;
}

function OrgList({ orgs, loading, onSelectOrg, onCreateOrg }: OrgListProps) {
  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-[var(--brand-primary)] dark:text-slate-100">
          🛡️ Tenant Administration
        </h1>
        <button
          type="button"
          onClick={onCreateOrg}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-[var(--brand-primary)] dark:bg-slate-600 text-white hover:opacity-90 dark:hover:bg-slate-500 transition-colors min-h-[36px]"
        >
          + New Organization
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500 dark:text-slate-400 text-sm">
          Loading organizations…
        </div>
      ) : orgs.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-slate-400 text-sm mb-4">
            No organizations yet. Create your first one to get started.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
          {/* Table header */}
          <div className="hidden sm:grid sm:grid-cols-[1fr_120px_80px_80px_100px] gap-2 px-4 py-2.5 bg-gray-50 dark:bg-slate-700/50 text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">
            <span>Organization</span>
            <span>Slug</span>
            <span className="text-center">Users</span>
            <span className="text-center">Status</span>
            <span className="text-right">Created</span>
          </div>

          {/* Rows */}
          {orgs.map(org => (
            <button
              key={org.id}
              type="button"
              onClick={() => onSelectOrg(org)}
              className="w-full text-left px-4 py-3 sm:grid sm:grid-cols-[1fr_120px_80px_80px_100px] sm:gap-2 sm:items-center flex flex-col gap-1 border-t border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors group"
            >
              <span className="font-medium text-sm text-gray-900 dark:text-slate-100 group-hover:text-[var(--brand-primary)] dark:group-hover:text-white truncate">
                {org.name}
              </span>
              <span className="text-xs text-gray-500 dark:text-slate-400 font-mono truncate">
                {org.slug}
              </span>
              <span className="text-xs text-gray-600 dark:text-slate-300 sm:text-center">
                <span className="sm:hidden text-gray-400 dark:text-slate-500">Users: </span>
                {org.user_count}
              </span>
              <span className="sm:text-center">
                <span
                  className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
                    org.is_active
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                  }`}
                >
                  {org.is_active ? 'Active' : 'Suspended'}
                </span>
              </span>
              <span className="text-xs text-gray-400 dark:text-slate-500 sm:text-right">
                {new Date(org.created_at).toLocaleDateString()}
              </span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

// ── Create Org Form ──────────────────────────────────────────────────────────

interface CreateOrgFormProps {
  loading: boolean;
  onSubmit: (name: string, slug: string) => Promise<void>;
  onCancel: () => void;
}

function CreateOrgForm({ loading, onSubmit, onCancel }: CreateOrgFormProps) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [formError, setFormError] = useState('');

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slugEdited) {
      setSlug(toSlug(val));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) {
      setFormError('Organization name is required.');
      return;
    }
    if (!slug.trim() || !isValidSlug(slug)) {
      setFormError('Slug must be lowercase alphanumeric with hyphens (e.g., "ehc-delaware").');
      return;
    }

    try {
      await onSubmit(name.trim(), slug.trim());
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create organization.');
    }
  };

  return (
    <>
      <h1 className="text-xl sm:text-2xl font-bold text-[var(--brand-primary)] dark:text-slate-100 mb-6">
        Create Organization
      </h1>

      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-5 sm:p-6 max-w-lg"
      >
        {formError && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-sm text-red-700 dark:text-red-300">{formError}</p>
          </div>
        )}

        <div className="mb-4">
          <label htmlFor="org-name" className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
            Organization Name
          </label>
          <input
            id="org-name"
            type="text"
            value={name}
            onChange={e => handleNameChange(e.target.value)}
            placeholder="EHC of Delaware County"
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white dark:bg-slate-800 dark:text-slate-100"
            maxLength={100}
            autoFocus
          />
        </div>

        <div className="mb-6">
          <label htmlFor="org-slug" className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
            Slug (URL-friendly identifier)
          </label>
          <input
            id="org-slug"
            type="text"
            value={slug}
            onChange={e => { setSlug(e.target.value); setSlugEdited(true); }}
            placeholder="ehc-delaware"
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white dark:bg-slate-800 dark:text-slate-100 font-mono"
            maxLength={48}
          />
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
            Lowercase letters, numbers, and hyphens only.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg bg-[var(--brand-primary)] dark:bg-slate-600 text-white hover:opacity-90 dark:hover:bg-slate-500 transition-colors disabled:opacity-50 min-h-[44px]"
          >
            {loading ? 'Creating…' : 'Create Organization'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 text-sm font-medium rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors min-h-[44px]"
          >
            Cancel
          </button>
        </div>
      </form>
    </>
  );
}

// ── Org Detail (users, invite, suspend) ──────────────────────────────────────

interface OrgDetailProps {
  org: OrgSummary;
  api: ReturnType<typeof useAdminApi>;
  onBack: () => void;
  onOrgUpdated: () => Promise<void>;
}

function OrgDetail({ org, api, onBack, onOrgUpdated }: OrgDetailProps) {
  const tenantConfig = useTenantConfig(org.id);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [confirmAction, setConfirmAction] = useState<
    | { type: 'suspend' }
    | { type: 'removeUser'; user: UserProfile }
    | null
  >(null);

  const refreshUsers = useCallback(async () => {
    setUsersLoading(true);
    const list = await api.listUsers(org.id);
    setUsers(list);
    setUsersLoading(false);
  }, [api.listUsers, org.id]);

  useEffect(() => {
    refreshUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org.id]);

  const handleSuspendToggle = async () => {
    await api.suspendOrg(org.id, org.is_active);
    setConfirmAction(null);
    await onOrgUpdated();
  };

  const handleRemoveUser = async (userId: string) => {
    await api.removeUser(userId);
    setConfirmAction(null);
    await refreshUsers();
    await onOrgUpdated();
  };

  return (
    <>
      {/* Org header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="text-xs text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 mb-2 flex items-center gap-1"
          >
            ← Back to Organizations
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--brand-primary)] dark:text-slate-100">
            {org.name}
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 font-mono mt-0.5">
            {org.slug}
          </p>
        </div>
        <span
          className={`text-xs px-2.5 py-1 rounded-full font-medium mt-1 ${
            org.is_active
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
          }`}
        >
          {org.is_active ? 'Active' : 'Suspended'}
        </span>
      </div>

      {/* Org actions */}
      <div className="flex gap-3 mb-6">
        <button
          type="button"
          onClick={() => setConfirmAction({ type: 'suspend' })}
          disabled={api.loading}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors min-h-[36px] ${
            org.is_active
              ? 'border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
              : 'border border-green-300 dark:border-green-700 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
          }`}
        >
          {org.is_active ? 'Suspend Organization' : 'Reactivate Organization'}
        </button>
      </div>

      {/* Invite user */}
      <InviteUserForm
        orgId={org.id}
        loading={api.loading}
        onInvite={async (email, role, fullName) => {
          await api.inviteUser(email, org.id, role, fullName);
          await refreshUsers();
          await onOrgUpdated();
        }}
      />

      {/* User list */}
      <div className="mt-6">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-3 flex items-center gap-2">
          Users
          <span className="text-xs font-normal text-gray-400 dark:text-slate-500">
            ({users.length})
          </span>
        </h2>

        {usersLoading ? (
          <div className="text-center py-8 text-gray-500 dark:text-slate-400 text-sm">
            Loading users…
          </div>
        ) : users.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 text-center">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              No users in this organization yet. Invite one above.
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
            {/* Table header */}
            <div className="hidden sm:grid sm:grid-cols-[1fr_1fr_80px_60px] gap-2 px-4 py-2.5 bg-gray-50 dark:bg-slate-700/50 text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">
              <span>Name</span>
              <span>Email</span>
              <span className="text-center">Role</span>
              <span className="text-right">Actions</span>
            </div>

            {users.map(user => (
              <div
                key={user.id}
                className="px-4 py-3 sm:grid sm:grid-cols-[1fr_1fr_80px_60px] sm:gap-2 sm:items-center flex flex-col gap-1 border-t border-gray-100 dark:border-slate-700"
              >
                <div className="flex items-center gap-2">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt=""
                      className="w-6 h-6 rounded-full border border-gray-200 dark:border-slate-600 flex-shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-slate-600 flex-shrink-0" />
                  )}
                  <span className="text-sm text-gray-900 dark:text-slate-100 truncate">
                    {user.full_name || '—'}
                  </span>
                </div>
                <span className="text-xs text-gray-500 dark:text-slate-400 truncate">
                  {user.email}
                </span>
                <span className="sm:text-center">
                  <span
                    className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
                      user.role === 'admin'
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : user.role === 'super_admin'
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                          : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300'
                    }`}
                  >
                    {user.role === 'super_admin' ? 'super' : user.role}
                  </span>
                </span>
                <div className="sm:text-right">
                  {user.role !== 'super_admin' && (
                    <button
                      type="button"
                      onClick={() => setConfirmAction({ type: 'removeUser', user })}
                      className="text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Branding — super-admin can configure during onboarding */}
      <div className="mt-6">
        <AccordionSection title="Branding">
          <div className="space-y-3">
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Customize this organization's logo, colors, and company name. Changes are reflected in the app UI and PDF documents for all users in this org.
            </p>
            <BrandingEditor
              tenantConfig={tenantConfig}
              isSuperAdmin={true}
            />
          </div>
        </AccordionSection>
      </div>

      {/* Confirmation dialogs */}
      {confirmAction?.type === 'suspend' && (
        <ConfirmDialog
          title={org.is_active ? 'Suspend Organization?' : 'Reactivate Organization?'}
          message={
            org.is_active
              ? `Users in "${org.name}" will no longer be able to access the application. You can reactivate it later.`
              : `Users in "${org.name}" will regain access to the application.`
          }
          actions={[
            {
              label: org.is_active ? 'Suspend' : 'Reactivate',
              variant: org.is_active ? 'danger' : 'primary',
              onClick: handleSuspendToggle,
            },
            { label: 'Cancel', variant: 'secondary', onClick: () => setConfirmAction(null) },
          ]}
          onClose={() => setConfirmAction(null)}
        />
      )}

      {confirmAction?.type === 'removeUser' && (
        <ConfirmDialog
          title="Remove User?"
          message={`Remove ${confirmAction.user.email} from "${org.name}"? They will lose access to this organization's data.`}
          actions={[
            {
              label: 'Remove',
              variant: 'danger',
              onClick: () => handleRemoveUser(confirmAction.user.id),
            },
            { label: 'Cancel', variant: 'secondary', onClick: () => setConfirmAction(null) },
          ]}
          onClose={() => setConfirmAction(null)}
        />
      )}
    </>
  );
}

// ── Invite User Form ─────────────────────────────────────────────────────────

interface InviteUserFormProps {
  orgId: string;
  loading: boolean;
  onInvite: (email: string, role: 'admin' | 'staff', fullName?: string) => Promise<void>;
}

function InviteUserForm({ orgId: _orgId, loading, onInvite }: InviteUserFormProps) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'admin' | 'staff'>('staff');
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSuccess('');

    if (!email.trim() || !isValidEmail(email.trim())) {
      setFormError('Please enter a valid email address.');
      return;
    }

    try {
      await onInvite(email.trim(), role, fullName.trim() || undefined);
      setSuccess(`Invited ${email.trim()} as ${role}.`);
      setEmail('');
      setFullName('');
      setRole('staff');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to invite user.');
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-4 sm:p-5">
      <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-3">
        Invite User
      </h2>

      {formError && (
        <div className="mb-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-2.5">
          <p className="text-xs text-red-700 dark:text-red-300">{formError}</p>
        </div>
      )}

      {success && (
        <div className="mb-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-2.5">
          <p className="text-xs text-green-700 dark:text-green-300">{success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <label htmlFor="invite-email" className="sr-only">Email</label>
          <input
            id="invite-email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="user@example.com"
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white dark:bg-slate-800 dark:text-slate-100"
            maxLength={254}
          />
        </div>
        <div className="sm:w-40">
          <label htmlFor="invite-name" className="sr-only">Full Name (optional)</label>
          <input
            id="invite-name"
            type="text"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            placeholder="Full Name"
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white dark:bg-slate-800 dark:text-slate-100"
            maxLength={100}
          />
        </div>
        <div className="sm:w-28">
          <label htmlFor="invite-role" className="sr-only">Role</label>
          <select
            id="invite-role"
            value={role}
            onChange={e => setRole(e.target.value as 'admin' | 'staff')}
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-[var(--brand-primary)] dark:bg-slate-600 text-white hover:opacity-90 dark:hover:bg-slate-500 transition-colors disabled:opacity-50 min-h-[38px] whitespace-nowrap"
        >
          {loading ? 'Inviting…' : 'Invite'}
        </button>
      </form>
    </div>
  );
}
