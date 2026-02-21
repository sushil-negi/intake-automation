/**
 * Admin UI for editing per-org branding stored in Supabase `app_config`.
 *
 * Features: company name, logo upload (drag-and-drop + file picker with preview),
 * primary/accent color pickers, footer text, and a live preview strip.
 * Logo images are stored as base64 data URLs in the branding config JSON.
 * Only visible to org admin/super_admin roles.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { BrandingConfig } from '../types/branding';
import { DEFAULT_BRANDING } from '../types/branding';
import type { UseTenantConfigReturn } from '../types/tenantConfig';
import { parseBrandingConfig, brandingToConfigData, isValidHexColor, computeGradient } from '../utils/brandingHelpers';
import { logger } from '../utils/logger';

interface BrandingEditorProps {
  tenantConfig: UseTenantConfigReturn;
  userRole?: string | null;
  isSuperAdmin?: boolean;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const MAX_LOGO_SIZE_BYTES = 512 * 1024; // 512 KB
const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];

/** Read an image File and return a base64 data URL */
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export function BrandingEditor({ tenantConfig, userRole, isSuperAdmin }: BrandingEditorProps) {
  const canEdit = userRole === 'admin' || isSuperAdmin;
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [logoError, setLogoError] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Local editing state
  const [companyName, setCompanyName] = useState(DEFAULT_BRANDING.companyName);
  const [logoUrl, setLogoUrl] = useState(DEFAULT_BRANDING.logoUrl);
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_BRANDING.primaryColor);
  const [accentColor, setAccentColor] = useState(DEFAULT_BRANDING.accentColor);
  const [footerText, setFooterText] = useState(DEFAULT_BRANDING.footerText);
  const initializedRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load tenant branding data
  useEffect(() => {
    if (tenantConfig.loading || initializedRef.current) return;
    initializedRef.current = true;

    const raw = tenantConfig.getConfig('branding') as Record<string, unknown> | null;
    if (raw) {
      const parsed = parseBrandingConfig(raw);
      setCompanyName(parsed.companyName);
      setLogoUrl(parsed.logoUrl);
      setPrimaryColor(parsed.primaryColor);
      setAccentColor(parsed.accentColor);
      setFooterText(parsed.footerText);
    }
  }, [tenantConfig.loading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Compute live preview branding
  const previewGradient = computeGradient(isValidHexColor(primaryColor) ? primaryColor : DEFAULT_BRANDING.primaryColor);

  /** Whether the current logoUrl is a base64 data URL (uploaded image) */
  const isDataUrl = logoUrl.startsWith('data:');

  /** Process a dropped/selected image file */
  const handleLogoFile = useCallback(async (file: File) => {
    setLogoUploadError(null);

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setLogoUploadError('Unsupported format. Use PNG, JPEG, SVG, or WebP.');
      return;
    }
    if (file.size > MAX_LOGO_SIZE_BYTES) {
      setLogoUploadError(`File too large (${(file.size / 1024).toFixed(0)} KB). Maximum is 512 KB.`);
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setLogoUrl(dataUrl);
      setLogoError(false);
    } catch (err) {
      logger.error('Logo upload failed:', err);
      setLogoUploadError('Failed to read image file.');
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (!canEdit) return;

    const file = e.dataTransfer.files[0];
    if (file) handleLogoFile(file);
  }, [canEdit, handleLogoFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleLogoFile(file);
    // Reset the input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [handleLogoFile]);

  const handleRemoveLogo = useCallback(() => {
    setLogoUrl(DEFAULT_BRANDING.logoUrl);
    setLogoError(false);
    setLogoUploadError(null);
  }, []);

  const handleSave = useCallback(async () => {
    setSaveStatus('saving');
    try {
      const config: BrandingConfig = parseBrandingConfig({
        companyName,
        logoUrl,
        primaryColor,
        accentColor,
        footerText,
        headerGradient: previewGradient,
      });
      await tenantConfig.setConfig('branding', brandingToConfigData(config));
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
    }
  }, [tenantConfig, companyName, logoUrl, primaryColor, accentColor, footerText, previewGradient]);

  const handleReset = useCallback(() => {
    setCompanyName(DEFAULT_BRANDING.companyName);
    setLogoUrl(DEFAULT_BRANDING.logoUrl);
    setPrimaryColor(DEFAULT_BRANDING.primaryColor);
    setAccentColor(DEFAULT_BRANDING.accentColor);
    setFooterText(DEFAULT_BRANDING.footerText);
    setLogoError(false);
    setLogoUploadError(null);
  }, []);

  if (tenantConfig.loading) {
    return <p className="text-sm text-gray-400 dark:text-slate-500 py-4 text-center">Loading branding…</p>;
  }

  const inputClasses = canEdit
    ? 'w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent'
    : 'w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 cursor-not-allowed';

  return (
    <div className="space-y-5">
      {/* ─── Live Preview ──────────────────────────────────────────────────── */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2">
          Live Preview
        </label>
        <div className="rounded-lg overflow-hidden shadow-sm border border-gray-200 dark:border-slate-700">
          {/* Header preview */}
          <div
            className="px-4 py-3 flex items-center justify-between"
            style={{ background: previewGradient }}
          >
            <div className="flex items-center gap-3">
              {!logoError ? (
                <img
                  src={logoUrl}
                  alt={companyName}
                  className="h-8 w-auto object-contain brightness-0 invert"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <span className="text-white text-xs font-medium opacity-70">Logo not found</span>
              )}
            </div>
            <span className="text-white text-xs font-medium truncate max-w-[200px]">{companyName}</span>
          </div>
          {/* Body preview with accent */}
          <div className="bg-white dark:bg-slate-800 px-4 py-3 flex items-center gap-3">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: isValidHexColor(primaryColor) ? primaryColor : DEFAULT_BRANDING.primaryColor }}
            />
            <span
              className="text-sm font-medium"
              style={{ color: isValidHexColor(primaryColor) ? primaryColor : DEFAULT_BRANDING.primaryColor }}
            >
              Primary Color
            </span>
            <div className="flex-1" />
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: isValidHexColor(accentColor) ? accentColor : DEFAULT_BRANDING.accentColor }}
            />
            <span
              className="text-sm font-medium"
              style={{ color: isValidHexColor(accentColor) ? accentColor : DEFAULT_BRANDING.accentColor }}
            >
              Accent Color
            </span>
          </div>
          {/* Footer preview */}
          <div className="bg-gray-50 dark:bg-slate-700/50 px-4 py-1.5 border-t border-gray-200 dark:border-slate-600">
            <p className="text-xs text-gray-400 dark:text-slate-500 text-right">{footerText}</p>
          </div>
        </div>
      </div>

      {/* ─── Company Name ──────────────────────────────────────────────────── */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">
          Company Name
        </label>
        <input
          type="text"
          value={companyName}
          onChange={e => setCompanyName(e.target.value)}
          className={inputClasses}
          disabled={!canEdit}
          maxLength={100}
          placeholder="Your Organization Name"
        />
      </div>

      {/* ─── Logo Upload ───────────────────────────────────────────────────── */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">
          Logo
        </label>

        {/* Current logo preview + remove */}
        {logoUrl && logoUrl !== DEFAULT_BRANDING.logoUrl && (
          <div className="flex items-center gap-3 mb-2 p-2 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-slate-600">
            <div className="flex-shrink-0 w-20 h-10 bg-gray-200 dark:bg-slate-600 rounded flex items-center justify-center overflow-hidden">
              {!logoError ? (
                <img
                  src={logoUrl}
                  alt="Current logo"
                  className="max-h-full max-w-full object-contain"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <span className="text-[10px] text-gray-400">Error</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-600 dark:text-slate-300 truncate">
                {isDataUrl ? 'Uploaded image' : logoUrl}
              </p>
              {isDataUrl && (
                <p className="text-[10px] text-gray-400 dark:text-slate-500">
                  {(logoUrl.length * 0.75 / 1024).toFixed(0)} KB (base64)
                </p>
              )}
            </div>
            {canEdit && (
              <button
                type="button"
                onClick={handleRemoveLogo}
                className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium flex-shrink-0"
              >
                Remove
              </button>
            )}
          </div>
        )}

        {/* Drop zone + file picker */}
        {canEdit && (
          <>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
              className={`
                relative border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors
                ${isDragOver
                  ? 'border-[var(--brand-primary)] bg-blue-50 dark:bg-slate-700'
                  : 'border-gray-300 dark:border-slate-600 hover:border-gray-400 dark:hover:border-slate-500 bg-white dark:bg-slate-800'
                }
              `}
            >
              <div className="text-gray-400 dark:text-slate-500 text-2xl mb-1" aria-hidden="true">
                {isDragOver ? '📥' : '🖼️'}
              </div>
              <p className="text-sm text-gray-600 dark:text-slate-300 font-medium">
                {isDragOver ? 'Drop image here' : 'Click to upload or drag & drop'}
              </p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                PNG, JPEG, SVG, or WebP — max 512 KB
              </p>
              <p className="text-xs text-gray-400 dark:text-slate-500">
                Use a white or transparent logo for best results on colored headers.
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".png,.jpg,.jpeg,.svg,.webp,image/png,image/jpeg,image/svg+xml,image/webp"
              onChange={handleFileSelect}
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
            />
          </>
        )}

        {logoUploadError && (
          <p className="text-xs text-red-500 mt-1">{logoUploadError}</p>
        )}

        {!canEdit && (
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
            {isDataUrl ? 'Custom logo uploaded' : logoUrl}
          </p>
        )}
      </div>

      {/* ─── Colors ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">
            Primary Color
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={isValidHexColor(primaryColor) ? primaryColor : DEFAULT_BRANDING.primaryColor}
              onChange={e => setPrimaryColor(e.target.value)}
              className="w-10 h-10 rounded border border-gray-300 dark:border-slate-600 cursor-pointer p-0.5"
              disabled={!canEdit}
            />
            <input
              type="text"
              value={primaryColor}
              onChange={e => setPrimaryColor(e.target.value)}
              className={inputClasses}
              disabled={!canEdit}
              maxLength={7}
              placeholder="#1a3a4a"
            />
          </div>
          {primaryColor && !isValidHexColor(primaryColor) && (
            <p className="text-xs text-red-500 mt-1">Invalid hex color</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">
            Accent Color
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={isValidHexColor(accentColor) ? accentColor : DEFAULT_BRANDING.accentColor}
              onChange={e => setAccentColor(e.target.value)}
              className="w-10 h-10 rounded border border-gray-300 dark:border-slate-600 cursor-pointer p-0.5"
              disabled={!canEdit}
            />
            <input
              type="text"
              value={accentColor}
              onChange={e => setAccentColor(e.target.value)}
              className={inputClasses}
              disabled={!canEdit}
              maxLength={7}
              placeholder="#d4912a"
            />
          </div>
          {accentColor && !isValidHexColor(accentColor) && (
            <p className="text-xs text-red-500 mt-1">Invalid hex color</p>
          )}
        </div>
      </div>

      {/* ─── Footer Text ───────────────────────────────────────────────────── */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">
          PDF Footer Text
        </label>
        <input
          type="text"
          value={footerText}
          onChange={e => setFooterText(e.target.value)}
          className={inputClasses}
          disabled={!canEdit}
          maxLength={100}
          placeholder="Company Name — Confidential"
        />
        <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
          Shown in the bottom-right corner of every PDF page.
        </p>
      </div>

      {/* ─── Actions ───────────────────────────────────────────────────────── */}
      {canEdit && (
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saveStatus === 'saving' || (!isValidHexColor(primaryColor) && primaryColor !== '') || (!isValidHexColor(accentColor) && accentColor !== '')}
            className="px-4 py-2 text-sm font-medium rounded-lg text-white bg-[var(--brand-primary)] hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saveStatus === 'saving' ? 'Saving…' : 'Save Branding'}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 text-sm font-medium rounded-lg text-gray-600 dark:text-slate-300 border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            Reset to Defaults
          </button>
          {saveStatus === 'saved' && (
            <span className="text-sm text-green-600 dark:text-green-400 font-medium">✓ Saved</span>
          )}
          {saveStatus === 'error' && (
            <span className="text-sm text-red-500 font-medium">Save failed</span>
          )}
        </div>
      )}
      {!canEdit && (
        <p className="text-xs text-gray-400 dark:text-slate-500 italic">
          Only organization admins can edit branding settings.
        </p>
      )}
    </div>
  );
}
