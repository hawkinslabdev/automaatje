import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface WizardNavigationProps {
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  onNext: () => void;
  isLoading: boolean;
  canProceed: boolean;
}

export function WizardNavigation({
  currentStep,
  totalSteps,
  onBack,
  onNext,
  isLoading,
  canProceed,
}: WizardNavigationProps) {
  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === totalSteps;

  return (
    <div className="sticky bottom-0 flex items-center justify-between gap-4 border-t bg-background p-4">
      <Button
        type="button"
        variant="outline"
        onClick={onBack}
        disabled={isFirstStep || isLoading}
        className="gap-2"
      >
        <ChevronLeft className="h-4 w-4" />
        Vorige
      </Button>
      <Button
        type="button"
        onClick={onNext}
        disabled={!canProceed || isLoading}
        className="gap-2"
      >
        {isLoading ? (
          "Bezig..."
        ) : isLastStep ? (
          "Account aanmaken"
        ) : (
          <>
            Volgende
            <ChevronRight className="h-4 w-4" />
          </>
        )}
      </Button>
    </div>
  );
}
