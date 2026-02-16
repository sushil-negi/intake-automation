export interface EmailConfig {
  /** Assessment email subject — supports {clientName}, {date}, {staffName} */
  assessmentSubjectTemplate: string;
  /** Assessment email body — supports {clientName}, {date}, {staffName} */
  assessmentBodyTemplate: string;
  /** Contract email subject — supports {clientName}, {date}, {staffName} */
  contractSubjectTemplate: string;
  /** Contract email body — supports {clientName}, {date}, {staffName} */
  contractBodyTemplate: string;
  /** Default CC address pre-filled in compose modal */
  defaultCc: string;
  /** Signature block appended to email body */
  emailSignature: string;
  /** When true, emails are wrapped in branded HTML template */
  htmlEnabled: boolean;
}

export const DEFAULT_EMAIL_CONFIG: EmailConfig = {
  assessmentSubjectTemplate: 'EHC Assessment Report - {clientName}',
  assessmentBodyTemplate:
    'Please find attached the EHC Assessment Report for {clientName}.\n\nGenerated on {date} by Executive Home Care.\n\nPrepared by: {staffName}',
  contractSubjectTemplate: 'EHC Service Contract - {clientName}',
  contractBodyTemplate:
    'Please find attached the EHC Service Contract for {clientName}.\n\nGenerated on {date} by Executive Home Care.\n\nPrepared by: {staffName}',
  defaultCc: '',
  emailSignature: '',
  htmlEnabled: true,
};
