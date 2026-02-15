/**
 * Export privacy filters — implements HIPAA Minimum Necessary standard.
 * Allows admins to exclude PHI field categories from CSV/JSON exports.
 */
import type { ExportPrivacyConfig } from '../types/sheetsConfig';
import {
  isNameField, isAddressField, isPhoneField, isDobField,
  isSsnField, isSignatureField, isEmailField, isInsuranceField,
} from './phiFieldDetection';

/**
 * Remove fields from a flat key-value map based on the export privacy configuration.
 * Excluded categories are omitted entirely (key removed), not masked.
 * Clinical/assessment data always passes through unchanged.
 */
export function applyExportFilters(
  flat: Record<string, string>,
  config: ExportPrivacyConfig,
): Record<string, string> {
  const filtered: Record<string, string> = {};

  for (const [key, value] of Object.entries(flat)) {
    // Check each PHI category — skip field if its category is excluded
    if (!config.includeNames && isNameField(key)) continue;
    if (!config.includeAddresses && isAddressField(key)) continue;
    if (!config.includePhones && isPhoneField(key)) continue;
    if (!config.includeDob && isDobField(key)) continue;
    if (!config.includeEmails && isEmailField(key)) continue;
    if (!config.includeInsurance && isInsuranceField(key)) continue;
    if (!config.includeSignatures && isSignatureField(key)) continue;
    // SSN is always excluded from exports (never safe to include)
    if (isSsnField(key)) continue;

    filtered[key] = value;
  }

  return filtered;
}
