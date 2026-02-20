/**
 * Branding context provider.
 *
 * Wraps the app and provides dynamic branding to all components.
 * Sets CSS custom properties on `:root` for Tailwind consumption.
 * Falls back to DEFAULT_BRANDING when no tenant config exists.
 *
 * Usage:
 *   const branding = useBranding();
 *   <img src={branding.logoUrl} alt={branding.companyName} />
 */

import { createContext, useContext, useEffect, type ReactNode } from 'react';
import type { BrandingConfig } from '../types/branding';
import { DEFAULT_BRANDING } from '../types/branding';

const BrandingContext = createContext<BrandingConfig>(DEFAULT_BRANDING);

/** Access the current branding config from any component */
export function useBranding(): BrandingConfig {
  return useContext(BrandingContext);
}

interface BrandingProviderProps {
  config?: BrandingConfig | null;
  children: ReactNode;
}

/**
 * Provides branding config to the component tree and sets CSS custom properties.
 *
 * CSS vars set on document.documentElement:
 *   --brand-primary: primary color hex
 *   --brand-accent: accent color hex
 *   --brand-gradient: header gradient CSS
 */
export function BrandingProvider({ config, children }: BrandingProviderProps) {
  const branding = config ?? DEFAULT_BRANDING;

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--brand-primary', branding.primaryColor);
    root.style.setProperty('--brand-accent', branding.accentColor);
    root.style.setProperty('--brand-gradient', branding.headerGradient);
  }, [branding.primaryColor, branding.accentColor, branding.headerGradient]);

  return (
    <BrandingContext.Provider value={branding}>
      {children}
    </BrandingContext.Provider>
  );
}
