import { useEffect, useRef, useState } from 'react';
import { initGoogleSignIn, isGsiIdLoaded } from '../utils/googleAuth';
import { isSupabaseConfigured, getSupabaseClient } from '../utils/supabaseClient';
import { logAudit } from '../utils/auditLog';
import { logger } from '../utils/logger';
import type { AuthUser } from '../types/auth';
import { LoadingSpinner } from './ui/LoadingSpinner';

interface LoginScreenProps {
  clientId: string;
  allowedEmails: string[];
  onLogin: (user: AuthUser) => void;
  /** When true, the Supabase OAuth redirect is being processed. */
  supabaseLoading?: boolean;
}

export function LoginScreen({ clientId, allowedEmails, onLogin, supabaseLoading }: LoginScreenProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const [gsiReady, setGsiReady] = useState(isGsiIdLoaded());
  const [supabaseSigningIn, setSupabaseSigningIn] = useState(false);
  const useSupabase = isSupabaseConfigured();

  // Poll for GIS library readiness (it loads async) — only needed for legacy GIS flow
  useEffect(() => {
    if (useSupabase || gsiReady) return;
    const interval = setInterval(() => {
      if (isGsiIdLoaded()) {
        setGsiReady(true);
        clearInterval(interval);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [gsiReady, useSupabase]);

  // Initialize Google Sign-In via GIS — only when Supabase is NOT configured
  useEffect(() => {
    if (useSupabase) return;
    if (!gsiReady || !buttonRef.current || !clientId) return;

    initGoogleSignIn(
      clientId,
      (user) => {
        // Check allowed emails if list is non-empty
        if (allowedEmails.length > 0) {
          const emailLower = user.email.toLowerCase();
          const isAllowed = allowedEmails.some(e => e.toLowerCase() === emailLower);
          if (!isAllowed) {
            logAudit('login', 'authentication', `Unauthorized email: ${user.email}`, 'failure', user.email);
            setError(`Access denied for ${user.email}. Contact your administrator to be added as an authorized user.`);
            return;
          }
        }
        setError('');
        onLogin(user);
      },
      (err) => setError(err),
      buttonRef.current,
    );
  }, [gsiReady, clientId, allowedEmails, onLogin, useSupabase]);

  // Supabase OAuth: redirect to Google via Supabase Auth
  const handleSupabaseGoogleSignIn = async () => {
    const sb = getSupabaseClient();
    if (!sb) {
      setError('Supabase client not configured');
      return;
    }
    setSupabaseSigningIn(true);
    setError('');
    try {
      const { error: oauthError } = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (oauthError) {
        logger.error('Supabase Google sign-in failed:', oauthError.message);
        setError(oauthError.message);
        setSupabaseSigningIn(false);
      }
      // If successful, browser redirects to Google → back to our app.
      // The redirect callback is handled in App.tsx via useSupabaseAuth.
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign-in failed';
      setError(msg);
      setSupabaseSigningIn(false);
    }
  };

  const isProcessing = supabaseLoading || supabaseSigningIn;

  return (
    <div className="min-h-screen bg-sky-50/60 dark:bg-slate-900 relative flex flex-col">
      {/* Background watermark */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: 'url(/ehc-watermark-h.png)',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center center',
          backgroundSize: 'clamp(280px, 55vw, 700px) auto',
          opacity: 0.06,
        }}
      />

      {/* Header */}
      <header className="sticky top-0 z-10 shadow-md" style={{ background: 'linear-gradient(135deg, #1a3a4a 0%, #1f4f5f 50%, #1a3a4a 100%)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-center">
          <img
            src="/ehc-watermark-h.png"
            alt="Executive Home Care of Chester County"
            className="h-10 sm:h-14 w-auto object-contain brightness-0 invert"
          />
        </div>
      </header>

      {/* Login Card */}
      <main className="flex-1 flex items-center justify-center px-4 relative z-[1]">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-200 dark:border-slate-700 p-8 w-full max-w-sm text-center space-y-6">
          <div>
            <h1 className="text-xl font-bold text-[#1a3a4a] dark:text-slate-100">
              Sign In
            </h1>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
              Sign in with your Google account to continue
            </p>
          </div>

          {isProcessing ? (
            <LoadingSpinner message="Signing in..." size="sm" />
          ) : useSupabase ? (
            /* ── Supabase OAuth flow ── */
            <button
              type="button"
              onClick={handleSupabaseGoogleSignIn}
              className="inline-flex items-center justify-center gap-3 w-full max-w-[300px] mx-auto px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors text-sm font-medium text-gray-700 dark:text-slate-200 shadow-sm"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Sign in with Google
            </button>
          ) : !clientId ? (
            <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
              <p className="text-xs text-amber-800 dark:text-amber-300">
                <strong>Setup required:</strong> An OAuth Client ID has not been configured yet.
                An administrator needs to set up the OAuth Client ID in Settings before sign-in can work.
              </p>
            </div>
          ) : !gsiReady ? (
            <LoadingSpinner message="Loading Google Sign-In..." size="sm" />
          ) : (
            /* ── Legacy GIS flow ── */
            <div className="flex justify-center">
              <div ref={buttonRef} />
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          <p className="text-[11px] text-gray-500 dark:text-slate-400">
            Only authorized users can access this application.
            Contact your administrator if you need access.
          </p>
        </div>
      </main>
    </div>
  );
}
