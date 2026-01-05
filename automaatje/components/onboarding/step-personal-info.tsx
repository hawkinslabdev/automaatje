import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";

interface StepPersonalInfoProps {
  data: {
    name: string;
    email: string;
  };
  errors: Record<string, string | undefined>;
  onChange: (field: string, value: string) => void;
}

export function StepPersonalInfo({ data, errors, onChange }: StepPersonalInfoProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Wie ben je?</h2>
        <p className="text-sm text-muted-foreground">
          Laten we beginnen met je gegevens
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Naam</Label>
          <Input
            id="name"
            name="name"
            type="text"
            placeholder="Jan Jansen"
            value={data.name}
            onChange={(e) => onChange("name", e.target.value)}
            autoComplete="name"
            required
          />
          {errors.name && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">{errors.name}</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">E-mailadres</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="naam@voorbeeld.nl"
            value={data.email}
            onChange={(e) => onChange("email", e.target.value)}
            autoComplete="email"
            required
          />
          {errors.email && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">{errors.email}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
