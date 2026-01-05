import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Construction } from "lucide-react";

interface SettingsPlaceholderProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
}

export function SettingsPlaceholder({
  title,
  description,
  icon,
}: SettingsPlaceholderProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>

      <Separator />

      <Card>
        <CardContent className="flex flex-col items-center justify-center p-12 text-center">
          <div className="mb-4 rounded-full bg-muted p-6">
            {icon || <Construction className="h-12 w-12 text-muted-foreground" />}
          </div>
          <h3 className="mb-2 text-xl font-semibold">Binnenkort beschikbaar</h3>
          <p className="max-w-md text-muted-foreground">
            Deze functionaliteit wordt momenteel ontwikkeld en zal binnenkort
            beschikbaar zijn.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
