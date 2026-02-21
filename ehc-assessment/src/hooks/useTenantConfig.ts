/**
 * Hook to read/write per-org configuration from the Supabase `app_config` table.
 *
 * Config types: auth, sheets, email, branding.
 * Each org has at most one row per config_type (UNIQUE index on org_id + config_type).
 *
 * Graceful fallback: returns null for all types when Supabase is not configured
 * or when no row exists for the requested type.
 *
 * Writes are protected by RLS — only admin and super_admin can update.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getSupabaseClient, isSupabaseConfigured } from '../utils/supabaseClient';
import { logger } from '../utils/logger';
import type { TenantConfigType, TenantConfigMap, UseTenantConfigReturn } from '../types/tenantConfig';
import type { AppConfigRow } from '../types/supabase';

interface ConfigCache {
  [key: string]: Record<string, unknown> | null;
}

export function useTenantConfig(orgId: string | null): UseTenantConfigReturn {
  const [configs, setConfigs] = useState<ConfigCache>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedOrgRef = useRef<string | null>(null);

  const fetchConfigs = useCallback(async () => {
    if (!isSupabaseConfigured() || !orgId) return;

    const sb = getSupabaseClient();
    if (!sb) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await sb
        .from('app_config')
        .select('config_type, config_data')
        .eq('org_id', orgId);

      if (fetchError) {
        logger.error('[TenantConfig] Failed to fetch:', fetchError.message);
        setError(`Failed to load config: ${fetchError.message}`);
        return;
      }

      const cache: ConfigCache = {};
      for (const row of (data as Pick<AppConfigRow, 'config_type' | 'config_data'>[]) || []) {
        cache[row.config_type] = row.config_data;
      }
      setConfigs(cache);
      fetchedOrgRef.current = orgId;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      logger.error('[TenantConfig] Fetch failed:', msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  // Fetch on mount and when orgId changes
  useEffect(() => {
    if (orgId && orgId !== fetchedOrgRef.current) {
      fetchConfigs();
    }
  }, [orgId, fetchConfigs]);

  const getConfig = useCallback(<K extends TenantConfigType>(type: K): TenantConfigMap[K] | null => {
    if (!isSupabaseConfigured() || !orgId) return null;
    const data = configs[type];
    return (data as TenantConfigMap[K]) ?? null;
  }, [configs, orgId]);

  const setConfig = useCallback(async <K extends TenantConfigType>(
    type: K,
    data: TenantConfigMap[K],
  ): Promise<void> => {
    if (!isSupabaseConfigured() || !orgId) {
      throw new Error('Supabase not configured or no org context');
    }

    const sb = getSupabaseClient();
    if (!sb) throw new Error('Supabase client not available');

    setError(null);

    // Upsert: try update first, then insert if no row exists
    const { data: existing } = await sb
      .from('app_config')
      .select('id')
      .eq('org_id', orgId)
      .eq('config_type', type)
      .maybeSingle();

    if (existing) {
      // Update existing row
      const { error: updateError } = await sb
        .from('app_config')
        .update({ config_data: data as Record<string, unknown> })
        .eq('org_id', orgId)
        .eq('config_type', type);

      if (updateError) {
        const msg = `Failed to update ${type} config: ${updateError.message}`;
        logger.error('[TenantConfig]', msg);
        setError(msg);
        throw new Error(msg);
      }
    } else {
      // Insert new row
      const { error: insertError } = await sb
        .from('app_config')
        .insert({
          org_id: orgId,
          config_type: type,
          config_data: data as Record<string, unknown>,
          updated_by: null,
        });

      if (insertError) {
        const msg = `Failed to save ${type} config: ${insertError.message}`;
        logger.error('[TenantConfig]', msg);
        setError(msg);
        throw new Error(msg);
      }
    }

    // Update local cache
    setConfigs(prev => ({ ...prev, [type]: data as Record<string, unknown> }));
    logger.log(`[TenantConfig] Saved ${type} config for org ${orgId}`);
  }, [orgId]);

  const refresh = useCallback(async () => {
    fetchedOrgRef.current = null; // force re-fetch
    await fetchConfigs();
  }, [fetchConfigs]);

  return { getConfig, setConfig, loading, error, refresh };
}
