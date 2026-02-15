/**
 * Netlify Function v2 — Shared App Configuration Endpoint
 *
 * Returns shared config from Netlify environment variables so all devices
 * load the same Google OAuth Client ID, allowed emails, sheet settings, etc.
 *
 * No sensitive data (tokens, API keys, passwords) is returned.
 *
 * Set EHC_CONFIG_ENABLED=true in Netlify dashboard to activate.
 */

interface SharedConfig {
  auth: {
    requireAuth: boolean;
    allowedEmails: string[];
    idleTimeoutMinutes: number;
  };
  sheets: {
    oauthClientId: string;
    spreadsheetId: string;
    assessmentSheetName: string;
    contractSheetName: string;
    authMethod: 'oauth' | 'apiKey';
    autoSyncOnSubmit: boolean;
    baaConfirmed: boolean;
    baaConfirmedDate?: string;
  };
  _meta: {
    source: 'netlify';
    timestamp: string;
  };
}

const VALID_TIMEOUTS = [5, 10, 15, 30];

function getEnv(key: string): string {
  // Netlify Functions v2: use Netlify.env.get() if available, fall back to process.env
  try {
    // @ts-expect-error Netlify global is injected at runtime
    return Netlify.env.get(key) || '';
  } catch {
    return process.env[key] || '';
  }
}

export default async (req: Request) => {
  // Only allow GET
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Master switch — must be explicitly enabled
  if (getEnv('EHC_CONFIG_ENABLED') !== 'true') {
    return new Response('Remote config not enabled', { status: 404 });
  }

  const allowedEmails = getEnv('EHC_ALLOWED_EMAILS')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

  const idleTimeout = parseInt(getEnv('EHC_IDLE_TIMEOUT_MINUTES') || '15', 10);
  const baaDate = getEnv('EHC_BAA_CONFIRMED_DATE');

  const config: SharedConfig = {
    auth: {
      requireAuth: getEnv('EHC_REQUIRE_AUTH') === 'true',
      allowedEmails,
      idleTimeoutMinutes: VALID_TIMEOUTS.includes(idleTimeout) ? idleTimeout : 15,
    },
    sheets: {
      oauthClientId: getEnv('EHC_OAUTH_CLIENT_ID'),
      spreadsheetId: getEnv('EHC_SPREADSHEET_ID'),
      assessmentSheetName: getEnv('EHC_ASSESSMENT_SHEET_NAME') || 'Assessments',
      contractSheetName: getEnv('EHC_CONTRACT_SHEET_NAME') || 'Contracts',
      authMethod: getEnv('EHC_AUTH_METHOD') === 'apiKey' ? 'apiKey' : 'oauth',
      autoSyncOnSubmit: getEnv('EHC_AUTO_SYNC_ON_SUBMIT') === 'true',
      baaConfirmed: getEnv('EHC_BAA_CONFIRMED') === 'true',
      ...(baaDate ? { baaConfirmedDate: baaDate } : {}),
    },
    _meta: {
      source: 'netlify',
      timestamp: new Date().toISOString(),
    },
  };

  return new Response(JSON.stringify(config), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
};

export const config = {
  path: '/api/config',
};
