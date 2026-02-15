import { describe, it, expect } from 'vitest';
import { mapAssessmentToContract } from '../utils/prefill';
import { INITIAL_DATA } from '../utils/initialData';
import type { AssessmentFormData } from '../types/forms';

function makeAssessment(overrides?: Partial<AssessmentFormData>): AssessmentFormData {
  return { ...INITIAL_DATA, ...overrides };
}

describe('mapAssessmentToContract', () => {
  it('maps client name to firstName/lastName', () => {
    const data = makeAssessment({
      clientHelpList: { ...INITIAL_DATA.clientHelpList, clientName: 'John Smith' },
    });
    const result = mapAssessmentToContract(data);
    expect(result.serviceAgreement.customerInfo.firstName).toBe('John');
    expect(result.serviceAgreement.customerInfo.lastName).toBe('Smith');
  });

  it('handles single-word names', () => {
    const data = makeAssessment({
      clientHelpList: { ...INITIAL_DATA.clientHelpList, clientName: 'Madonna' },
    });
    const result = mapAssessmentToContract(data);
    expect(result.serviceAgreement.customerInfo.firstName).toBe('Madonna');
    expect(result.serviceAgreement.customerInfo.lastName).toBe('');
  });

  it('handles multi-word last names', () => {
    const data = makeAssessment({
      clientHelpList: { ...INITIAL_DATA.clientHelpList, clientName: 'Mary Jane Watson' },
    });
    const result = mapAssessmentToContract(data);
    expect(result.serviceAgreement.customerInfo.firstName).toBe('Mary');
    expect(result.serviceAgreement.customerInfo.lastName).toBe('Jane Watson');
  });

  it('maps phone number', () => {
    const data = makeAssessment({
      clientHelpList: { ...INITIAL_DATA.clientHelpList, clientPhone: '555-1234' },
    });
    const result = mapAssessmentToContract(data);
    expect(result.serviceAgreement.customerInfo.phone).toBe('555-1234');
  });

  it('maps date of birth', () => {
    const data = makeAssessment({
      clientHelpList: { ...INITIAL_DATA.clientHelpList, dateOfBirth: '1950-06-15' },
    });
    const result = mapAssessmentToContract(data);
    expect(result.serviceAgreement.customerInfo.dateOfBirth).toBe('1950-06-15');
  });

  it('maps service days to frequency booleans', () => {
    const data = makeAssessment({
      clientHistory: {
        ...INITIAL_DATA.clientHistory,
        serviceDays: ['monday', 'wednesday', 'friday'],
      },
    });
    const result = mapAssessmentToContract(data);
    expect(result.serviceAgreement.frequency.monday).toBe(true);
    expect(result.serviceAgreement.frequency.wednesday).toBe(true);
    expect(result.serviceAgreement.frequency.friday).toBe(true);
    expect(result.serviceAgreement.frequency.tuesday).toBe(false);
  });

  it('maps liveIn flag', () => {
    const data = makeAssessment({
      clientHistory: { ...INITIAL_DATA.clientHistory, liveIn: true },
    });
    const result = mapAssessmentToContract(data);
    expect(result.serviceAgreement.customerInfo.liveIn).toBe('yes');
  });

  it('maps is24x7 to available24x7', () => {
    const data = makeAssessment({
      clientHistory: { ...INITIAL_DATA.clientHistory, is24x7: true },
    });
    const result = mapAssessmentToContract(data);
    expect(result.serviceAgreement.frequency.available24x7).toBe(true);
  });

  it('propagates consumer name to all sub-forms', () => {
    const data = makeAssessment({
      clientHelpList: { ...INITIAL_DATA.clientHelpList, clientName: 'John Doe' },
    });
    const result = mapAssessmentToContract(data);
    expect(result.consumerRights.consumerName).toBe('John Doe');
    expect(result.directCareWorker.consumerName).toBe('John Doe');
    expect(result.transportationRequest.consumerName).toBe('John Doe');
    expect(result.customerPacket.consumerName).toBe('John Doe');
  });

  it('passes address through as single line', () => {
    const data = makeAssessment({
      clientHelpList: {
        ...INITIAL_DATA.clientHelpList,
        clientAddress: '123 Main St, Exton, PA 19341',
      },
    });
    const result = mapAssessmentToContract(data);
    expect(result.serviceAgreement.customerInfo.address).toBe('123 Main St, Exton, PA 19341');
  });

  it('defaults to empty string when address is empty', () => {
    const data = makeAssessment({
      clientHelpList: { ...INITIAL_DATA.clientHelpList, clientAddress: '' },
    });
    const result = mapAssessmentToContract(data);
    expect(result.serviceAgreement.customerInfo.address).toBe('');
  });

  it('returns valid ServiceContractFormData with all required keys', () => {
    const data = makeAssessment();
    const result = mapAssessmentToContract(data);
    expect(result.serviceAgreement).toBeDefined();
    expect(result.consumerRights).toBeDefined();
    expect(result.directCareWorker).toBeDefined();
    expect(result.transportationRequest).toBeDefined();
    expect(result.customerPacket).toBeDefined();
  });

  it('maps first emergency contact to contactPerson', () => {
    const data = makeAssessment({
      clientHelpList: {
        ...INITIAL_DATA.clientHelpList,
        emergencyContacts: [
          { name: 'Jane Doe', relationship: 'Daughter', address: '456 Oak Ave, Exton, PA 19341', phone1: '555-9999', phone2: '', email: '' },
        ],
      },
    });
    const result = mapAssessmentToContract(data);
    expect(result.serviceAgreement.contactPerson.name).toBe('Jane Doe');
    expect(result.serviceAgreement.contactPerson.phone).toBe('555-9999');
    expect(result.serviceAgreement.contactPerson.relationship).toBe('Daughter');
    expect(result.serviceAgreement.contactPerson.address).toBe('456 Oak Ave, Exton, PA 19341');
  });

  it('infers personalCare from assessment bathing selections', () => {
    const data = makeAssessment({
      clientAssessment: {
        ...INITIAL_DATA.clientAssessment,
        bathing: ['Wants help with bathing'],
      },
    });
    const result = mapAssessmentToContract(data);
    expect(result.serviceAgreement.services.personalCare).toBe(true);
  });

  it('does not infer personalCare when only self-care selected', () => {
    const data = makeAssessment({
      clientAssessment: {
        ...INITIAL_DATA.clientAssessment,
        bathing: ['Bathes self'],
        dressing: [],
        toileting: ['Can toilet by self'],
      },
    });
    const result = mapAssessmentToContract(data);
    expect(result.serviceAgreement.services.personalCare).toBe(false);
  });

  it('infers homemaking from housekeeping selections', () => {
    const data = makeAssessment({
      clientAssessment: {
        ...INITIAL_DATA.clientAssessment,
        housekeeping: ['Needs help with vacuuming/sweeping/mopping', 'Wants help with laundry'],
      },
    });
    const result = mapAssessmentToContract(data);
    expect(result.serviceAgreement.services.homemaking).toBe(true);
  });

  it('infers transportation from assessment transportation selections', () => {
    const data = makeAssessment({
      clientAssessment: {
        ...INITIAL_DATA.clientAssessment,
        transportation: ['Wants help to get to doctor appointments'],
      },
    });
    const result = mapAssessmentToContract(data);
    expect(result.serviceAgreement.services.transportation).toBe(true);
  });

  it('infers selfAdminMeds from medication reminder selections', () => {
    const data = makeAssessment({
      clientAssessment: {
        ...INITIAL_DATA.clientAssessment,
        medicationReminder: ['Uses pre-filled pill box', 'Needs medicine container brought for self-medication'],
      },
    });
    const result = mapAssessmentToContract(data);
    expect(result.serviceAgreement.services.selfAdminMeds).toBe(true);
  });

  it('infers companionship when client lives alone', () => {
    const data = makeAssessment({
      clientHistory: { ...INITIAL_DATA.clientHistory, livesAlone: 'yes' },
    });
    const result = mapAssessmentToContract(data);
    expect(result.serviceAgreement.services.companionship).toBe(true);
  });

  it('infers clientVehicle from transportation assessment', () => {
    const data = makeAssessment({
      clientAssessment: {
        ...INITIAL_DATA.clientAssessment,
        transportation: ['Wants agency to use client car'],
      },
    });
    const result = mapAssessmentToContract(data);
    expect(result.transportationRequest.vehicleChoice).toBe('clientVehicle');
  });

  it('infers caregiverVehicle from transportation assessment', () => {
    const data = makeAssessment({
      clientAssessment: {
        ...INITIAL_DATA.clientAssessment,
        transportation: ["Wants caregiver to drive them in caregiver's vehicle"],
      },
    });
    const result = mapAssessmentToContract(data);
    expect(result.transportationRequest.vehicleChoice).toBe('caregiverVehicle');
  });

  // --- Payment Terms / Rate Type ---

  it('sets rateType to liveIn when assessment has liveIn', () => {
    const data = makeAssessment({
      clientHistory: { ...INITIAL_DATA.clientHistory, liveIn: true },
    });
    const result = mapAssessmentToContract(data);
    expect(result.serviceAgreement.paymentTerms.rateType).toBe('liveIn');
  });

  it('sets rateType to hourly when assessment does not have liveIn', () => {
    const data = makeAssessment({
      clientHistory: { ...INITIAL_DATA.clientHistory, liveIn: false },
    });
    const result = mapAssessmentToContract(data);
    expect(result.serviceAgreement.paymentTerms.rateType).toBe('hourly');
  });

  // --- Frequency: overnight/liveIn/24x7 flags ---

  it('maps overnight flag from assessment history', () => {
    const data = makeAssessment({
      clientHistory: { ...INITIAL_DATA.clientHistory, overnight: true },
    });
    const result = mapAssessmentToContract(data);
    expect(result.serviceAgreement.frequency.overnight).toBe(true);
  });

  it('maps liveIn flag to frequency.liveIn', () => {
    const data = makeAssessment({
      clientHistory: { ...INITIAL_DATA.clientHistory, liveIn: true },
    });
    const result = mapAssessmentToContract(data);
    expect(result.serviceAgreement.frequency.liveIn).toBe(true);
  });

  // --- Per-day schedule replication ---

  it('replicates per-day schedules from assessment history', () => {
    const data = makeAssessment({
      clientHistory: {
        ...INITIAL_DATA.clientHistory,
        serviceDays: ['Monday', 'Wednesday'],
        daySchedules: {
          Monday: { from: '08:00', to: '14:00' },
          Wednesday: { from: '09:00', to: '15:00' },
        },
      },
    });
    const result = mapAssessmentToContract(data);
    expect(result.serviceAgreement.frequency.monday).toBe(true);
    expect(result.serviceAgreement.frequency.wednesday).toBe(true);
    expect(result.serviceAgreement.frequency.daySchedules.monday).toEqual({ from: '08:00', to: '14:00' });
    expect(result.serviceAgreement.frequency.daySchedules.wednesday).toEqual({ from: '09:00', to: '15:00' });
  });

  it('skips _all meta key in daySchedules replication', () => {
    const data = makeAssessment({
      clientHistory: {
        ...INITIAL_DATA.clientHistory,
        serviceDays: ['Monday'],
        daySchedules: {
          _all: { from: '09:00', to: '17:00' },
          Monday: { from: '09:00', to: '17:00' },
        },
      },
    });
    const result = mapAssessmentToContract(data);
    expect(result.serviceAgreement.frequency.daySchedules._all).toBeUndefined();
    expect(result.serviceAgreement.frequency.daySchedules.monday).toEqual({ from: '09:00', to: '17:00' });
  });
});
