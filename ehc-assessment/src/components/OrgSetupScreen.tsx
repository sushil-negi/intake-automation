/**
 * Shown when a user signs in via Supabase but has no profile or no org_id.
 *
 * - Regular users see "Contact your administrator"
 * - Super-admins see a link to the Admin Portal
 */

import type { AuthUser } from '../types/auth';
import type { AppView } from '../types/navigation';

interface OrgSetupScreenProps {
  authUser: AuthUser;
  isSuperAdmin: boolean;
  onNavigate: (view: AppView) => void;
  onSignOut: () => void;
}

export function OrgSetupScreen({ authUser, isSuperAdmin, onNavigate, onSignOut }: OrgSetupScreenProps) {
  return (
    <div className="min-h-screen bg-sky-50/60 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 sm:p-8 text-center">
        {/* Logo */}
        <img
          src="/ehc-watermark-h.png"
          alt="Executive Home Care"
          className="h-16 mx-auto mb-6 object-contain dark:brightness-0 dark:invert"
        />

        <h1 className="text-xl font-bold text-[#1a3a4a] dark:text-slate-100 mb-2">
          Account Setup Required
        </h1>

        {/* User info */}
        <div className="flex items-center justify-center gap-3 mb-6">
          {authUser.picture && (
            <img
              src={authUser.picture}
              alt=""
              className="w-10 h-10 rounded-full border-2 border-gray-200 dark:border-slate-600"
              referrerPolicy="no-referrer"
            />
          )}
          <div className="text-left">
            <div className="text-sm font-medium text-gray-900 dark:text-slate-100">
              {authUser.name}
            </div>
            <div className="text-xs text-gray-500 dark:text-slate-400">
              {authUser.email}
            </div>
          </div>
        </div>

        {isSuperAdmin ? (
          <>
            <p className="text-sm text-gray-600 dark:text-slate-300 mb-6">
              You&apos;re signed in as a <strong>Super Admin</strong>. You can create
              organizations and invite users from the Admin Portal.
            </p>
            <button
              type="button"
              onClick={() => onNavigate({ screen: 'admin' })}
              className="w-full px-4 py-3 bg-[#1a3a4a] text-white font-medium rounded-lg hover:bg-[#1f4f5f] transition-colors min-h-[44px]"
            >
              🛡️ Go to Admin Portal
            </button>
          </>
        ) : (
          <>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Your account has not been assigned to an organization yet.
                Please contact your administrator to get access.
              </p>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
              Once an administrator adds your email to an organization,
              sign in again to access the application.
            </p>
          </>
        )}

        <button
          type="button"
          onClick={onSignOut}
          className="mt-4 px-4 py-2.5 text-sm font-medium rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors min-h-[44px] w-full"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
