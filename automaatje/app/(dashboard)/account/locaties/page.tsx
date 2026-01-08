import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/actions/auth";
import {
  getHomeAddress,
  getFavoriteLocations,
  getPreviouslyUsedLocations,
} from "@/lib/actions/locations";
import { LocationCard } from "@/components/locations/location-card";
import { AddLocationDialog } from "@/components/locations/add-location-dialog";
import { EditHomeAddressDialog } from "@/components/locations/edit-home-address-dialog";
import { PreviousLocationsList } from "@/components/locations/previous-locations-list";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Info } from "lucide-react";

export default async function LocatiesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Fetch all location data
  const [homeResult, favoritesResult, previousResult] = await Promise.all([
    getHomeAddress(),
    getFavoriteLocations(),
    getPreviouslyUsedLocations(),
  ]);

  const homeAddress = homeResult.data;
  const favoriteLocations = favoritesResult.data || [];
  const previousLocations = previousResult.data || [];

  // Filter out favorites and home from previous locations
  const favoriteTexts = new Set(
    favoriteLocations.map((loc) => loc.text.toLowerCase().trim())
  );
  const homeText = homeAddress?.text.toLowerCase().trim();

  const filteredPreviousLocations = previousLocations.filter((loc) => {
    const text = loc.text.toLowerCase().trim();
    return text !== homeText && !favoriteTexts.has(text);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Locaties</h1>
        <p className="text-muted-foreground">
          Beheer je thuisadres, voorkeurslocaties en eerder gebruikte locaties
        </p>
      </div>

      <Separator />

      {/* Home Address */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold">Thuisadres</h2>
            <p className="text-sm text-muted-foreground">
              Je thuisadres voor afstandsberekeningen
            </p>
          </div>
          {homeAddress && (
            <div className="shrink-0">
              <EditHomeAddressDialog
                currentAddress={homeAddress.text}
                currentLat={homeAddress.lat}
                currentLon={homeAddress.lon}
              />
            </div>
          )}
        </div>

        {homeAddress ? (
          <LocationCard
            id={homeAddress.id}
            text={homeAddress.text}
            lat={homeAddress.lat}
            lon={homeAddress.lon}
            isHome={true}
            showActions={false}
          />
        ) : (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">
                Geen thuisadres ingesteld
              </p>
              <div className="mt-4">
                <EditHomeAddressDialog
                  currentAddress=""
                  currentLat={undefined}
                  currentLon={undefined}
                  isNew={true}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Separator />

      {/* Favorite Work Locations */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold">Voorkeurslocaties</h2>
            <p className="text-sm text-muted-foreground">
              Vaak bezochte werklocaties voor snelle ritregistratie
            </p>
          </div>
          <div className="shrink-0">
            <AddLocationDialog />
          </div>
        </div>

        {favoriteLocations.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {favoriteLocations.map((location) => (
              <LocationCard
                key={location.id}
                id={location.id}
                text={location.text}
                lat={location.lat}
                lon={location.lon}
                isFavorite={true}
                showActions={true}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">
                Nog geen voorkeurslocaties toegevoegd
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Klik op &quot;Voorkeurslocatie toevoegen&quot; om een werklocatie
                toe te voegen, of gebruik de ster-knop bij eerder gebruikte
                locaties hieronder.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <Separator />

      {/* Previously Used Locations */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Eerder gebruikte locaties</h2>
          <p className="text-sm text-muted-foreground">
            Locaties uit je eerdere ritregistraties, gesorteerd op meest recent
          </p>
        </div>

        <PreviousLocationsList
          locations={filteredPreviousLocations}
          initialDisplayCount={20}
          incrementCount={20}
        />
      </div>

      {/* Help Section */}
      <Card>  
        <CardHeader>
          <CardTitle>Tips voor locatiebeheer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <h4 className="text-sm font-medium">Thuisadres wijzigen</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Je kunt je thuisadres op elk moment wijzigen met de
              &quot;Bewerken&quot; knop. Je oude thuisadres blijft zichtbaar in
              eerder gebruikte locaties als je vanaf daar ritten hebt
              geregistreerd.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-medium">Adres verifiëren</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Gebruik het kaart-icoon om adressen te verifiëren. Dit helpt bij
              automatische afstandsberekeningen en zorgt voor nauwkeurigere
              kilometeradministratie.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-medium">Voorkeurslocaties</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Voeg vaak bezochte werklocaties toe als voorkeurslocatie. Deze
              verschijnen bovenaan bij het maken van nieuwe ritten.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-medium">Locaties toevoegen aan favorieten</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Klik op de ster-knop bij eerder gebruikte locaties om ze toe te
              voegen aan je voorkeurslocaties.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-medium">Locaties verwijderen</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Voorkeurslocaties kunnen worden verwijderd met de prullenbak-knop.
              Let op: dit verwijdert niet je eerdere ritregistraties.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
