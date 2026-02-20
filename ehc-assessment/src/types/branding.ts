/**
 * White-label branding configuration.
 *
 * Each organization can customize colors, logo, and company name.
 * Stored in `app_config` (config_type = 'branding') via the tenant config system.
 * Falls back to DEFAULT_BRANDING (current EHC values) when no config exists.
 */

export interface BrandingConfig {
  /** Organization display name (e.g., "Executive Home Care of Chester County") */
  companyName: string;
  /** URL or path to the logo image (e.g., "/ehc-watermark-h.png") */
  logoUrl: string;
  /** Primary brand color as CSS hex (e.g., "#1a3a4a") */
  primaryColor: string;
  /** Primary color as RGB tuple for PDF generation */
  primaryColorRgb: [number, number, number];
  /** Accent/highlight color as CSS hex (e.g., "#d4912a") */
  accentColor: string;
  /** Accent color as RGB tuple for PDF generation */
  accentColorRgb: [number, number, number];
  /** CSS gradient string for headers */
  headerGradient: string;
  /** Footer text for PDFs (e.g., "Executive Home Care — Confidential") */
  footerText: string;
}

/** Current hardcoded EHC branding — used as default when no tenant config exists */
export const DEFAULT_BRANDING: BrandingConfig = {
  companyName: 'Executive Home Care of Chester County',
  logoUrl: '/ehc-watermark-h.png',
  primaryColor: '#1a3a4a',
  primaryColorRgb: [26, 58, 74],
  accentColor: '#d4912a',
  accentColorRgb: [212, 145, 42],
  headerGradient: 'linear-gradient(135deg, #1a3a4a 0%, #1f4f5f 50%, #1a3a4a 100%)',
  footerText: 'Executive Home Care \u2014 Confidential',
};
