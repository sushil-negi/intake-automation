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
      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
        <div
          className="bg-amber-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Step indicators */}
      <div className="flex justify-between gap-1">
        {steps.map((step, index) => (
          <button
            key={index}
            onClick={() => onStepClick(index)}
            className={`flex flex-col items-center min-w-0 flex-1 cursor-pointer group ${
              index <= currentStep ? 'text-amber-700' : 'text-gray-400'
            }`}
          >
            <div
              className={`w-9 h-9 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-all ${
                index === currentStep
                  ? 'bg-amber-600 text-white border-amber-600'
                  : index < currentStep
                  ? 'bg-amber-100 text-amber-700 border-amber-300'
                  : 'bg-gray-100 text-gray-400 border-gray-300'
              } group-hover:scale-110`}
            >
              {index < currentStep ? '✓' : index + 1}
            </div>
            <span className={`text-xs mt-1 text-center leading-tight truncate w-full px-0.5 sm:px-1 ${
              index === currentStep ? 'block' : 'hidden sm:block'
            }`}>
              {step.shortTitle}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
