import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/actions/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { HelpCircle, Car, FileText, Settings, Info } from "lucide-react";

export default async function HelpPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Helpcentrum</h1>
        <p className="text-muted-foreground">
          Veelgestelde vragen en uitleg over het gebruik van Automaatje
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Veelgestelde vragen
          </CardTitle>
          <CardDescription>
            Klik op een vraag om het antwoord te lezen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {/* Tracking Modes Section */}
            <AccordionItem value="tracking-modes">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Car className="h-4 w-4" />
                  Wat is het verschil tussen de registratie modi?
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <p className="text-sm">
                    Automaatje ondersteunt twee verschillende manieren om ritten te registreren,
                    afhankelijk van je situatie:
                  </p>

                  <div className="space-y-4">
                    <div className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="default">Volledig</Badge>
                        <h4 className="font-semibold">Volledige ritregistratie</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Voor leaseauto's en bedrijfswagens waar je volledige ritregistratie moet
                        bijhouden voor de Belastingdienst. Deze modus vereist:
                      </p>
                      <ul className="text-sm text-muted-foreground list-disc pl-6 space-y-1">
                        <li>Gesloten kilometerstand (begin- en eindstand)</li>
                        <li>Vertrek- en bestemmingsadressen</li>
                        <li>Type rit (zakelijk of privé)</li>
                        <li>Optionele omschrijving en alternatieve route</li>
                      </ul>
                      <Alert className="mt-3">
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          Deze modus voldoet aan de eisen van de Nederlandse Belastingdienst
                          voor zakelijke ritregistratie.
                        </AlertDescription>
                      </Alert>
                    </div>

                    <div className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Eenvoudig</Badge>
                        <h4 className="font-semibold">Eenvoudige kilometervergoeding</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Voor privé auto's waar je werkgever kilometers vergoedt (zoals woon-werk).
                        Deze modus vereist alleen:
                      </p>
                      <ul className="text-sm text-muted-foreground list-disc pl-6 space-y-1">
                        <li>Gereden kilometers (verplicht)</li>
                        <li>Type rit (zakelijk of privé)</li>
                        <li>Optionele kilometerstand (voor eigen administratie)</li>
                      </ul>
                      <Alert className="mt-3">
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          Geen adressen of verplichte kilometerstand nodig. Ideaal voor
                          eenvoudige kilometervergoeding.
                        </AlertDescription>
                      </Alert>
                    </div>
                  </div>

                  <div className="border-t pt-4 mt-4">
                    <h4 className="font-semibold text-sm mb-2">Hoe kies ik de juiste modus?</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Leaseauto of bedrijfswagen → <strong>Volledige ritregistratie</strong></li>
                      <li>• Privé auto met werkgever kilometervergoeding → <strong>Eenvoudige kilometervergoeding</strong></li>
                      <li>• Je kunt de modus instellen bij het toevoegen van een voertuig</li>
                      <li>• Later wijzigen is mogelijk, maar heeft geen invloed op bestaande ritten</li>
                    </ul>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Vehicle Management */}
            <AccordionItem value="vehicle-management">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Car className="h-4 w-4" />
                  Hoe voeg ik een voertuig toe?
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 text-sm">
                  <p>Om een voertuig toe te voegen:</p>
                  <ol className="list-decimal pl-6 space-y-1">
                    <li>Ga naar je Garage via het hoofdmenu</li>
                    <li>Klik op "Voertuig toevoegen"</li>
                    <li>Voer het kenteken in (voor Nederlandse voertuigen worden details automatisch opgehaald)</li>
                    <li>Kies de registratie modus die past bij je situatie</li>
                    <li>Stel eventuele kilometerstand meldingen in</li>
                    <li>Klik op "Voertuig toevoegen"</li>
                  </ol>
                  <p className="text-muted-foreground mt-3">
                    Je eerste voertuig wordt automatisch ingesteld als hoofdvoertuig. Dit kun je
                    later wijzigen in de garage.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Trip Registration */}
            <AccordionItem value="trip-registration">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Hoe registreer ik een rit?
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 text-sm">
                  <p>Een rit registreren werkt anders per registratie modus:</p>

                  <div className="border rounded-lg p-3 mt-3 space-y-2">
                    <p className="font-semibold">Volledige ritregistratie:</p>
                    <ol className="list-decimal pl-6 space-y-1 text-muted-foreground">
                      <li>Selecteer het voertuig</li>
                      <li>Voer de begin kilometerstand in</li>
                      <li>Selecteer vertrek- en bestemmingsadres</li>
                      <li>De afstand wordt automatisch berekend</li>
                      <li>Kies het rittype (zakelijk of privé)</li>
                      <li>Voeg eventueel een omschrijving toe</li>
                    </ol>
                  </div>

                  <div className="border rounded-lg p-3 space-y-2">
                    <p className="font-semibold">Eenvoudige kilometervergoeding:</p>
                    <ol className="list-decimal pl-6 space-y-1 text-muted-foreground">
                      <li>Selecteer het voertuig</li>
                      <li>Voer de gereden kilometers in</li>
                      <li>Kies het rittype (zakelijk of privé)</li>
                      <li>Voeg eventueel een kilometerstand toe (optioneel)</li>
                    </ol>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Settings */}
            <AccordionItem value="odometer-settings">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Wat doen de kilometerstand instellingen?
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 text-sm">
                  <p>
                    De kilometerstand instellingen bepalen hoe je kilometerstand wordt bijgehouden
                    voor voertuigen met <strong>volledige ritregistratie</strong> modus.
                  </p>
                  <p className="text-muted-foreground">
                    Let op: Deze instellingen zijn niet van toepassing op voertuigen met eenvoudige
                    kilometervergoeding modus, omdat daar geen verplichte kilometerstand nodig is.
                  </p>
                  <div className="border rounded-lg p-3 mt-3 space-y-2">
                    <p className="font-semibold">Handmatig invullen:</p>
                    <p className="text-muted-foreground">
                      Je voert bij elke rit zelf de begin- en eindstand in.
                    </p>
                  </div>
                  <div className="border rounded-lg p-3 space-y-2">
                    <p className="font-semibold">Automatisch berekenen:</p>
                    <p className="text-muted-foreground">
                      Het systeem berekent de kilometerstand automatisch op basis van je
                      periodieke aflezingen. Je hoeft alleen regelmatig je huidige kilometerstand
                      door te geven.
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
