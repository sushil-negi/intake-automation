export interface AuthUser {
  email: string;
  name: string;
  picture: string;
  loginTime: number; // Date.now() epoch ms — for max session duration enforcement
}

export interface AuthConfig {
  requireAuth: boolean;
  allowedEmails: string[];
  idleTimeoutMinutes: number;
}

export const DEFAULT_AUTH_CONFIG: AuthConfig = {
  requireAuth: true,
  allowedEmails: [],
  idleTimeoutMinutes: 15,
};
