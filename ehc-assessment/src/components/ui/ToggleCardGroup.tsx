import { useRef } from 'react';

interface ToggleCardGroupProps {
  children: React.ReactNode;
  label: string;
  className?: string;
}

/**
 * Wrapper for groups of ToggleCards providing arrow key navigation.
 * ArrowDown/ArrowUp move focus between cards within the group.
 */
export function ToggleCardGroup({ children, label, className = '' }: ToggleCardGroupProps) {
  const groupRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();

    const cards = groupRef.current?.querySelectorAll('[data-toggle-card]');
    if (!cards || cards.length === 0) return;

    const cardArray = Array.from(cards);
    const current = cardArray.indexOf(document.activeElement as Element);
    if (current === -1) return;

    const next = e.key === 'ArrowDown'
      ? (current + 1) % cards.length
      : (current - 1 + cards.length) % cards.length;

    (cards[next] as HTMLElement).focus();
  };

  return (
    <div
      ref={groupRef}
      role="group"
      aria-label={label}
      onKeyDown={handleKeyDown}
      className={className}
    >
      {children}
    </div>
  );
}
