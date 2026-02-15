import type { AssessmentFormData } from '../types/forms';
import type { ServiceContractFormData } from '../types/serviceContract';
import { SERVICE_CONTRACT_INITIAL_DATA } from './contractInitialData';

/**
 * Maps a completed assessment's data into pre-filled service contract data.
 * Deep-merges with SERVICE_CONTRACT_INITIAL_DATA so all fields have defaults.
 */

/** Infer contract services from assessment category selections */
function inferServices(assessment: AssessmentFormData) {
  const { clientAssessment, clientHistory } = assessment;

  // Personal care: selected anything beyond self-care in bathing, dressing, toileting, shaving, hairCare
  const needsBathing = (clientAssessment.bathing || []).some(
    s => s !== 'Bathes self',
  );
  const needsDressing = (clientAssessment.dressing || []).length > 0;
  const needsToileting = (clientAssessment.toileting || []).some(
    s => s !== 'Can toilet by self',
  );
  const needsShaving = (clientAssessment.shaving || []).length > 0;
  const needsHairCare = (clientAssessment.hairCare || []).some(
    s => !s.startsWith('Brushes & styles') && !s.startsWith('Shampoos own'),
  );
  const personalCare = needsBathing || needsDressing || needsToileting || needsShaving || needsHairCare;

  // Homemaking: selected anything beyond self-sufficient in housekeeping
  const homemaking = (clientAssessment.housekeeping || []).some(
    s => s !== 'Does own housekeeping',
  );

  // Transportation: any transportation-related selection in the assessment
  const transportSelections = clientAssessment.transportation || [];
  const transportation = transportSelections.length > 0 &&
    !transportSelections.every(s => s === 'Drives self or family transports to appointments');

  // Self-admin meds: needs medication reminder help
  const selfAdminMeds = (clientAssessment.medicationReminder || []).some(
    s => s !== 'Able to take medicine with no help',
  );

  // Companionship: if they live alone (from history)
  const companionship = clientHistory.livesAlone === 'yes';

  return { personalCare, homemaking, transportation, selfAdminMeds, companionship };
}

/** Infer transportation vehicle preference from assessment */
function inferVehicleChoice(assessment: AssessmentFormData): 'clientVehicle' | 'caregiverVehicle' | '' {
  const selections = assessment.clientAssessment.transportation || [];
  if (selections.includes('Wants agency to use client car')) return 'clientVehicle';
  if (selections.includes("Wants caregiver to drive them in caregiver's vehicle")) return 'caregiverVehicle';
  return '';
}

export function mapAssessmentToContract(assessment: AssessmentFormData): ServiceContractFormData {
  const { clientHelpList, clientHistory } = assessment;

  // Parse client name into first/last
  const nameParts = (clientHelpList.clientName || '').trim().split(/\s+/);
  const firstName = nameParts[0] || '';
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

  // Replicate full service preferences from assessment history
  const dayMap: Record<string, 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'> = {
    monday: 'monday',
    tuesday: 'tuesday',
    wednesday: 'wednesday',
    thursday: 'thursday',
    friday: 'friday',
    saturday: 'saturday',
    sunday: 'sunday',
  };

  const frequency = { ...SERVICE_CONTRACT_INITIAL_DATA.serviceAgreement.frequency };

  // Map service type flags from assessment
  frequency.overnight = !!clientHistory.overnight;
  frequency.liveIn = !!clientHistory.liveIn;
  frequency.available24x7 = !!clientHistory.is24x7;

  // Map service days
  for (const day of clientHistory.serviceDays || []) {
    const key = dayMap[day.toLowerCase()];
    if (key) {
      (frequency as unknown as Record<string, boolean>)[key] = true;
    }
  }

  // Replicate per-day schedules as-is from assessment
  const daySchedules: Record<string, { from: string; to: string }> = {};
  if (clientHistory.daySchedules) {
    for (const [dayName, schedule] of Object.entries(clientHistory.daySchedules)) {
      if (dayName === '_all') continue; // skip the "Apply All" meta key
      const key = dayMap[dayName.toLowerCase()];
      if (key && schedule && (schedule.from || schedule.to)) {
        daySchedules[key] = { from: schedule.from || '', to: schedule.to || '' };
      }
    }
  }
  frequency.daySchedules = daySchedules;

  // Map start/end time from first day's schedule for backward compat
  const firstDay = clientHistory.serviceDays?.[0];
  if (firstDay) {
    const schedule = clientHistory.daySchedules?.[firstDay];
    if (schedule) {
      frequency.startTime = schedule.from || '';
      frequency.endTime = schedule.to || '';
    }
  }

  // Compute hours per day from day schedules (average across scheduled days)
  let computedHoursPerDay = '';
  if (clientHistory.liveIn || clientHistory.is24x7) {
    computedHoursPerDay = '24';
  } else if (Object.keys(daySchedules).length > 0) {
    const dayHours: number[] = [];
    for (const sch of Object.values(daySchedules)) {
      if (sch.from && sch.to) {
        const [fH, fM] = sch.from.split(':').map(Number);
        const [tH, tM] = sch.to.split(':').map(Number);
        const fromMin = fH * 60 + fM;
        const toMin = tH * 60 + tM;
        if (toMin > fromMin) {
          dayHours.push(Math.round((toMin - fromMin) / 60 * 10) / 10);
        }
      }
    }
    if (dayHours.length > 0) {
      // Use the most common value (mode), or first value if all different
      const counts = new Map<number, number>();
      for (const h of dayHours) counts.set(h, (counts.get(h) || 0) + 1);
      const mode = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
      computedHoursPerDay = String(mode);
    }
  }

  // Infer services from assessment categories
  const inferredServices = inferServices(assessment);
  const services = {
    ...SERVICE_CONTRACT_INITIAL_DATA.serviceAgreement.services,
    personalCare: inferredServices.personalCare,
    homemaking: inferredServices.homemaking,
    transportation: inferredServices.transportation,
    selfAdminMeds: inferredServices.selfAdminMeds,
    companionship: inferredServices.companionship,
  };

  // Map first emergency contact → contact person (simplified: name, address, phone, relationship)
  const ec = clientHelpList.emergencyContacts?.[0];
  const contactPerson = { ...SERVICE_CONTRACT_INITIAL_DATA.serviceAgreement.contactPerson };
  if (ec && ec.name) {
    contactPerson.name = ec.name || '';
    contactPerson.address = ec.address || '';
    contactPerson.phone = ec.phone1 || '';
    contactPerson.relationship = ec.relationship || '';
  }

  // Infer vehicle choice from assessment transportation selections
  const vehicleChoice = inferVehicleChoice(assessment);

  // Set payment rate type based on live-in flag from assessment
  const paymentTerms = {
    ...SERVICE_CONTRACT_INITIAL_DATA.serviceAgreement.paymentTerms,
    rateType: (clientHistory.liveIn ? 'liveIn' : 'hourly') as 'hourly' | 'liveIn',
  };

  const fullName = [firstName, lastName].filter(Boolean).join(' ');
  const today = new Date().toLocaleDateString('en-CA');

  return {
    serviceAgreement: {
      ...SERVICE_CONTRACT_INITIAL_DATA.serviceAgreement,
      date: today,
      customerInfo: {
        ...SERVICE_CONTRACT_INITIAL_DATA.serviceAgreement.customerInfo,
        firstName,
        lastName,
        address: clientHelpList.clientAddress || '',
        phone: clientHelpList.clientPhone || '',
        dateOfBirth: clientHelpList.dateOfBirth || '',
        startOfCareDate: clientHistory.serviceStartDate || '',
        daysPerWeek: clientHistory.servicesPerWeek || '',
        hoursPerDay: computedHoursPerDay,
        liveIn: clientHistory.liveIn ? 'yes' : '',
      },
      paymentTerms,
      contactPerson,
      services,
      frequency,
    },
    termsConditions: {
      ...SERVICE_CONTRACT_INITIAL_DATA.termsConditions,
    },
    consumerRights: {
      ...SERVICE_CONTRACT_INITIAL_DATA.consumerRights,
      consumerName: fullName,
      acknowledgeDate: today,
    },
    directCareWorker: {
      ...SERVICE_CONTRACT_INITIAL_DATA.directCareWorker,
      consumerName: fullName,
      date: today,
    },
    transportationRequest: {
      ...SERVICE_CONTRACT_INITIAL_DATA.transportationRequest,
      consumerName: fullName,
      vehicleChoice,
      date: today,
    },
    customerPacket: {
      ...SERVICE_CONTRACT_INITIAL_DATA.customerPacket,
      consumerName: fullName,
      acknowledgeDate: today,
    },
  };
}
