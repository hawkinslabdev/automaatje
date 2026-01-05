"use client";

import { Check } from "lucide-react";
import { useEffect, useRef } from "react";

interface WizardStepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export function WizardStepIndicator({ currentStep, totalSteps }: WizardStepIndicatorProps) {
  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1);
  const containerRef = useRef<HTMLDivElement>(null);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    // Scroll the current step into view
    const currentStepElement = stepRefs.current[currentStep - 1];
    if (currentStepElement && containerRef.current) {
      currentStepElement.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [currentStep]);

  return (
    <div 
      ref={containerRef}
      className="flex items-center justify-start sm:justify-center gap-1 sm:gap-2 overflow-x-auto pb-2 px-4 scrollbar-hide snap-x snap-mandatory scroll-smooth"
      style={{
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
    >
      {steps.map((step, index) => (
        <div 
          key={step} 
          ref={(el) => { stepRefs.current[index] = el; }}
          className="flex items-center flex-shrink-0 snap-center"
        >
          <div className="flex flex-col items-center">
            <div
              className={`flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full border-2 transition-colors ${
                step < currentStep
                  ? "border-primary bg-primary text-primary-foreground"
                  : step === currentStep
                  ? "border-primary bg-background text-primary"
                  : "border-muted bg-background text-muted-foreground"
              }`}
            >
              {step < currentStep ? (
                <Check className="h-4 w-4 sm:h-5 sm:w-5" />
              ) : (
                <span className="text-xs sm:text-sm font-medium">{step}</span>
              )}
            </div>
            <span className="mt-1 text-[10px] sm:text-xs text-muted-foreground hidden sm:inline whitespace-nowrap">
              Stap {step}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div
              className={`mx-1 sm:mx-2 h-0.5 w-4 sm:w-8 flex-shrink-0 ${
                step < currentStep ? "bg-primary" : "bg-muted"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
