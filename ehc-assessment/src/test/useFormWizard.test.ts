import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFormWizard } from '../hooks/useFormWizard';

describe('useFormWizard', () => {
  const TOTAL = 7;

  it('starts at step 0 by default', () => {
    const { result } = renderHook(() => useFormWizard(TOTAL));
    expect(result.current.currentStep).toBe(0);
    expect(result.current.isFirst).toBe(true);
    expect(result.current.isLast).toBe(false);
    expect(result.current.totalSteps).toBe(TOTAL);
  });

  it('respects initialStep parameter', () => {
    const { result } = renderHook(() => useFormWizard(TOTAL, 3));
    expect(result.current.currentStep).toBe(3);
    expect(result.current.isFirst).toBe(false);
    expect(result.current.isLast).toBe(false);
  });

  it('clamps initialStep to valid range (negative)', () => {
    const { result } = renderHook(() => useFormWizard(TOTAL, -1));
    expect(result.current.currentStep).toBe(0);
  });

  it('clamps initialStep to valid range (beyond max)', () => {
    const { result } = renderHook(() => useFormWizard(TOTAL, 100));
    expect(result.current.currentStep).toBe(0);
  });

  it('handles undefined initialStep', () => {
    const { result } = renderHook(() => useFormWizard(TOTAL, undefined));
    expect(result.current.currentStep).toBe(0);
  });

  // --- goNext ---

  it('goNext advances by 1', () => {
    const { result } = renderHook(() => useFormWizard(TOTAL));
    act(() => result.current.goNext());
    expect(result.current.currentStep).toBe(1);
    expect(result.current.isFirst).toBe(false);
  });

  it('goNext does not exceed last step', () => {
    const { result } = renderHook(() => useFormWizard(TOTAL, TOTAL - 1));
    expect(result.current.isLast).toBe(true);

    act(() => result.current.goNext());
    expect(result.current.currentStep).toBe(TOTAL - 1);
    expect(result.current.isLast).toBe(true);
  });

  // --- goBack ---

  it('goBack decrements by 1', () => {
    const { result } = renderHook(() => useFormWizard(TOTAL, 3));
    act(() => result.current.goBack());
    expect(result.current.currentStep).toBe(2);
  });

  it('goBack does not go below 0', () => {
    const { result } = renderHook(() => useFormWizard(TOTAL, 0));
    act(() => result.current.goBack());
    expect(result.current.currentStep).toBe(0);
    expect(result.current.isFirst).toBe(true);
  });

  // --- goToStep ---

  it('goToStep navigates to a valid step', () => {
    const { result } = renderHook(() => useFormWizard(TOTAL));
    act(() => result.current.goToStep(5));
    expect(result.current.currentStep).toBe(5);
  });

  it('goToStep ignores invalid negative step', () => {
    const { result } = renderHook(() => useFormWizard(TOTAL, 3));
    act(() => result.current.goToStep(-1));
    expect(result.current.currentStep).toBe(3);
  });

  it('goToStep ignores step >= totalSteps', () => {
    const { result } = renderHook(() => useFormWizard(TOTAL, 3));
    act(() => result.current.goToStep(TOTAL));
    expect(result.current.currentStep).toBe(3);
  });

  it('goToStep allows step 0', () => {
    const { result } = renderHook(() => useFormWizard(TOTAL, 5));
    act(() => result.current.goToStep(0));
    expect(result.current.currentStep).toBe(0);
    expect(result.current.isFirst).toBe(true);
  });

  // --- progress ---

  it('calculates progress correctly at step 0', () => {
    const { result } = renderHook(() => useFormWizard(TOTAL));
    expect(result.current.progress).toBeCloseTo((1 / TOTAL) * 100);
  });

  it('calculates progress correctly at last step', () => {
    const { result } = renderHook(() => useFormWizard(TOTAL, TOTAL - 1));
    expect(result.current.progress).toBe(100);
  });

  it('calculates progress correctly at middle step', () => {
    const { result } = renderHook(() => useFormWizard(TOTAL, 3));
    expect(result.current.progress).toBeCloseTo((4 / TOTAL) * 100);
  });

  // --- isFirst / isLast ---

  it('isFirst is true only at step 0', () => {
    const { result } = renderHook(() => useFormWizard(TOTAL));
    expect(result.current.isFirst).toBe(true);
    act(() => result.current.goNext());
    expect(result.current.isFirst).toBe(false);
  });

  it('isLast is true only at last step', () => {
    const { result } = renderHook(() => useFormWizard(TOTAL, TOTAL - 2));
    expect(result.current.isLast).toBe(false);
    act(() => result.current.goNext());
    expect(result.current.isLast).toBe(true);
  });

  // --- Edge case: single step wizard ---

  it('handles single-step wizard', () => {
    const { result } = renderHook(() => useFormWizard(1));
    expect(result.current.currentStep).toBe(0);
    expect(result.current.isFirst).toBe(true);
    expect(result.current.isLast).toBe(true);
    expect(result.current.progress).toBe(100);

    act(() => result.current.goNext());
    expect(result.current.currentStep).toBe(0);

    act(() => result.current.goBack());
    expect(result.current.currentStep).toBe(0);
  });
});
