import { AlertCircle, CheckCircle2, ClipboardList, Route } from "lucide-react";

interface StepTrackingModeProps {
  data: {
    trackingMode: "full_registration" | "simple_reimbursement";
  };
  errors: Record<string, string | undefined>;
  onChange: (field: string, value: any) => void;
}

export function StepTrackingMode({ data, errors, onChange }: StepTrackingModeProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Hoe wil je registreren?</h2>
        <p className="text-sm text-muted-foreground">
          Kies de methode die past bij jouw situatie.
        </p>
      </div>

      <div className="space-y-4">
        {/* Option 1: Full registration (tax compliance) */}
        <div
          className={`cursor-pointer rounded-lg border-2 p-4 transition-colors ${
            data.trackingMode === "full_registration"
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          }`}
          onClick={() => onChange("trackingMode", "full_registration")}
        >
          <div className="flex items-start gap-3">
            <div className="mt-1">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                  data.trackingMode === "full_registration"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <ClipboardList className="h-5 w-5" />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">Volledige ritregistratie</h3>
                {data.trackingMode === "full_registration" && (
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Voor zakelijke auto's en leaseauto's
              </p>
              <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                  Gesloten kilometerstand (begin- en eindstand)
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                  Vertrek- en aankomstadres per rit
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                  Voldoet aan eisen Belastingdienst
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Option 2: Simple reimbursement (commute) */}
        <div
          className={`cursor-pointer rounded-lg border-2 p-4 transition-colors ${
            data.trackingMode === "simple_reimbursement"
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          }`}
          onClick={() => onChange("trackingMode", "simple_reimbursement")}
        >
          <div className="flex items-start gap-3">
            <div className="mt-1">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                  data.trackingMode === "simple_reimbursement"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Route className="h-5 w-5" />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">Eenvoudige kilometervergoeding</h3>
                {data.trackingMode === "simple_reimbursement" && (
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Voor woon-werkverkeer
              </p>
              <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                  Alleen kilometers registreren
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                  Geen adresinvoer nodig
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                  Ideaal voor vaste woon-werk routes
                </li>
              </ul>
            </div>
          </div>
        </div>

        {errors.trackingMode && (
          <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="font-medium">{errors.trackingMode}</span>
          </div>
        )}
      </div>
    </div>
  );
}
