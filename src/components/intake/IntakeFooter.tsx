"use client";

interface IntakeFooterProps {
  step: number;
  totalSteps: number;
  canContinue: boolean;
  onContinue: () => void;
  onBack?: () => void;
}

export default function IntakeFooter({ step, totalSteps, canContinue, onContinue, onBack }: IntakeFooterProps) {
  const progress = (step / totalSteps) * 100;

  return (
    <div className="flex items-center justify-between gap-6 mt-2 animate-fade-up-4">
      <div className="flex-1 flex flex-col gap-2">
        <div className="h-1 bg-tear-border rounded-full overflow-hidden">
          <div
            className="h-full bg-tear-primary rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs text-[#A89890] font-normal">{step} of {totalSteps} steps complete</span>
      </div>

      <div className="flex items-center gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="px-5 py-3.5 text-[15px] font-medium text-tear-muted hover:text-tear-text transition-colors duration-150"
          >
            ← Back
          </button>
        )}
        <button
          onClick={onContinue}
          disabled={!canContinue}
          className={`
            px-7 py-3.5 text-[15px] font-medium text-white rounded-lg border-none
            transition-all duration-150 whitespace-nowrap
            ${canContinue
              ? "bg-tear-primary hover:bg-tear-primary-dark cursor-pointer"
              : "bg-[#D6CEC8] cursor-not-allowed"
            }
          `}
        >
          Continue →
        </button>
      </div>
    </div>
  );
}
