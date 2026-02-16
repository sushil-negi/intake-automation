/**
 * Email template resolution utilities.
 *
 * Templates use {placeholder} syntax:
 *   {clientName} — Client or customer name
 *   {date}       — Current date (locale string)
 *   {staffName}  — Staff member / EHC representative name
 */

export interface TemplateVariables {
  clientName: string;
  date: string;
  staffName: string;
}

/**
 * Replace {placeholder} tokens in a template string with actual values.
 * Unknown placeholders are left as-is. Missing values get sensible fallbacks.
 */
export function resolveTemplate(
  template: string,
  vars: TemplateVariables,
): string {
  return template
    .replace(/\{clientName\}/g, vars.clientName || 'Client')
    .replace(/\{date\}/g, vars.date || new Date().toLocaleDateString())
    .replace(/\{staffName\}/g, vars.staffName || '');
}

/**
 * Resolve an email body template and optionally append a signature block.
 */
export function resolveEmailBody(
  bodyTemplate: string,
  vars: TemplateVariables,
  signature: string,
): string {
  let body = resolveTemplate(bodyTemplate, vars);
  if (signature.trim()) {
    body += '\n\n' + signature;
  }
  return body;
}
