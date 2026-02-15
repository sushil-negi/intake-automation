declare const __DEV__: boolean;

/** Dev-only logger — all output is stripped in production builds */
export const logger = {
  error(...args: unknown[]) {
    if (__DEV__) console.error(...args);
  },
  warn(...args: unknown[]) {
    if (__DEV__) console.warn(...args);
  },
  log(...args: unknown[]) {
    if (__DEV__) console.log(...args);
  },
};
