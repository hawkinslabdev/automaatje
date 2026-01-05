import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/actions/auth";
import { getLabels } from "@/lib/actions/labels";
import { LabelCard } from "@/components/labels/label-card";
import { AddLabelDialog } from "@/components/labels/add-label-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default async function LabelsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Fetch labels
  const result = await getLabels();
  const labels = result.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Labels</h1>
        <p className="text-muted-foreground">
          Beheer labels voor het categoriseren van je ritten
        </p>
      </div>

      <Separator />

      {/* Labels List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Categorieën</h2>
            <p className="text-sm text-muted-foreground">
              Labels voor het organiseren en filteren van ritten
            </p>
          </div>
          <AddLabelDialog />
        </div>

        {labels.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {labels.map((label) => (
              <LabelCard
                key={label.id}
                id={label.id}
                name={label.name}
                color={label.color}
                createdAt={label.createdAt}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">
                Nog geen labels toegevoegd
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Klik op &quot;Label toevoegen&quot; om een label te maken.
                Deze kun je later gebruiken om je ritten te categoriseren en
                filteren.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle>Over labels</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <h4 className="text-sm font-medium">Wat zijn labels?</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Labels zijn kleurgecodeerde tags die je aan ritten kunt koppelen.
              Dit maakt het eenvoudiger om ritten te categoriseren en te
              filteren, bijvoorbeeld voor verschillende projecten, klanten of
              reisdoeleinden.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-medium">Labels verwijderen</h4>
            <p className="mt-1 text-muted-foreground text-sm">
              Je kunt alleen labels verwijderen die nog niet gekoppeld zijn aan
              registraties. Als je een label probeert te verwijderen die nog in
              gebruik is, krijg je een melding.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-medium">Kleuren aanpassen</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Bij het maken van een label kun je kiezen uit vooraf ingestelde
              kleuren of een eigen kleur invoeren met een kleurkiezer. Gebruik
              verschillende kleuren om labels visueel te onderscheiden.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
