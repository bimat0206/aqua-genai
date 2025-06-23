import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle } from 'lucide-react'; // Using CheckCircle for consistency

interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ steps, currentStep }) => {
  return (
    <div className="flex justify-between items-center px-2 md:px-4">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isActive = currentStep === stepNumber;
        const isComplete = currentStep > stepNumber;

        return (
          <React.Fragment key={step}>
            <div className="flex flex-col sm:flex-row items-center text-center sm:text-left">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 shadow-md",
                  isActive
                    ? "bg-gradient-to-r from-accent-gradient-from via-accent-gradient-via to-accent-gradient-to text-primary-foreground scale-110"
                    : isComplete
                    ? "bg-status-correct text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {isComplete && !isActive ? <CheckCircle size={18} className="text-primary-foreground" /> : stepNumber}
              </div>
              <p
                className={cn(
                  "mt-2 sm:mt-0 sm:ml-3 font-medium text-xs sm:text-sm transition-colors duration-300",
                   isActive || isComplete ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {step}
              </p>
            </div>
            {index < steps.length - 1 && (
              <div className={cn(
                "flex-1 h-0.5 mx-2 md:mx-4 transition-colors duration-300",
                 isComplete ? 
                    (currentStep === stepNumber + 1 ? "bg-gradient-to-r from-status-correct to-accent-gradient-from" : "bg-status-correct") 
                    : "bg-muted" // Was bg-border
                )}
              ></div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default StepIndicator;
