import { describe, it, expect } from 'vitest';
import { flattenData, csvEscape, safeName, unflattenAssessment } from '../utils/exportData';
import { INITIAL_DATA } from '../utils/initialData';

describe('csvEscape', () => {
  it('returns empty string for empty input', () => {
    expect(csvEscape('')).toBe('');
  });

  it('returns plain string unchanged', () => {
    expect(csvEscape('hello world')).toBe('hello world');
  });

  it('wraps strings containing commas in quotes', () => {
    expect(csvEscape('hello, world')).toBe('"hello, world"');
  });

  it('wraps strings containing newlines in quotes', () => {
    expect(csvEscape('line1\nline2')).toBe('"line1\nline2"');
  });

  it('doubles internal quotes and wraps', () => {
    expect(csvEscape('say "hello"')).toBe('"say ""hello"""');
  });

  it('handles combination of special chars', () => {
    expect(csvEscape('a, "b"\nc')).toBe('"a, ""b""\nc"');
  });

  // Formula injection prevention
  it('prefixes values starting with = to prevent formula injection', () => {
    expect(csvEscape('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)");
  });

  it('prefixes values starting with + to prevent formula injection', () => {
    expect(csvEscape('+1234567890')).toBe("'+1234567890");
  });

  it('prefixes values starting with - to prevent formula injection', () => {
    expect(csvEscape('-1234567890')).toBe("'-1234567890");
  });

  it('prefixes values starting with @ to prevent formula injection', () => {
    expect(csvEscape('@import')).toBe("'@import");
  });

  it('prefixes values starting with tab character', () => {
    expect(csvEscape('\t=cmd')).toBe("'\t=cmd");
  });

  it('prefixes values starting with carriage return', () => {
    expect(csvEscape('\r=cmd')).toBe("'\r=cmd");
  });

  it('does not prefix normal values that contain formula chars mid-string', () => {
    expect(csvEscape('A+B=C')).toBe('A+B=C');
  });

  it('handles formula char with comma (both sanitizations)', () => {
    expect(csvEscape('=SUM(A1,B1)')).toBe("\"'=SUM(A1,B1)\"");
  });
});

describe('safeName', () => {
  it('replaces spaces and special chars with underscores', () => {
    expect(safeName('John Doe')).toBe('John_Doe');
  });

  it('truncates to 30 characters', () => {
    const longName = 'A'.repeat(50);
    expect(safeName(longName).length).toBe(30);
  });

  it('returns Unknown for empty input', () => {
    expect(safeName('')).toBe('Unknown');
  });

  it('strips special characters', () => {
    expect(safeName("O'Brien-Smith")).toBe('O_Brien_Smith');
  });
});

describe('flattenData', () => {
  it('extracts client name and DOB', () => {
    const data = {
      ...INITIAL_DATA,
      clientHelpList: {
        ...INITIAL_DATA.clientHelpList,
        clientName: 'Jane Doe',
        dateOfBirth: '1960-03-15',
      },
    };
    const flat = flattenData(data);
    expect(flat['clientName']).toBe('Jane Doe');
    expect(flat['dateOfBirth']).toBe('1960-03-15');
  });

  it('includes assessment reason from history', () => {
    const data = {
      ...INITIAL_DATA,
      clientHistory: {
        ...INITIAL_DATA.clientHistory,
        assessmentReason: 'initial' as const,
      },
    };
    const flat = flattenData(data);
    expect(flat['assessmentReason']).toBe('initial');
  });

  it('joins array values with semicolons', () => {
    const data = {
      ...INITIAL_DATA,
      clientHistory: {
        ...INITIAL_DATA.clientHistory,
        healthHistory: ['diabetes', 'hypertension'],
      },
    };
    const flat = flattenData(data);
    expect(flat['healthHistory']).toBe('diabetes; hypertension');
  });

  it('flattens medications with indexed keys', () => {
    const data = {
      ...INITIAL_DATA,
      medicationList: {
        ...INITIAL_DATA.medicationList,
        medications: [
          { name: 'Lisinopril', dosage: '10mg', frequency: 'daily', route: 'oral', updates: '' },
          { name: 'Metformin', dosage: '500mg', frequency: 'twice_daily', route: 'oral', updates: '' },
        ],
      },
    };
    const flat = flattenData(data);
    expect(flat['medication1_name']).toBe('Lisinopril');
    expect(flat['medication2_name']).toBe('Metformin');
  });

  it('skips medications without names', () => {
    const data = {
      ...INITIAL_DATA,
      medicationList: {
        ...INITIAL_DATA.medicationList,
        medications: [
          { name: '', dosage: '', frequency: '', route: '', updates: '' },
        ],
      },
    };
    const flat = flattenData(data);
    expect(flat['medication1_name']).toBeUndefined();
  });

  it('includes consent status', () => {
    const data = {
      ...INITIAL_DATA,
      consent: {
        ...INITIAL_DATA.consent,
        hipaaSignature: 'data:image/png;base64,abc',
      },
    };
    const flat = flattenData(data);
    expect(flat['consentSigned']).toBe('Yes');
  });

  it('shows consent not signed for empty signature', () => {
    const flat = flattenData(INITIAL_DATA);
    expect(flat['consentSigned']).toBe('No');
  });

  it('flattens staff notes only when non-empty', () => {
    const data = {
      ...INITIAL_DATA,
      staffNotes: {
        ...INITIAL_DATA.staffNotes,
        clientHelpList: 'A note here',
        clientHistory: '',
      },
    };
    const flat = flattenData(data);
    expect(flat['staffNote_clientHelpList']).toBe('A note here');
    expect(flat['staffNote_clientHistory']).toBeUndefined();
  });

  it('flattens emergency contacts with indexed keys', () => {
    const data = {
      ...INITIAL_DATA,
      clientHelpList: {
        ...INITIAL_DATA.clientHelpList,
        emergencyContacts: [
          { name: 'Alice', relationship: 'Daughter', address: '123 Main St', phone1: '555-0100', phone2: '', email: 'alice@example.com' },
          { name: '', relationship: '', address: '', phone1: '', phone2: '', email: '' },
          { name: '', relationship: '', address: '', phone1: '', phone2: '', email: '' },
        ],
      },
    };
    const flat = flattenData(data);
    expect(flat['emergencyContact1_name']).toBe('Alice');
    expect(flat['emergencyContact1_relationship']).toBe('Daughter');
    expect(flat['emergencyContact1_address']).toBe('123 Main St');
    expect(flat['emergencyContact1_email']).toBe('alice@example.com');
    expect(flat['emergencyContact2_name']).toBeUndefined();
  });
});

describe('unflattenAssessment', () => {
  it('round-trips scalar fields through flatten/unflatten', () => {
    const data = {
      ...INITIAL_DATA,
      clientHelpList: {
        ...INITIAL_DATA.clientHelpList,
        clientName: 'John Doe',
        dateOfBirth: '1950-03-15',
        clientAddress: '123 Main St, Exton, PA 19341',
        clientPhone: '5551234567',
        referralAgency: 'Agency X',
        goals: 'Independent living',
      },
    };
    const flat = flattenData(data);
    const result = unflattenAssessment(flat);
    expect(result.clientHelpList.clientName).toBe('John Doe');
    expect(result.clientHelpList.dateOfBirth).toBe('1950-03-15');
    expect(result.clientHelpList.clientAddress).toBe('123 Main St, Exton, PA 19341');
    expect(result.clientHelpList.clientPhone).toBe('5551234567');
    expect(result.clientHelpList.goals).toBe('Independent living');
  });

  it('round-trips client history fields', () => {
    const data = {
      ...INITIAL_DATA,
      clientHistory: {
        ...INITIAL_DATA.clientHistory,
        assessmentReason: 'initial' as const,
        primaryDiagnosis: 'Diabetes',
        healthHistory: ['diabetes', 'hypertension'],
        smoker: 'no' as const,
        oxygenInHome: 'no' as const,
        serviceDays: ['Mon', 'Wed', 'Fri'],
      },
    };
    const flat = flattenData(data);
    const result = unflattenAssessment(flat);
    expect(result.clientHistory.assessmentReason).toBe('initial');
    expect(result.clientHistory.primaryDiagnosis).toBe('Diabetes');
    expect(result.clientHistory.healthHistory).toEqual(['diabetes', 'hypertension']);
    expect(result.clientHistory.serviceDays).toEqual(['Mon', 'Wed', 'Fri']);
  });

  it('round-trips emergency contacts', () => {
    const data = {
      ...INITIAL_DATA,
      clientHelpList: {
        ...INITIAL_DATA.clientHelpList,
        emergencyContacts: [
          { name: 'Alice', relationship: 'Daughter', address: '123 St', phone1: '5550100', phone2: '', email: 'alice@test.com' },
        ],
      },
    };
    const flat = flattenData(data);
    const result = unflattenAssessment(flat);
    expect(result.clientHelpList.emergencyContacts).toHaveLength(1);
    expect(result.clientHelpList.emergencyContacts[0].name).toBe('Alice');
    expect(result.clientHelpList.emergencyContacts[0].email).toBe('alice@test.com');
  });

  it('round-trips medications', () => {
    const data = {
      ...INITIAL_DATA,
      medicationList: {
        ...INITIAL_DATA.medicationList,
        medications: [
          { name: 'Lisinopril', dosage: '10mg', frequency: 'daily', route: 'oral', updates: '' },
        ],
      },
    };
    const flat = flattenData(data);
    const result = unflattenAssessment(flat);
    expect(result.medicationList.medications).toHaveLength(1);
    expect(result.medicationList.medications[0].name).toBe('Lisinopril');
    expect(result.medicationList.medications[0].dosage).toBe('10mg');
  });

  it('round-trips assessment categories', () => {
    const data = {
      ...INITIAL_DATA,
      clientAssessment: {
        ...INITIAL_DATA.clientAssessment,
        assessmentType: 'initial' as const,
        bathing: ['Bathes self', 'Wants help with bathing'],
        mobility: ['Walks by self with no problems'],
      },
    };
    const flat = flattenData(data);
    const result = unflattenAssessment(flat);
    expect(result.clientAssessment.assessmentType).toBe('initial');
    expect(result.clientAssessment.bathing).toEqual(['Bathes self', 'Wants help with bathing']);
    expect(result.clientAssessment.mobility).toEqual(['Walks by self with no problems']);
  });

  it('propagates client info to all sections', () => {
    const flat: Record<string, string> = {
      clientName: 'Jane Smith',
      date: '2026-01-15',
      clientAddress: '456 Oak Ave',
    };
    const result = unflattenAssessment(flat);
    expect(result.clientHistory.clientName).toBe('Jane Smith');
    expect(result.clientAssessment.clientName).toBe('Jane Smith');
    expect(result.medicationList.clientName).toBe('Jane Smith');
    expect(result.homeSafetyChecklist.clientName).toBe('Jane Smith');
    expect(result.consent.clientName).toBe('Jane Smith');
  });

  it('returns INITIAL_DATA defaults for empty flat map', () => {
    const result = unflattenAssessment({});
    expect(result.clientHelpList.clientName).toBe('');
    expect(result.medicationList.noMedications).toBe(false);
    expect(result.medicationList.medications).toHaveLength(1);
  });

  it('round-trips staff notes', () => {
    const data = {
      ...INITIAL_DATA,
      staffNotes: {
        ...INITIAL_DATA.staffNotes,
        clientHelpList: 'Needs follow-up call',
        clientHistory: 'Verified with family',
        clientAssessment: '',
        homeSafetyChecklist: 'Ramp needed at entrance',
        medicationList: '',
        consent: '',
      },
    };
    const flat = flattenData(data);
    expect(flat['staffNote_clientHelpList']).toBe('Needs follow-up call');
    expect(flat['staffNote_clientHistory']).toBe('Verified with family');
    expect(flat['staffNote_homeSafetyChecklist']).toBe('Ramp needed at entrance');
    expect(flat['staffNote_clientAssessment']).toBeUndefined();

    const result = unflattenAssessment(flat);
    expect(result.staffNotes.clientHelpList).toBe('Needs follow-up call');
    expect(result.staffNotes.clientHistory).toBe('Verified with family');
    expect(result.staffNotes.homeSafetyChecklist).toBe('Ramp needed at entrance');
    expect(result.staffNotes.clientAssessment).toBe('');
  });
});
