import { useState, useCallback } from 'react';

export function useFormWizard(totalSteps: number) {
  const [currentStep, setCurrentStep] = useState(0);

  const goNext = useCallback(() => {
    setCurrentStep(prev => Math.min(prev + 1, totalSteps - 1));
  }, [totalSteps]);

  const goBack = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  }, []);

  const goToStep = useCallback((step: number) => {
    if (step >= 0 && step < totalSteps) {
      setCurrentStep(step);
    }
  }, [totalSteps]);

  return {
    currentStep,
    goNext,
    goBack,
    goToStep,
    isFirst: currentStep === 0,
    isLast: currentStep === totalSteps - 1,
    totalSteps,
    progress: ((currentStep + 1) / totalSteps) * 100,
  };
}
