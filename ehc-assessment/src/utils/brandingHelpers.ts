/**
 * Branding utility functions.
 *
 * Helpers for parsing, converting, and applying brand configurations.
 * Used by BrandingContext, BrandingEditor, and PDF generation.
 */

import type { BrandingConfig } from '../types/branding';
import { DEFAULT_BRANDING } from '../types/branding';

/**
 * Convert a CSS hex color string to an RGB tuple.
 * Supports 3-char (#abc) and 6-char (#aabbcc) hex formats.
 * Returns null on invalid input.
 */
export function hexToRgb(hex: string): [number, number, number] | null {
  const cleaned = hex.replace(/^#/, '');
  let r: number, g: number, b: number;

  if (cleaned.length === 3) {
    r = parseInt(cleaned[0] + cleaned[0], 16);
    g = parseInt(cleaned[1] + cleaned[1], 16);
    b = parseInt(cleaned[2] + cleaned[2], 16);
  } else if (cleaned.length === 6) {
    r = parseInt(cleaned.slice(0, 2), 16);
    g = parseInt(cleaned.slice(2, 4), 16);
    b = parseInt(cleaned.slice(4, 6), 16);
  } else {
    return null;
  }

  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  return [r, g, b];
}

/**
 * Compute a header gradient from a primary color.
 * Creates a slightly lighter midpoint for visual depth.
 */
export function computeGradient(primaryHex: string): string {
  const rgb = hexToRgb(primaryHex);
  if (!rgb) return DEFAULT_BRANDING.headerGradient;

  const [r, g, b] = rgb;
  // Lighten by ~8% for the midpoint
  const lr = Math.min(255, r + Math.round((255 - r) * 0.08));
  const lg = Math.min(255, g + Math.round((255 - g) * 0.08));
  const lb = Math.min(255, b + Math.round((255 - b) * 0.08));

  const mid = `rgb(${lr}, ${lg}, ${lb})`;
  return `linear-gradient(135deg, ${primaryHex} 0%, ${mid} 50%, ${primaryHex} 100%)`;
}

/**
 * Validate a hex color string.
 */
export function isValidHexColor(hex: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex);
}

/**
 * Parse raw config_data JSONB into a validated BrandingConfig.
 * Missing or invalid fields fall back to DEFAULT_BRANDING values.
 */
export function parseBrandingConfig(data: Record<string, unknown> | null | undefined): BrandingConfig {
  if (!data) return { ...DEFAULT_BRANDING };

  const companyName = typeof data.companyName === 'string' && data.companyName.trim()
    ? data.companyName.trim()
    : DEFAULT_BRANDING.companyName;

  const logoUrl = typeof data.logoUrl === 'string' && data.logoUrl.trim()
    ? data.logoUrl.trim()
    : DEFAULT_BRANDING.logoUrl;

  const primaryColor = typeof data.primaryColor === 'string' && isValidHexColor(data.primaryColor)
    ? data.primaryColor
    : DEFAULT_BRANDING.primaryColor;

  const accentColor = typeof data.accentColor === 'string' && isValidHexColor(data.accentColor)
    ? data.accentColor
    : DEFAULT_BRANDING.accentColor;

  const primaryColorRgb = hexToRgb(primaryColor) ?? DEFAULT_BRANDING.primaryColorRgb;
  const accentColorRgb = hexToRgb(accentColor) ?? DEFAULT_BRANDING.accentColorRgb;

  const headerGradient = typeof data.headerGradient === 'string' && data.headerGradient.includes('gradient')
    ? data.headerGradient
    : computeGradient(primaryColor);

  const footerText = typeof data.footerText === 'string' && data.footerText.trim()
    ? data.footerText.trim()
    : DEFAULT_BRANDING.footerText;

  return {
    companyName,
    logoUrl,
    primaryColor,
    primaryColorRgb,
    accentColor,
    accentColorRgb,
    headerGradient,
    footerText,
  };
}

/**
 * Convert a BrandingConfig to a flat object suitable for storing in app_config JSONB.
 * Only stores the user-editable fields (RGB tuples and gradient are computed).
 */
export function brandingToConfigData(branding: BrandingConfig): Record<string, unknown> {
  return {
    companyName: branding.companyName,
    logoUrl: branding.logoUrl,
    primaryColor: branding.primaryColor,
    accentColor: branding.accentColor,
    headerGradient: branding.headerGradient,
    footerText: branding.footerText,
  };
}
