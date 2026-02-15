interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md';
}

export function LoadingSpinner({ message = 'Loading...', size = 'md' }: LoadingSpinnerProps) {
  const dotSize = size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8" role="status" aria-label={message}>
      <div className="flex gap-1.5">
        <span className={`${dotSize} rounded-full bg-amber-400 animate-bounce motion-reduce:animate-none`} style={{ animationDelay: '0ms' }} />
        <span className={`${dotSize} rounded-full bg-amber-400 animate-bounce motion-reduce:animate-none`} style={{ animationDelay: '150ms' }} />
        <span className={`${dotSize} rounded-full bg-amber-400 animate-bounce motion-reduce:animate-none`} style={{ animationDelay: '300ms' }} />
      </div>
      <span className={`${textSize} text-gray-500 dark:text-slate-400`}>{message}</span>
    </div>
  );
}
