import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRef } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';

describe('useFocusTrap', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('focuses the first focusable element on mount', () => {
    const btn1 = document.createElement('button');
    btn1.textContent = 'First';
    const btn2 = document.createElement('button');
    btn2.textContent = 'Second';
    container.appendChild(btn1);
    container.appendChild(btn2);

    renderHook(() => {
      const ref = useRef<HTMLDivElement>(container);
      useFocusTrap(ref);
    });

    expect(document.activeElement).toBe(btn1);
    document.body.removeChild(container);
  });

  it('wraps Tab from last element to first', () => {
    const btn1 = document.createElement('button');
    btn1.textContent = 'First';
    const btn2 = document.createElement('button');
    btn2.textContent = 'Last';
    container.appendChild(btn1);
    container.appendChild(btn2);

    renderHook(() => {
      const ref = useRef<HTMLDivElement>(container);
      useFocusTrap(ref);
    });

    // Focus the last element
    btn2.focus();
    expect(document.activeElement).toBe(btn2);

    // Simulate Tab on last element
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
    document.dispatchEvent(event);

    expect(document.activeElement).toBe(btn1);
    document.body.removeChild(container);
  });

  it('wraps Shift+Tab from first element to last', () => {
    const btn1 = document.createElement('button');
    btn1.textContent = 'First';
    const btn2 = document.createElement('button');
    btn2.textContent = 'Last';
    container.appendChild(btn1);
    container.appendChild(btn2);

    renderHook(() => {
      const ref = useRef<HTMLDivElement>(container);
      useFocusTrap(ref);
    });

    // Focus is on first element (auto-focused on mount)
    expect(document.activeElement).toBe(btn1);

    // Simulate Shift+Tab on first element
    const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true });
    document.dispatchEvent(event);

    expect(document.activeElement).toBe(btn2);
    document.body.removeChild(container);
  });

  it('restores focus to previously focused element on unmount', () => {
    const outsideButton = document.createElement('button');
    outsideButton.textContent = 'Outside';
    document.body.appendChild(outsideButton);
    outsideButton.focus();
    expect(document.activeElement).toBe(outsideButton);

    const btn1 = document.createElement('button');
    btn1.textContent = 'Inside';
    container.appendChild(btn1);

    const { unmount } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(container);
      useFocusTrap(ref);
    });

    // Focus should have moved inside
    expect(document.activeElement).toBe(btn1);

    // On unmount, focus should restore
    unmount();
    expect(document.activeElement).toBe(outsideButton);

    document.body.removeChild(container);
    document.body.removeChild(outsideButton);
  });
});
