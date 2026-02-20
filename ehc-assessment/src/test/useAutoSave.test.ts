import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import 'fake-indexeddb/auto';

// Must mock crypto BEFORE importing useAutoSave so the module-level imports resolve
vi.mock('../utils/crypto', () => ({
  encryptObject: vi.fn(async (obj: unknown) => `ENC:${JSON.stringify(obj)}`),
  decryptObject: vi.fn(async <T>(str: string): Promise<T> => JSON.parse(str.replace('ENC:', '')) as T),
  isEncrypted: vi.fn((str: string) => str.startsWith('ENC:')),
}));
vi.mock('../utils/auditLog', () => ({
  logAudit: vi.fn(),
}));
vi.mock('../utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), log: vi.fn() },
}));

import { useAutoSave } from '../hooks/useAutoSave';
import { encryptObject, decryptObject, isEncrypted } from '../utils/crypto';
import { logAudit } from '../utils/auditLog';

const STORAGE_KEY = 'test-auto-save';

interface TestData {
  sectionA: { name: string; age: number };
  sectionB: { items: string[] };
}

const INITIAL: TestData = {
  sectionA: { name: '', age: 0 },
  sectionB: { items: [] },
};

// --- Initialization tests (real timers — waitFor needs real polling) ---

describe('useAutoSave — initialization', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    indexedDB = new IDBFactory();
  });

  it('resolves to isLoading=false with initial data after async init', async () => {
    const { result } = renderHook(() => useAutoSave<TestData>(INITIAL, STORAGE_KEY));

    // Wait for async init to complete
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(INITIAL);
    expect(result.current.isDirty).toBe(false);
  });

  it('loads and decrypts existing encrypted localStorage data on mount', async () => {
    const saved: TestData = { sectionA: { name: 'Alice', age: 30 }, sectionB: { items: ['x'] } };
    localStorage.setItem(STORAGE_KEY, `ENC:${JSON.stringify(saved)}`);

    const { result } = renderHook(() => useAutoSave<TestData>(INITIAL, STORAGE_KEY));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(decryptObject).toHaveBeenCalledWith(`ENC:${JSON.stringify(saved)}`);
    expect(result.current.data.sectionA.name).toBe('Alice');
    expect(result.current.data.sectionA.age).toBe(30);
    expect(result.current.isDirty).toBe(true);
  });

  it('loads plaintext JSON and encrypts it in place (migration)', async () => {
    const saved: TestData = { sectionA: { name: 'Bob', age: 25 }, sectionB: { items: [] } };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));

    const { result } = renderHook(() => useAutoSave<TestData>(INITIAL, STORAGE_KEY));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data.sectionA.name).toBe('Bob');
    // Should have encrypted the plaintext in-place
    expect(encryptObject).toHaveBeenCalledWith(saved);
    const stored = localStorage.getItem(STORAGE_KEY);
    expect(stored).toMatch(/^ENC:/);
  });

  it('handles corrupted localStorage gracefully', async () => {
    localStorage.setItem(STORAGE_KEY, 'not-json-not-encrypted');

    const { result } = renderHook(() => useAutoSave<TestData>(INITIAL, STORAGE_KEY));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    // Should fall back to initial data
    expect(result.current.data).toEqual(INITIAL);
  });

  it('deep-merges saved data with initial data (migration)', async () => {
    // Saved data is missing sectionB (simulates schema evolution)
    const saved = { sectionA: { name: 'Carol', age: 40 } };
    localStorage.setItem(STORAGE_KEY, `ENC:${JSON.stringify(saved)}`);

    const { result } = renderHook(() => useAutoSave<TestData>(INITIAL, STORAGE_KEY));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    // sectionA should have saved values
    expect(result.current.data.sectionA.name).toBe('Carol');
    // sectionB should get defaults from INITIAL
    expect(result.current.data.sectionB).toEqual({ items: [] });
  });

  it('hasDraft returns true when localStorage has data', async () => {
    localStorage.setItem(STORAGE_KEY, `ENC:${JSON.stringify(INITIAL)}`);

    const { result } = renderHook(() => useAutoSave<TestData>(INITIAL, STORAGE_KEY));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasDraft()).toBe(true);
  });

  it('hasDraft returns false when localStorage is empty', async () => {
    const { result } = renderHook(() => useAutoSave<TestData>(INITIAL, STORAGE_KEY));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasDraft()).toBe(false);
  });

  it('logs audit error when plaintext migration encryption fails', async () => {
    const saved: TestData = { sectionA: { name: 'Migr', age: 1 }, sectionB: { items: [] } };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));

    // isEncrypted returns false for plaintext, then encryptObject fails during migration
    vi.mocked(isEncrypted).mockReturnValueOnce(false);
    vi.mocked(encryptObject).mockRejectedValueOnce(new Error('Migration failed'));

    renderHook(() => useAutoSave<TestData>(INITIAL, STORAGE_KEY));

    await waitFor(() => {
      expect(logAudit).toHaveBeenCalledWith(
        'error',
        STORAGE_KEY,
        expect.stringContaining('PHI migration encryption failed'),
        'failure',
      );
    });
  });
});

// --- Mutation + debounce tests (fake timers for debounce control) ---

describe('useAutoSave — mutations & debounce', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    indexedDB = new IDBFactory();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /** Helper: render hook with real timers for init, then switch to fake timers */
  async function renderAndInit() {
    const hook = renderHook(() => useAutoSave<TestData>(INITIAL, STORAGE_KEY));
    await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
    vi.useFakeTimers();
    vi.clearAllMocks();
    return hook;
  }

  it('updateData with partial object merges into existing data', async () => {
    const { result } = await renderAndInit();

    act(() => {
      result.current.updateData({ sectionA: { name: 'Dave', age: 50 } });
    });

    expect(result.current.data.sectionA.name).toBe('Dave');
    expect(result.current.data.sectionA.age).toBe(50);
    expect(result.current.isDirty).toBe(true);
  });

  it('updateData with function updater works correctly', async () => {
    const { result } = await renderAndInit();

    act(() => {
      result.current.updateData(prev => ({
        ...prev,
        sectionA: { ...prev.sectionA, name: 'Eve' },
      }));
    });

    expect(result.current.data.sectionA.name).toBe('Eve');
  });

  it('updateData with silent option does not set isDirty', async () => {
    const { result } = await renderAndInit();

    act(() => {
      result.current.updateData({ sectionA: { name: 'Frank', age: 1 } }, { silent: true });
    });

    expect(result.current.data.sectionA.name).toBe('Frank');
    expect(result.current.isDirty).toBe(false);
  });

  it('debounces save to localStorage with 500ms delay', async () => {
    const { result } = await renderAndInit();

    act(() => {
      result.current.updateData({ sectionA: { name: 'Grace', age: 1 } });
    });

    // Before debounce fires, encryptObject should not be called for save
    expect(encryptObject).not.toHaveBeenCalled();

    // Advance past debounce
    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    expect(encryptObject).toHaveBeenCalledWith(
      expect.objectContaining({ sectionA: { name: 'Grace', age: 1 } }),
    );
  });

  it('coalesces rapid updates into single save', async () => {
    const { result } = await renderAndInit();

    act(() => {
      result.current.updateData({ sectionA: { name: 'A', age: 1 } });
    });
    act(() => {
      result.current.updateData({ sectionA: { name: 'B', age: 2 } });
    });
    act(() => {
      result.current.updateData({ sectionA: { name: 'C', age: 3 } });
    });

    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    // Only the last value should be saved (debounce coalesced)
    const calls = vi.mocked(encryptObject).mock.calls;
    // Should have at least one call, and the last call should have name='C'
    const lastCall = calls[calls.length - 1][0] as TestData;
    expect(lastCall.sectionA.name).toBe('C');
  });

  it('sets lastSaved after successful save', async () => {
    const { result } = await renderAndInit();

    expect(result.current.lastSaved).toBeNull();

    act(() => {
      result.current.updateData({ sectionA: { name: 'Hank', age: 1 } });
    });

    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    expect(result.current.lastSaved).toBeInstanceOf(Date);
  });

  it('clearDraft removes from localStorage and resets to initial data', async () => {
    // Pre-seed localStorage before init
    localStorage.setItem(STORAGE_KEY, `ENC:${JSON.stringify({ sectionA: { name: 'Ivy', age: 1 }, sectionB: { items: [] } })}`);
    vi.useRealTimers(); // Need real timers for init

    const { result } = renderHook(() => useAutoSave<TestData>(INITIAL, STORAGE_KEY));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data.sectionA.name).toBe('Ivy');

    act(() => {
      result.current.clearDraft();
    });

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(result.current.data).toEqual(INITIAL);
    expect(result.current.isDirty).toBe(false);
    expect(result.current.lastSaved).toBeNull();
  });

  it('clearDraft cancels pending debounced save (no write-back to localStorage)', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useAutoSave<TestData>(INITIAL, STORAGE_KEY));

    // Complete async init
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });

    // Trigger an update — this schedules a debounced save (500ms)
    act(() => {
      result.current.updateData({ sectionA: { name: 'Pending', age: 1 } });
    });

    // Immediately clear — should cancel the pending debounce
    act(() => {
      result.current.clearDraft();
    });

    // Advance past the debounce window
    await act(async () => { await vi.advanceTimersByTimeAsync(600); });

    // localStorage should still be empty — the debounced save was cancelled
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(result.current.isSaving).toBe(false);

    vi.useRealTimers();
  });

  it('logs audit error when encryption fails during save', async () => {
    const { result } = await renderAndInit();

    vi.mocked(encryptObject).mockRejectedValueOnce(new Error('Key generation failed'));

    act(() => {
      result.current.updateData({ sectionA: { name: 'Error', age: 0 } });
    });

    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    expect(logAudit).toHaveBeenCalledWith(
      'error',
      STORAGE_KEY,
      expect.stringContaining('Auto-save encryption failed'),
      'failure',
    );
  });
});

// --- onAfterSave callback (AutoSaveOptions) ---

describe('useAutoSave — onAfterSave callback', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    indexedDB = new IDBFactory();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('accepts AutoSaveOptions object with storageKey', async () => {
    const { result } = renderHook(() =>
      useAutoSave<TestData>(INITIAL, { storageKey: STORAGE_KEY }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(INITIAL);
  });

  it('fires onAfterSave after successful debounced save', async () => {
    const onAfterSave = vi.fn();
    const hook = renderHook(() =>
      useAutoSave<TestData>(INITIAL, { storageKey: STORAGE_KEY, onAfterSave }),
    );
    await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
    vi.useFakeTimers();
    vi.clearAllMocks();

    act(() => {
      hook.result.current.updateData({ sectionA: { name: 'Sync', age: 99 } });
    });

    // Before debounce fires
    expect(onAfterSave).not.toHaveBeenCalled();

    // Advance past debounce (500ms)
    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    expect(onAfterSave).toHaveBeenCalledTimes(1);
    const savedData = onAfterSave.mock.calls[0][0] as TestData;
    expect(savedData.sectionA.name).toBe('Sync');
  });

  it('does not fire onAfterSave when encryption fails', async () => {
    const onAfterSave = vi.fn();
    const hook = renderHook(() =>
      useAutoSave<TestData>(INITIAL, { storageKey: STORAGE_KEY, onAfterSave }),
    );
    await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
    vi.useFakeTimers();
    vi.clearAllMocks();

    vi.mocked(encryptObject).mockRejectedValueOnce(new Error('Fail'));

    act(() => {
      hook.result.current.updateData({ sectionA: { name: 'Bad', age: 0 } });
    });

    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    expect(onAfterSave).not.toHaveBeenCalled();
  });

  it('still works with legacy string storageKey argument', async () => {
    const { result } = renderHook(() => useAutoSave<TestData>(INITIAL, STORAGE_KEY));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(INITIAL);
  });

  it('defaults to DEFAULT_STORAGE_KEY when no options provided', async () => {
    const { result } = renderHook(() => useAutoSave<TestData>(INITIAL));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(INITIAL);
  });
});
