import { useState, useEffect, useCallback } from 'react';
import type { SheetsConfig } from '../types/sheetsConfig';
import type { DraftRecord } from '../utils/db';
import { getSheetsConfig, getDraft } from '../utils/db';
import { logger } from '../utils/logger';
import { testConnection as apiTestConnection, syncAssessment, syncContract } from '../utils/sheetsApi';
import type { AssessmentFormData } from '../types/forms';
import type { ServiceContractFormData } from '../types/serviceContract';

export interface UseSheetsSync {
  config: SheetsConfig | null;
  loading: boolean;
  syncDraft: (draft: DraftRecord) => Promise<{ ok: boolean; error?: string }>;
  testConnection: (overrideConfig?: SheetsConfig) => Promise<{ ok: boolean; sheetTitle?: string; error?: string }>;
  refreshConfig: () => Promise<void>;
}

export function useSheetsSync(): UseSheetsSync {
  const [config, setConfig] = useState<SheetsConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshConfig = useCallback(async () => {
    try {
      const cfg = await getSheetsConfig();
      setConfig(cfg);
    } catch (err) {
      logger.error('Failed to load sheets config:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshConfig();
  }, [refreshConfig]);

  const testConnection = useCallback(
    async (overrideConfig?: SheetsConfig) => {
      const cfg = overrideConfig || config;
      if (!cfg) return { ok: false, error: 'Configuration not loaded' };
      return apiTestConnection(cfg);
    },
    [config],
  );

  const syncDraft = useCallback(
    async (draft: DraftRecord): Promise<{ ok: boolean; error?: string }> => {
      // Always fetch fresh config from IndexedDB to avoid stale state
      let freshConfig: SheetsConfig;
      try {
        freshConfig = await getSheetsConfig();
        setConfig(freshConfig); // Update React state too
      } catch {
        return { ok: false, error: 'Failed to load Sheets configuration' };
      }

      const hasAuth = freshConfig.authMethod === 'oauth'
        ? !!freshConfig.oauthAccessToken
        : !!freshConfig.apiKey;
      if (!freshConfig.spreadsheetId || !hasAuth) {
        return { ok: false, error: 'Google Sheets not configured' };
      }

      // Re-fetch draft from DB to get the latest saved version (avoids stale data)
      let freshDraft: DraftRecord;
      try {
        const fetched = await getDraft(draft.id);
        if (!fetched) {
          return { ok: false, error: `Draft "${draft.clientName}" not found in database. It may have been deleted.` };
        }
        freshDraft = fetched;
      } catch {
        // Fall back to the passed-in draft if DB read fails
        logger.warn('Failed to re-fetch draft from DB, using in-memory version');
        freshDraft = draft;
      }

      // Detect type from draft.type or fall back to data shape inspection
      const dataRecord = freshDraft.data as unknown as Record<string, unknown>;
      const hasServiceAgreement = !!dataRecord?.serviceAgreement;
      const hasClientHelpList = !!dataRecord?.clientHelpList;

      const isContract = freshDraft.type === 'serviceContract'
        || (!freshDraft.type && hasServiceAgreement);
      const isAssessment = freshDraft.type === 'assessment'
        || (!freshDraft.type && hasClientHelpList);

      logger.log('[SheetsSync] Draft type detection:', {
        id: freshDraft.id,
        storedType: freshDraft.type,
        hasServiceAgreement,
        hasClientHelpList,
        resolvedAs: isContract ? 'contract' : isAssessment ? 'assessment' : 'UNKNOWN',
        dataKeys: dataRecord ? Object.keys(dataRecord).slice(0, 8) : 'NO_DATA',
      });

      // Safety: reject if we can't determine the type
      if (!isContract && !isAssessment) {
        return { ok: false, error: `Unable to determine draft type. storedType=${freshDraft.type}, hasClientHelpList=${hasClientHelpList}, hasServiceAgreement=${hasServiceAgreement}. The draft data may be corrupted.` };
      }

      if (isContract) {
        return syncContract(freshConfig, freshDraft.data as ServiceContractFormData, freshConfig.baaConfirmed);
      }
      return syncAssessment(freshConfig, freshDraft.data as AssessmentFormData, freshConfig.baaConfirmed);
    },
    [config],
  );

  return { config, loading, syncDraft, testConnection, refreshConfig };
}
