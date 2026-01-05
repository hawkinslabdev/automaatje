import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/actions/auth";
import {
  getMileageRateConfig,
  getStandardMileageRates,
} from "@/lib/actions/settings";
import { MileageRateSelector } from "@/components/account/mileage-rate-selector";
import { AddStandardRateForm } from "@/components/account/add-standard-rate-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

export default async function KilometertarievenPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch current configuration
  const configResult = await getMileageRateConfig();
  const ratesResult = await getStandardMileageRates();

  if (!configResult.success || !ratesResult.success) {
    return (
      <div>
        <h1 className="mb-6 text-3xl font-bold tracking-tight">
          Kilometertarieven
        </h1>
        <Card>
          <CardContent className="p-6">
            <p className="text-destructive">
              Fout bij laden van kilometertarieven. Probeer het later opnieuw.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const config = configResult.data!;
  const rates = ratesResult.data!;
  const isUsingStandardRates = config.userPreference === "standard";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Kilometertarieven</h1>
        <p className="text-muted-foreground">
          Beheer je voorkeuren voor kilometervergoeding
        </p>
      </div>

      <Separator />

      {/* Mileage Rate Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Kies je vergoedingsvoorkeur</CardTitle>
          <CardDescription>
            Selecteer welk tarief je wilt gebruiken voor het berekenen van je
            kilometervergoeding
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MileageRateSelector
            initialData={{
              rateType: config.userPreference,
              customRate: config.customRatePerKm,
            }}
            standardRates={rates.rates}
          />
        </CardContent>
      </Card>

      {/* Available Standard Rates */}
      <Card className={cn(!isUsingStandardRates && "opacity-50")}>
        <CardHeader>
          <CardTitle>Beschikbare standaardtarieven</CardTitle>
          <CardDescription>
            {isUsingStandardRates
              ? "Overzicht van alle beschikbare belastingvrije kilometervergoedingen"
              : "Deze sectie is uitgeschakeld omdat je geen standaardtarieven gebruikt"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isUsingStandardRates && (
            <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Selecteer &quot;Standaardtarieven voor Nederland&quot; hierboven en
                klik op &quot;Wijzigingen opslaan&quot; om standaardtarieven te kunnen
                beheren.
              </p>
            </div>
          )}
          <div className={cn("space-y-3", !isUsingStandardRates && "pointer-events-none")}>
            {rates.rates.map((rate, index) => (
              <div
                key={`${rate.country}-${rate.year}`}
                className={`flex items-center justify-between rounded-lg border p-4 ${
                  index === 0 && isUsingStandardRates ? "border-primary bg-primary/5" : ""
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">
                      {rate.country === "NL" ? "Nederland" : rate.country}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {rate.year}
                    </span>
                    {index === 0 && isUsingStandardRates && (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                        Huidig
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {rate.description}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">
                    € {rate.businessRate.toFixed(2).replace(".", ",")}
                  </div>
                  <div className="text-sm text-muted-foreground">per km</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add New Standard Rate Form - Only visible when using standard rates */}
      {isUsingStandardRates && (
        <AddStandardRateForm />
      )}

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle>Veelgestelde vragen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium">Over kilometertarieven</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              <p>
                De belastingvrije kilometervergoeding in Nederland is een vast bedrag dat werkgevers mogen vergoeden voor zakelijke kilometers zonder dat dit als loon wordt belast. Dit tarief wordt jaarlijks door de overheid vastgesteld.
              </p>
              <p>
                Je kunt kiezen voor het standaardtarief, een aangepast tarief, of geen vergoeding (alleen afstand bijhouden).
              </p>
            </p>
          </div>
          <div>
            <h4 className="font-medium">Wanneer gebruik ik het standaardtarief?</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Gebruik het standaardtarief als je de belastingvrije
              kilometervergoeding van de Nederlandse overheid wilt toepassen. Dit is
              het meest gebruikelijke tarief voor zakelijke kilometers.
            </p>
          </div>
          <div>
            <h4 className="font-medium">Kan ik standaardtarieven voor toekomstige jaren toevoegen?</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Ja! Wanneer je &quot;Standaardtarieven voor Nederland&quot; gebruikt, kun je
              nieuwe standaardtarieven toevoegen voor toekomstige jaren. Dit is handig
              als de overheid nieuwe tarieven aankondigt voor het volgende jaar.
            </p>
          </div>
          <div>
            <h4 className="font-medium">Wanneer gebruik ik een aangepast tarief?</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Gebruik een aangepast tarief als je werkgever een ander tarief
              hanteert, of als je een specifiek tarief wilt gebruiken voor je
              administratie.
            </p>
          </div>
          <div>
            <h4 className="font-medium">Wat betekent &quot;Geen vergoeding&quot;?</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Met deze optie wordt alleen de afgelegde afstand bijgehouden zonder
              berekening van vergoedingen. Dit is handig als je alleen kilometers wilt
              registreren zonder financiële berekeningen.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
