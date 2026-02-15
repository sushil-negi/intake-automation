import { useEffect, useRef, useState, useCallback } from 'react';

interface UseIdleTimeoutOptions {
  /** Total idle time in ms before auto-lock (e.g. 15 * 60 * 1000) */
  timeoutMs: number;
  /** Show warning this many ms before timeout (e.g. 2 * 60 * 1000) */
  warningMs: number;
  /** Called when warning threshold is reached */
  onWarning: () => void;
  /** Called when idle timeout fires */
  onTimeout: () => void;
  /** Only active when true (e.g. when auth is required and user is logged in) */
  enabled: boolean;
}

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'] as const;
const CHECK_INTERVAL_MS = 5_000; // check every 5 seconds
const THROTTLE_MS = 1_000; // update lastActivity at most once per second

export function useIdleTimeout({ timeoutMs, warningMs, onWarning, onTimeout, enabled }: UseIdleTimeoutOptions) {
  const lastActivityRef = useRef(Date.now());
  const throttleRef = useRef(0);
  const warningFiredRef = useRef(false);
  const [isWarning, setIsWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  // Stable callback refs to avoid re-subscribing event listeners
  const onWarningRef = useRef(onWarning);
  onWarningRef.current = onWarning;
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    warningFiredRef.current = false;
    setIsWarning(false);
    setRemainingSeconds(0);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const handleActivity = () => {
      const now = Date.now();
      if (now - throttleRef.current < THROTTLE_MS) return;
      throttleRef.current = now;
      lastActivityRef.current = now;

      // If warning was showing and user became active, dismiss it
      if (warningFiredRef.current) {
        warningFiredRef.current = false;
        setIsWarning(false);
        setRemainingSeconds(0);
      }
    };

    // Attach event listeners
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, handleActivity, { passive: true });
    }

    // Periodic check
    const intervalId = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      const remaining = timeoutMs - elapsed;

      if (remaining <= 0) {
        // Timeout reached
        clearInterval(intervalId);
        setIsWarning(false);
        onTimeoutRef.current();
        return;
      }

      if (remaining <= warningMs && !warningFiredRef.current) {
        // Enter warning state
        warningFiredRef.current = true;
        setIsWarning(true);
        onWarningRef.current();
      }

      if (warningFiredRef.current) {
        setRemainingSeconds(Math.ceil(remaining / 1000));
      }
    }, CHECK_INTERVAL_MS);

    // Reset on mount
    lastActivityRef.current = Date.now();
    warningFiredRef.current = false;

    return () => {
      clearInterval(intervalId);
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, handleActivity);
      }
    };
  }, [enabled, timeoutMs, warningMs]);

  return { resetTimer, isWarning, remainingSeconds };
}
