import { describe, it, expect } from 'vitest';
import { resolveTemplate, resolveEmailBody } from '../utils/emailTemplates';

describe('resolveTemplate', () => {
  const allVars = {
    clientName: 'Jane Smith',
    date: '01/15/2025',
    staffName: 'John Doe',
  };

  it('replaces all placeholders with provided values', () => {
    const template = 'Report for {clientName} on {date} by {staffName}';
    const result = resolveTemplate(template, allVars);
    expect(result).toBe('Report for Jane Smith on 01/15/2025 by John Doe');
  });

  it('replaces multiple occurrences of the same placeholder', () => {
    const template = '{clientName} - Assessment for {clientName}';
    const result = resolveTemplate(template, allVars);
    expect(result).toBe('Jane Smith - Assessment for Jane Smith');
  });

  it('uses "Client" fallback when clientName is empty', () => {
    const template = 'Report for {clientName}';
    const result = resolveTemplate(template, { ...allVars, clientName: '' });
    expect(result).toBe('Report for Client');
  });

  it('uses empty string fallback when staffName is empty', () => {
    const template = 'By: {staffName}';
    const result = resolveTemplate(template, { ...allVars, staffName: '' });
    expect(result).toBe('By: ');
  });

  it('uses current date fallback when date is empty', () => {
    const template = 'Generated on {date}';
    const result = resolveTemplate(template, { ...allVars, date: '' });
    // Should contain some date string (not the literal "{date}")
    expect(result).not.toContain('{date}');
    expect(result).toContain('Generated on ');
  });

  it('leaves unknown placeholders as-is', () => {
    const template = 'Hello {unknown} world';
    const result = resolveTemplate(template, allVars);
    expect(result).toBe('Hello {unknown} world');
  });

  it('handles template with no placeholders', () => {
    const template = 'Plain text with no placeholders';
    const result = resolveTemplate(template, allVars);
    expect(result).toBe('Plain text with no placeholders');
  });

  it('handles empty template string', () => {
    const result = resolveTemplate('', allVars);
    expect(result).toBe('');
  });
});

describe('resolveEmailBody', () => {
  const vars = {
    clientName: 'Jane Smith',
    date: '01/15/2025',
    staffName: 'John Doe',
  };

  it('resolves placeholders in body template', () => {
    const body = resolveEmailBody('Report for {clientName}', vars, '');
    expect(body).toBe('Report for Jane Smith');
  });

  it('appends signature when provided', () => {
    const body = resolveEmailBody('Hello', vars, 'Best regards,\nJohn');
    expect(body).toBe('Hello\n\nBest regards,\nJohn');
  });

  it('does not append signature when empty', () => {
    const body = resolveEmailBody('Hello', vars, '');
    expect(body).toBe('Hello');
  });

  it('does not append signature when whitespace only', () => {
    const body = resolveEmailBody('Hello', vars, '   ');
    expect(body).toBe('Hello');
  });

  it('resolves placeholders in body and appends signature', () => {
    const body = resolveEmailBody(
      'Report for {clientName} on {date}',
      vars,
      'Prepared by: {staffName}', // Note: signature is NOT resolved (plain string)
    );
    expect(body).toBe('Report for Jane Smith on 01/15/2025\n\nPrepared by: {staffName}');
  });
});
