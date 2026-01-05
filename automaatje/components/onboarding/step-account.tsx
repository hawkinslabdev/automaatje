import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";

interface StepAccountProps {
  data: {
    password: string;
    confirmPassword: string;
  };
  errors: Record<string, string | undefined>;
  onChange: (field: string, value: string) => void;
}

export function StepAccount({ data, errors, onChange }: StepAccountProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Wachtwoord</h2>
        <p className="text-sm text-muted-foreground">
          Kies een sterk wachtwoord om je account te beveiligen
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">Wachtwoord</Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            value={data.password}
            onChange={(e) => onChange("password", e.target.value)}
            autoComplete="new-password"
            required
          />
          {errors.password && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">{errors.password}</span>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Minimaal 8 tekens, inclusief hoofdletters en cijfers
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Bevestig wachtwoord</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="••••••••"
            value={data.confirmPassword}
            onChange={(e) => onChange("confirmPassword", e.target.value)}
            autoComplete="new-password"
            required
          />
          {errors.confirmPassword && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">{errors.confirmPassword}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
