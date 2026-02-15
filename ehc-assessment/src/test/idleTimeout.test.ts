import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIdleTimeout } from '../hooks/useIdleTimeout';

describe('useIdleTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not fire callbacks when enabled=false', () => {
    const onWarning = vi.fn();
    const onTimeout = vi.fn();

    renderHook(() =>
      useIdleTimeout({
        timeoutMs: 10_000,
        warningMs: 3_000,
        onWarning,
        onTimeout,
        enabled: false,
      }),
    );

    vi.advanceTimersByTime(15_000);
    expect(onWarning).not.toHaveBeenCalled();
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('fires onWarning when approaching timeout', () => {
    const onWarning = vi.fn();
    const onTimeout = vi.fn();

    renderHook(() =>
      useIdleTimeout({
        timeoutMs: 20_000,
        warningMs: 5_000,
        onWarning,
        onTimeout,
        enabled: true,
      }),
    );

    // Warning threshold is 20000 - 5000 = 15000ms. Check interval is 5s.
    // At 15s tick, elapsed=15s, remaining=5s <= warningMs → fires warning
    act(() => { vi.advanceTimersByTime(16_000); });
    expect(onWarning).toHaveBeenCalledTimes(1);
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('fires onTimeout after full timeout period', () => {
    const onWarning = vi.fn();
    const onTimeout = vi.fn();

    renderHook(() =>
      useIdleTimeout({
        timeoutMs: 20_000,
        warningMs: 5_000,
        onWarning,
        onTimeout,
        enabled: true,
      }),
    );

    act(() => { vi.advanceTimersByTime(21_000); });
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('resets timer on resetTimer() call', () => {
    const onWarning = vi.fn();
    const onTimeout = vi.fn();

    const { result } = renderHook(() =>
      useIdleTimeout({
        timeoutMs: 20_000,
        warningMs: 5_000,
        onWarning,
        onTimeout,
        enabled: true,
      }),
    );

    // Advance 16s (past warning threshold at 15s)
    act(() => { vi.advanceTimersByTime(16_000); });
    expect(onWarning).toHaveBeenCalledTimes(1);

    // Reset timer
    act(() => { result.current.resetTimer(); });

    // Advance another 16s from reset — should not timeout (only 16s of 20s)
    act(() => { vi.advanceTimersByTime(16_000); });
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('returns isWarning=false initially', () => {
    const { result } = renderHook(() =>
      useIdleTimeout({
        timeoutMs: 10_000,
        warningMs: 3_000,
        onWarning: vi.fn(),
        onTimeout: vi.fn(),
        enabled: true,
      }),
    );

    expect(result.current.isWarning).toBe(false);
  });
});
