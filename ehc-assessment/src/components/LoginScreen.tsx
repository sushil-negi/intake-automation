import { useEffect, useRef, useState } from 'react';
import { initGoogleSignIn, isGsiIdLoaded } from '../utils/googleAuth';
import { logAudit } from '../utils/auditLog';
import type { AuthUser } from '../types/auth';
import { LoadingSpinner } from './ui/LoadingSpinner';

interface LoginScreenProps {
  clientId: string;
  allowedEmails: string[];
  onLogin: (user: AuthUser) => void;
}

export function LoginScreen({ clientId, allowedEmails, onLogin }: LoginScreenProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const [gsiReady, setGsiReady] = useState(isGsiIdLoaded());

  // Poll for GIS library readiness (it loads async)
  useEffect(() => {
    if (gsiReady) return;
    const interval = setInterval(() => {
      if (isGsiIdLoaded()) {
        setGsiReady(true);
        clearInterval(interval);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [gsiReady]);

  // Initialize Google Sign-In once GIS is ready and buttonRef is available
  useEffect(() => {
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
  }, [gsiReady, clientId, allowedEmails, onLogin]);

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

          {!clientId ? (
            <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
              <p className="text-xs text-amber-800 dark:text-amber-300">
                <strong>Setup required:</strong> An OAuth Client ID has not been configured yet.
                An administrator needs to set up the OAuth Client ID in Settings before sign-in can work.
              </p>
            </div>
          ) : !gsiReady ? (
            <LoadingSpinner message="Loading Google Sign-In..." size="sm" />
          ) : (
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
