import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('logger', () => {
  const origConsole = { log: console.log, warn: console.warn, error: console.error };

  beforeEach(() => {
    console.log = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();
    // Reset module cache so __DEV__ is re-evaluated
    vi.resetModules();
  });

  afterEach(() => {
    console.log = origConsole.log;
    console.warn = origConsole.warn;
    console.error = origConsole.error;
  });

  it('logger.log calls console.log in dev mode', async () => {
    // @ts-expect-error — global __DEV__ set by Vite define
    globalThis.__DEV__ = true;
    const { logger } = await import('../utils/logger');
    logger.log('test message');
    expect(console.log).toHaveBeenCalledWith('test message');
  });

  it('logger.warn calls console.warn in dev mode', async () => {
    // @ts-expect-error — global __DEV__ set by Vite define
    globalThis.__DEV__ = true;
    const { logger } = await import('../utils/logger');
    logger.warn('warning!');
    expect(console.warn).toHaveBeenCalledWith('warning!');
  });

  it('logger.error calls console.error in dev mode', async () => {
    // @ts-expect-error — global __DEV__ set by Vite define
    globalThis.__DEV__ = true;
    const { logger } = await import('../utils/logger');
    logger.error('error!', { code: 42 });
    expect(console.error).toHaveBeenCalledWith('error!', { code: 42 });
  });

  it('logger methods are silent when __DEV__ is false', async () => {
    // @ts-expect-error — global __DEV__ set by Vite define
    globalThis.__DEV__ = false;
    const { logger } = await import('../utils/logger');
    logger.log('nope');
    logger.warn('nope');
    logger.error('nope');
    expect(console.log).not.toHaveBeenCalled();
    expect(console.warn).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });
});
