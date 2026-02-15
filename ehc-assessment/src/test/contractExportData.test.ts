import { describe, it, expect } from 'vitest';
import { flattenContractData, unflattenContractData } from '../utils/contractExportData';
import { SERVICE_CONTRACT_INITIAL_DATA } from '../utils/contractInitialData';
import type { ServiceContractFormData } from '../types/serviceContract';

function makeTestData(overrides?: Partial<ServiceContractFormData>): ServiceContractFormData {
  return { ...SERVICE_CONTRACT_INITIAL_DATA, ...overrides };
}

describe('flattenContractData', () => {
  it('returns flat key-value pairs', () => {
    const flat = flattenContractData(makeTestData());
    expect(typeof flat).toBe('object');
    expect(typeof flat['firstName']).toBe('string');
    expect(typeof flat['address']).toBe('string');
  });

  it('includes customer info fields', () => {
    const data = makeTestData({
      serviceAgreement: {
        ...SERVICE_CONTRACT_INITIAL_DATA.serviceAgreement,
        customerInfo: {
          ...SERVICE_CONTRACT_INITIAL_DATA.serviceAgreement.customerInfo,
          firstName: 'Jane',
          lastName: 'Smith',
          phone: '555-9999',
        },
      },
    });
    const flat = flattenContractData(data);
    expect(flat['firstName']).toBe('Jane');
    expect(flat['lastName']).toBe('Smith');
    expect(flat['phone']).toBe('555-9999');
  });

  it('joins selected services with semicolons', () => {
    const data = makeTestData({
      serviceAgreement: {
        ...SERVICE_CONTRACT_INITIAL_DATA.serviceAgreement,
        services: {
          ...SERVICE_CONTRACT_INITIAL_DATA.serviceAgreement.services,
          personalCare: true,
          companionship: true,
        },
      },
    });
    const flat = flattenContractData(data);
    expect(flat['servicesSelected']).toBe('Personal Care; Companionship');
  });

  it('maps schedule days correctly', () => {
    const data = makeTestData({
      serviceAgreement: {
        ...SERVICE_CONTRACT_INITIAL_DATA.serviceAgreement,
        frequency: {
          ...SERVICE_CONTRACT_INITIAL_DATA.serviceAgreement.frequency,
          monday: true,
          wednesday: true,
          friday: true,
        },
      },
    });
    const flat = flattenContractData(data);
    expect(flat['scheduleDays']).toBe('Mon; Wed; Fri');
  });

  it('maps customer packet acknowledgments', () => {
    const ts = '2025-01-15T10:00:00.000Z';
    const data = makeTestData({
      customerPacket: {
        ...SERVICE_CONTRACT_INITIAL_DATA.customerPacket,
        acknowledgeHipaa: { checked: true, timestamp: ts },
        acknowledgeHiringStandards: { checked: true, timestamp: ts },
        acknowledgeCaregiverIntro: { checked: false, timestamp: '' },
        acknowledgeComplaintProcedures: { checked: true, timestamp: ts },
        acknowledgeSatisfactionSurvey: { checked: false, timestamp: '' },
      },
    });
    const flat = flattenContractData(data);
    expect(flat['packetHipaa']).toBe('Yes');
    expect(flat['packetHipaaTimestamp']).toBe(ts);
    expect(flat['packetCaregiverIntro']).toBe('No');
    expect(flat['packetCaregiverIntroTimestamp']).toBe('');
  });

  it('maps signature status correctly', () => {
    const data = makeTestData({
      serviceAgreement: {
        ...SERVICE_CONTRACT_INITIAL_DATA.serviceAgreement,
        clientSignature: 'data:image/png;base64,abc',
        ehcRepSignature: '',
      },
    });
    const flat = flattenContractData(data);
    expect(flat['clientSignatureSigned']).toBe('Yes');
    expect(flat['ehcRepSignatureSigned']).toBe('No');
  });
});

describe('unflattenContractData', () => {
  it('returns defaults for an empty flat map', () => {
    const result = unflattenContractData({});
    expect(result.serviceAgreement.customerInfo.firstName).toBe('');
    expect(result.serviceAgreement.paymentTerms.holidayRatesApply).toBe(true);
    expect(result.serviceAgreement.frequency.monday).toBe(false);
    expect(result.customerPacket.acknowledgeHipaa.checked).toBe(false);
  });

  it('round-trips customer info fields', () => {
    const data = makeTestData({
      serviceAgreement: {
        ...SERVICE_CONTRACT_INITIAL_DATA.serviceAgreement,
        customerInfo: {
          ...SERVICE_CONTRACT_INITIAL_DATA.serviceAgreement.customerInfo,
          firstName: 'Jane',
          lastName: 'Smith',
          address: '123 Main St, Exton, PA 19341',
          phone: '555-9999',
          dateOfBirth: '1960-03-15',
          startOfCareDate: '2025-01-01',
          daysPerWeek: '3',
          hoursPerDay: '8',
          liveIn: 'no',
        },
      },
    });
    const flat = flattenContractData(data);
    const result = unflattenContractData(flat);
    expect(result.serviceAgreement.customerInfo.firstName).toBe('Jane');
    expect(result.serviceAgreement.customerInfo.lastName).toBe('Smith');
    expect(result.serviceAgreement.customerInfo.address).toBe('123 Main St, Exton, PA 19341');
    expect(result.serviceAgreement.customerInfo.phone).toBe('555-9999');
    expect(result.serviceAgreement.customerInfo.dateOfBirth).toBe('1960-03-15');
    expect(result.serviceAgreement.customerInfo.liveIn).toBe('no');
  });

  it('round-trips payment terms with standard hourly rate', () => {
    const data = makeTestData({
      serviceAgreement: {
        ...SERVICE_CONTRACT_INITIAL_DATA.serviceAgreement,
        paymentTerms: {
          ...SERVICE_CONTRACT_INITIAL_DATA.serviceAgreement.paymentTerms,
          rateType: 'hourly',
          hourlyRateOption: '35/38',
          holidayRatesApply: false,
        },
      },
    });
    const flat = flattenContractData(data);
    const result = unflattenContractData(flat);
    expect(result.serviceAgreement.paymentTerms.rateType).toBe('hourly');
    expect(result.serviceAgreement.paymentTerms.hourlyRateOption).toBe('35/38');
    expect(result.serviceAgreement.paymentTerms.holidayRatesApply).toBe(false);
  });

  it('round-trips payment terms with custom hourly rate', () => {
    const data = makeTestData({
      serviceAgreement: {
        ...SERVICE_CONTRACT_INITIAL_DATA.serviceAgreement,
        paymentTerms: {
          ...SERVICE_CONTRACT_INITIAL_DATA.serviceAgreement.paymentTerms,
          rateType: 'hourly',
          hourlyRateOption: 'custom',
          customHourlyRate: '$42/hr',
          holidayRatesApply: true,
        },
      },
    });
    const flat = flattenContractData(data);
    const result = unflattenContractData(flat);
    expect(result.serviceAgreement.paymentTerms.hourlyRateOption).toBe('custom');
    expect(result.serviceAgreement.paymentTerms.customHourlyRate).toBe('$42/hr');
  });

  it('round-trips level of service flags', () => {
    const data = makeTestData({
      serviceAgreement: {
        ...SERVICE_CONTRACT_INITIAL_DATA.serviceAgreement,
        levelOfService: { cna: true, chha: true, other: false, otherText: '' },
      },
    });
    const flat = flattenContractData(data);
    const result = unflattenContractData(flat);
    expect(result.serviceAgreement.levelOfService.cna).toBe(true);
    expect(result.serviceAgreement.levelOfService.chha).toBe(true);
    expect(result.serviceAgreement.levelOfService.other).toBe(false);
  });

  it('round-trips method of payment flags', () => {
    const data = makeTestData({
      serviceAgreement: {
        ...SERVICE_CONTRACT_INITIAL_DATA.serviceAgreement,
        methodOfPayment: {
          ...SERVICE_CONTRACT_INITIAL_DATA.serviceAgreement.methodOfPayment,
          check: true,
          longTermCareInsurance: true,
          insurancePolicyName: 'Aetna LTC',
          insurancePolicyNumber: 'LTC-12345',
        },
      },
    });
    const flat = flattenContractData(data);
    const result = unflattenContractData(flat);
    expect(result.serviceAgreement.methodOfPayment.check).toBe(true);
    expect(result.serviceAgreement.methodOfPayment.creditCard).toBe(false);
    expect(result.serviceAgreement.methodOfPayment.longTermCareInsurance).toBe(true);
    expect(result.serviceAgreement.methodOfPayment.insurancePolicyName).toBe('Aetna LTC');
    expect(result.serviceAgreement.methodOfPayment.insurancePolicyNumber).toBe('LTC-12345');
  });

  it('round-trips services selected', () => {
    const data = makeTestData({
      serviceAgreement: {
        ...SERVICE_CONTRACT_INITIAL_DATA.serviceAgreement,
        services: {
          ...SERVICE_CONTRACT_INITIAL_DATA.serviceAgreement.services,
          personalCare: true,
          companionship: true,
        },
      },
    });
    const flat = flattenContractData(data);
    const result = unflattenContractData(flat);
    expect(result.serviceAgreement.services.personalCare).toBe(true);
    expect(result.serviceAgreement.services.companionship).toBe(true);
    expect(result.serviceAgreement.services.homemaking).toBe(false);
  });

  it('round-trips schedule day flags', () => {
    const data = makeTestData({
      serviceAgreement: {
        ...SERVICE_CONTRACT_INITIAL_DATA.serviceAgreement,
        frequency: {
          ...SERVICE_CONTRACT_INITIAL_DATA.serviceAgreement.frequency,
          monday: true,
          wednesday: true,
          friday: true,
          overnight: true,
        },
      },
    });
    const flat = flattenContractData(data);
    const result = unflattenContractData(flat);
    expect(result.serviceAgreement.frequency.monday).toBe(true);
    expect(result.serviceAgreement.frequency.tuesday).toBe(false);
    expect(result.serviceAgreement.frequency.wednesday).toBe(true);
    expect(result.serviceAgreement.frequency.friday).toBe(true);
    expect(result.serviceAgreement.frequency.overnight).toBe(true);
  });

  it('round-trips terms & conditions initials', () => {
    const data = makeTestData({
      termsConditions: {
        nonSolicitationInitial: 'JS',
        termsOfPaymentInitial: 'JS',
        cardSurchargeInitial: 'JS',
        terminationInitial: 'JS',
        authorizationConsentInitial: 'JS',
        relatedDocumentsInitial: 'JS',
      },
    });
    const flat = flattenContractData(data);
    const result = unflattenContractData(flat);
    expect(result.termsConditions.nonSolicitationInitial).toBe('JS');
    expect(result.termsConditions.termsOfPaymentInitial).toBe('JS');
    expect(result.termsConditions.cardSurchargeInitial).toBe('JS');
    expect(result.termsConditions.terminationInitial).toBe('JS');
    expect(result.termsConditions.authorizationConsentInitial).toBe('JS');
    expect(result.termsConditions.relatedDocumentsInitial).toBe('JS');
  });

  it('round-trips customer packet ConsentCheckbox fields', () => {
    const ts = '2025-01-15T10:00:00.000Z';
    const data = makeTestData({
      customerPacket: {
        ...SERVICE_CONTRACT_INITIAL_DATA.customerPacket,
        acknowledgeHipaa: { checked: true, timestamp: ts },
        acknowledgeHiringStandards: { checked: true, timestamp: ts },
        acknowledgeCaregiverIntro: { checked: false, timestamp: '' },
        acknowledgeComplaintProcedures: { checked: true, timestamp: ts },
        acknowledgeSatisfactionSurvey: { checked: false, timestamp: '' },
      },
    });
    const flat = flattenContractData(data);
    const result = unflattenContractData(flat);
    expect(result.customerPacket.acknowledgeHipaa).toEqual({ checked: true, timestamp: ts });
    expect(result.customerPacket.acknowledgeHiringStandards).toEqual({ checked: true, timestamp: ts });
    expect(result.customerPacket.acknowledgeCaregiverIntro).toEqual({ checked: false, timestamp: '' });
    expect(result.customerPacket.acknowledgeComplaintProcedures).toEqual({ checked: true, timestamp: ts });
  });

  it('round-trips transportation data', () => {
    const data = makeTestData({
      transportationRequest: {
        ...SERVICE_CONTRACT_INITIAL_DATA.transportationRequest,
        declined: false,
        vehicleChoice: 'clientVehicle',
        employeeNames: 'Alice, Bob',
      },
    });
    const flat = flattenContractData(data);
    const result = unflattenContractData(flat);
    expect(result.transportationRequest.declined).toBe(false);
    expect(result.transportationRequest.vehicleChoice).toBe('clientVehicle');
    expect(result.transportationRequest.employeeNames).toBe('Alice, Bob');
  });

  it('propagates consumer name to all sub-sections', () => {
    const result = unflattenContractData({ firstName: 'Jane', lastName: 'Smith' });
    expect(result.consumerRights.consumerName).toBe('Jane Smith');
    expect(result.directCareWorker.consumerName).toBe('Jane Smith');
    expect(result.transportationRequest.consumerName).toBe('Jane Smith');
    expect(result.customerPacket.consumerName).toBe('Jane Smith');
  });
});
