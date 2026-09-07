import { CheckCircle2, ChevronRight } from "lucide-react";
import { Button, Card } from "@pos/ui";

type BusinessOnboardingCardProps = {
  onboardingStep: number;
  canCreateOrganization: boolean;
  canCreateFranchise: boolean;
  canCreateBranch: boolean;
  onCreateOrganization: () => void;
  onCreateFranchise: () => void;
  onCreateBranch: () => void;
};

const steps = ["Organization", "Franchise", "Branch", "Ready"] as const;

export const BusinessOnboardingCard = ({
  onboardingStep,
  canCreateOrganization,
  canCreateFranchise,
  canCreateBranch,
  onCreateOrganization,
  onCreateFranchise,
  onCreateBranch,
}: BusinessOnboardingCardProps) => (
  <Card className="mb-6">
    <div className="grid gap-3 md:grid-cols-4">
      {steps.map((label, index) => {
        const step = index + 1;
        const complete = step < onboardingStep;
        const current = step === onboardingStep;
        return (
          <div
            key={label}
            className={`rounded-xl border p-4 ${current ? "border-primary bg-primary-surface" : "border-border"}`}
          >
            <div className="flex items-center gap-2">
              {complete ? (
                <CheckCircle2 className="h-5 w-5 text-success" />
              ) : (
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${current ? "bg-primary text-white" : "bg-surface-secondary text-text-secondary"}`}
                >
                  {step}
                </span>
              )}
              <span className="font-semibold">{label}</span>
            </div>
            <p className="mt-2 text-xs text-text-secondary">
              {complete ? "Complete" : current ? "Required next" : "Waiting"}
            </p>
          </div>
        );
      })}
    </div>
    <div className="mt-6">
      {onboardingStep === 1 && canCreateOrganization && (
        <Button onClick={onCreateOrganization}>
          Create business <ChevronRight className="h-4 w-4" />
        </Button>
      )}
      {onboardingStep === 2 && canCreateFranchise && (
        <Button onClick={onCreateFranchise}>
          Create Franchise <ChevronRight className="h-4 w-4" />
        </Button>
      )}
      {onboardingStep === 3 && canCreateBranch && (
        <Button onClick={onCreateBranch}>
          Create Branch <ChevronRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  </Card>
);
