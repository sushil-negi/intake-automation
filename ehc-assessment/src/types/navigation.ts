import type { AssessmentFormData } from './forms';

export type AppView =
  | { screen: 'dashboard' }
  | { screen: 'assessment'; draftId?: string; resumeStep?: number }
  | { screen: 'serviceContract'; draftId?: string; prefillFrom?: AssessmentFormData; resumeStep?: number; linkedAssessmentId?: string }
  | { screen: 'drafts' }
  | { screen: 'settings' }
  | { screen: 'admin' };
