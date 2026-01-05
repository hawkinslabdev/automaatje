import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/actions/auth";
import { getOrganizations } from "@/lib/actions/organizations";
import { OrganizationCard } from "@/components/organizations/organization-card";
import { AddOrganizationDialog } from "@/components/organizations/add-organization-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default async function OrganisatiesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Fetch organizations
  const result = await getOrganizations();
  const organizations = result.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Organisaties</h1>
        <p className="text-muted-foreground">
          Beheer bedrijfsnamen voor rapportage van zakelijke ritten
        </p>
      </div>

      <Separator />

      {/* Organizations List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Bedrijven</h2>
            <p className="text-sm text-muted-foreground">
              Bedrijfsnamen voor rapportage en administratie
            </p>
          </div>
          <AddOrganizationDialog />
        </div>

        {organizations.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {organizations.map((organization) => (
              <OrganizationCard
                key={organization.id}
                id={organization.id}
                name={organization.name}
                createdAt={organization.createdAt}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">
                Nog geen organisaties toegevoegd
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Klik op &quot;Organisatie toevoegen&quot; om een bedrijfsnaam
                toe te voegen. Deze kun je later koppelen aan je zakelijke
                ritten voor rapportage.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle>Over organisaties</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <h4 className="text-sm font-medium">Wat zijn organisaties?</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Organisaties kan je koppelen aan zakelijke ritten. 
              Dit maakt het eenvoudiger om jouw ritten te rapporteren 
              aan je werkgever of de Belastingdienst.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-medium">
              Organisaties koppelen aan ritten
            </h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Ritten hoef je niet te koppelen aan een organisatie, omdat
              je deze bij het opvragen van een rapport kan koppelen.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
