interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  steps: { shortTitle: string }[];
  onStepClick: (step: number) => void;
}

export function ProgressBar({ currentStep, totalSteps, steps, onStepClick }: ProgressBarProps) {
  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className="w-full">
      {/* Progress bar */}
      <div
        className="w-full bg-white/15 rounded-full h-1.5 mb-3 sm:mb-4"
        role="progressbar"
        aria-valuenow={currentStep + 1}
        aria-valuemin={1}
        aria-valuemax={totalSteps}
        aria-label={`Step ${currentStep + 1} of ${totalSteps}`}
      >
        <div
          className="h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${progress}%`, backgroundColor: '#e8a838' }}
        />
      </div>

      {/* Step indicators — compact dots on mobile, full labels on sm+ */}
      <nav aria-label="Form steps">
        <div className="flex justify-between gap-1">
          {steps.map((step, index) => (
            <button
              key={index}
              onClick={() => onStepClick(index)}
              aria-label={`Step ${index + 1}: ${step.shortTitle}${index < currentStep ? ' (completed)' : index === currentStep ? ' (current)' : ''}`}
              aria-current={index === currentStep ? 'step' : undefined}
              className={`flex flex-col items-center min-w-0 flex-1 cursor-pointer group ${
                index <= currentStep ? 'text-white' : 'text-white/90'
              }`}
            >
              {/* Compact dot on mobile, numbered circle on sm+ */}
              <div
                className={`
                  w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center
                  text-[10px] sm:text-sm font-medium border-2 transition-all
                  ${index === currentStep
                    ? 'text-white border-white/80'
                    : index < currentStep
                    ? 'text-white/90 border-white/30 bg-white/10'
                    : 'text-white/90 border-white/25'
                  } group-hover:scale-110
                `}
                style={index === currentStep ? { backgroundColor: '#8a6212' } : undefined}
              >
                {index < currentStep ? '✓' : index + 1}
              </div>
              <span className={`text-[10px] sm:text-xs mt-0.5 sm:mt-1 text-center leading-tight truncate w-full px-0.5 sm:px-1 ${
                index === currentStep ? 'block' : 'hidden sm:block'
              }`}>
                {step.shortTitle}
              </span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
