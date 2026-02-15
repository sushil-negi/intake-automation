import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { z } from 'zod';
import { useStepValidation } from '../hooks/useStepValidation';

describe('useStepValidation', () => {
  // --- validate ---

  it('returns true and clears errors for valid data', () => {
    const schema = z.object({ name: z.string().min(1) });
    const { result } = renderHook(() => useStepValidation());

    let isValid: boolean;
    act(() => {
      isValid = result.current.validate(schema, { name: 'Alice' });
    });
    expect(isValid!).toBe(true);
    expect(result.current.errors).toEqual({});
  });

  it('returns false and sets field errors for invalid data', () => {
    const schema = z.object({
      name: z.string().min(1, 'Name is required'),
      age: z.number().min(0, 'Age must be positive'),
    });
    const { result } = renderHook(() => useStepValidation());

    let isValid: boolean;
    act(() => {
      isValid = result.current.validate(schema, { name: '', age: -1 });
    });
    expect(isValid!).toBe(false);
    expect(result.current.errors.name).toBe('Name is required');
    expect(result.current.errors.age).toBe('Age must be positive');
  });

  it('returns true and clears errors when schema is null', () => {
    const { result } = renderHook(() => useStepValidation());

    // First set some errors
    const schema = z.object({ name: z.string().min(1, 'Required') });
    act(() => {
      result.current.validate(schema, { name: '' });
    });
    expect(Object.keys(result.current.errors).length).toBeGreaterThan(0);

    // null schema clears
    let isValid: boolean;
    act(() => {
      isValid = result.current.validate(null, null);
    });
    expect(isValid!).toBe(true);
    expect(result.current.errors).toEqual({});
  });

  it('handles nested path errors (dot notation)', () => {
    const schema = z.object({
      customerInfo: z.object({
        firstName: z.string().min(1, 'First name required'),
        lastName: z.string().min(1, 'Last name required'),
      }),
    });
    const { result } = renderHook(() => useStepValidation());

    act(() => {
      result.current.validate(schema, { customerInfo: { firstName: '', lastName: '' } });
    });

    expect(result.current.errors['customerInfo.firstName']).toBe('First name required');
    expect(result.current.errors['customerInfo.lastName']).toBe('Last name required');
  });

  it('handles top-level refine errors with _form key', () => {
    const schema = z.object({
      password: z.string(),
      confirm: z.string(),
    }).refine(d => d.password === d.confirm, { message: 'Passwords must match' });

    const { result } = renderHook(() => useStepValidation());

    act(() => {
      result.current.validate(schema, { password: 'abc', confirm: 'xyz' });
    });

    expect(result.current.errors._form).toBe('Passwords must match');
  });

  it('only keeps first error per path', () => {
    const schema = z.object({
      email: z.string().min(1, 'Email required').email('Invalid email'),
    });
    const { result } = renderHook(() => useStepValidation());

    act(() => {
      result.current.validate(schema, { email: '' });
    });

    // Should have exactly one error for email (the first one)
    expect(result.current.errors.email).toBe('Email required');
  });

  // --- clearErrors ---

  it('clearErrors resets all errors', () => {
    const schema = z.object({ name: z.string().min(1, 'Required') });
    const { result } = renderHook(() => useStepValidation());

    act(() => {
      result.current.validate(schema, { name: '' });
    });
    expect(result.current.errors.name).toBe('Required');

    act(() => {
      result.current.clearErrors();
    });
    expect(result.current.errors).toEqual({});
  });

  it('clearErrors is a no-op when already empty (referential stability)', () => {
    const { result } = renderHook(() => useStepValidation());

    const before = result.current.errors;
    act(() => {
      result.current.clearErrors();
    });
    // Should be referentially identical (no unnecessary re-render)
    expect(result.current.errors).toBe(before);
  });

  // --- clearFieldErrors ---

  it('clearFieldErrors removes specific field errors', () => {
    const schema = z.object({
      name: z.string().min(1, 'Name required'),
      email: z.string().min(1, 'Email required'),
    });
    const { result } = renderHook(() => useStepValidation());

    act(() => {
      result.current.validate(schema, { name: '', email: '' });
    });
    expect(result.current.errors.name).toBe('Name required');
    expect(result.current.errors.email).toBe('Email required');

    act(() => {
      result.current.clearFieldErrors(['name']);
    });
    expect(result.current.errors.name).toBeUndefined();
    expect(result.current.errors.email).toBe('Email required');
  });

  it('clearFieldErrors clears nested paths when parent field specified', () => {
    const schema = z.object({
      customerInfo: z.object({
        firstName: z.string().min(1, 'Required'),
        lastName: z.string().min(1, 'Required'),
      }),
    });
    const { result } = renderHook(() => useStepValidation());

    act(() => {
      result.current.validate(schema, { customerInfo: { firstName: '', lastName: '' } });
    });
    expect(result.current.errors['customerInfo.firstName']).toBe('Required');
    expect(result.current.errors['customerInfo.lastName']).toBe('Required');

    // Clearing 'customerInfo' should clear both nested paths
    act(() => {
      result.current.clearFieldErrors(['customerInfo']);
    });
    expect(result.current.errors['customerInfo.firstName']).toBeUndefined();
    expect(result.current.errors['customerInfo.lastName']).toBeUndefined();
  });

  it('clearFieldErrors also clears _form error', () => {
    const schema = z.object({
      a: z.string(),
    }).refine(() => false, { message: 'Form error' });

    const { result } = renderHook(() => useStepValidation());

    act(() => {
      result.current.validate(schema, { a: 'x' });
    });
    expect(result.current.errors._form).toBe('Form error');

    act(() => {
      result.current.clearFieldErrors(['a']);
    });
    expect(result.current.errors._form).toBeUndefined();
  });

  it('clearFieldErrors is a no-op when no matching fields', () => {
    const schema = z.object({
      name: z.string().min(1, 'Required'),
    });
    const { result } = renderHook(() => useStepValidation());

    act(() => {
      result.current.validate(schema, { name: '' });
    });
    const before = result.current.errors;

    act(() => {
      result.current.clearFieldErrors(['nonexistent']);
    });
    // Should be referentially identical
    expect(result.current.errors).toBe(before);
  });
});
