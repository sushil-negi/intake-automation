import { describe, it, expect } from 'vitest';
import { BUILT_IN_TEMPLATES, applyTemplate, getBlankAssessment } from '../utils/assessmentTemplates';
import { INITIAL_DATA } from '../utils/initialData';

describe('Assessment Templates', () => {
  it('should have at least 3 built-in templates', () => {
    expect(BUILT_IN_TEMPLATES.length).toBeGreaterThanOrEqual(3);
  });

  it('each template should have required fields', () => {
    for (const template of BUILT_IN_TEMPLATES) {
      expect(template.id).toBeTruthy();
      expect(template.name).toBeTruthy();
      expect(template.description).toBeTruthy();
      expect(template.overrides).toBeTruthy();
    }
  });

  it('each template should have a unique id', () => {
    const ids = BUILT_IN_TEMPLATES.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  describe('applyTemplate', () => {
    it('Standard Initial should set assessmentReason to initial', () => {
      const template = BUILT_IN_TEMPLATES.find(t => t.id === 'standard-initial')!;
      const result = applyTemplate(template);
      expect(result.clientHistory.assessmentReason).toBe('initial');
      expect(result.clientAssessment.assessmentType).toBe('initial');
    });

    it('Standard Initial should set language and service days', () => {
      const template = BUILT_IN_TEMPLATES.find(t => t.id === 'standard-initial')!;
      const result = applyTemplate(template);
      expect(result.clientHistory.primaryLanguage).toBe('english');
      expect(result.clientHistory.understandsEnglish).toBe('yes');
      expect(result.clientHistory.serviceDays).toEqual(['Monday', 'Wednesday', 'Friday']);
    });

    it('90-Day Supervisory should set assessmentReason to 90day', () => {
      const template = BUILT_IN_TEMPLATES.find(t => t.id === '90-day-supervisory')!;
      const result = applyTemplate(template);
      expect(result.clientHistory.assessmentReason).toBe('90day');
      expect(result.clientHistory.reAssessmentReasons).toEqual(['changeInCondition']);
      expect(result.clientAssessment.assessmentType).toBe('revised');
    });

    it('Live-In/24x7 should set liveIn and is24x7 flags', () => {
      const template = BUILT_IN_TEMPLATES.find(t => t.id === 'live-in-24x7')!;
      const result = applyTemplate(template);
      expect(result.clientHistory.is24x7).toBe(true);
      expect(result.clientHistory.liveIn).toBe(true);
      expect(result.clientHistory.serviceDays).toHaveLength(7);
    });

    it('Post-Hospitalization should set postHospitalization reason', () => {
      const template = BUILT_IN_TEMPLATES.find(t => t.id === 'post-hospital')!;
      const result = applyTemplate(template);
      expect(result.clientHistory.assessmentReason).toBe('90day');
      expect(result.clientHistory.reAssessmentReasons).toContain('postHospitalization');
    });

    it('should preserve non-overridden fields from INITIAL_DATA', () => {
      const template = BUILT_IN_TEMPLATES[0];
      const result = applyTemplate(template);
      // clientHelpList should be untouched (no overrides for it)
      expect(result.clientHelpList.clientName).toBe('');
      expect(result.clientHelpList.date).toBe(INITIAL_DATA.clientHelpList.date);
      // medicationList should be untouched
      expect(result.medicationList.noMedications).toBe(false);
      expect(result.medicationList.medications).toHaveLength(1);
    });

    it('should preserve non-overridden fields within overridden sections', () => {
      const template = BUILT_IN_TEMPLATES.find(t => t.id === 'standard-initial')!;
      const result = applyTemplate(template);
      // clientHistory is overridden, but fields not in the override should keep defaults
      expect(result.clientHistory.clientName).toBe('');
      expect(result.clientHistory.primaryDiagnosis).toBe('');
      expect(result.clientHistory.healthHistory).toEqual([]);
    });
  });

  describe('getBlankAssessment', () => {
    it('should return a deep copy of INITIAL_DATA', () => {
      const blank = getBlankAssessment();
      expect(blank).toEqual(INITIAL_DATA);
      // Should be a different object reference
      blank.clientHelpList.clientName = 'test';
      expect(INITIAL_DATA.clientHelpList.clientName).toBe('');
    });
  });
});
