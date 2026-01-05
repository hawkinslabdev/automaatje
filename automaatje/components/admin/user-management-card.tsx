"use client";

import { useState, useEffect, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Users, Loader2 } from "lucide-react";
import { getRegistrationsEnabled, updateRegistrationsSetting } from "@/lib/actions/settings";
import { useToast } from "@/hooks/use-toast";

export function UserManagementCard() {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [registrationsEnabled, setRegistrationsEnabled] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [initialValue, setInitialValue] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load current setting
    getRegistrationsEnabled().then((result) => {
      if (result.success && result.data !== undefined) {
        setRegistrationsEnabled(result.data);
        setInitialValue(result.data);
      }
      setIsLoading(false);
    });
  }, []);

  const handleToggleChange = (checked: boolean) => {
    setRegistrationsEnabled(checked);
    setHasChanges(checked !== initialValue);
  };

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateRegistrationsSetting(registrationsEnabled);

      if (result.success) {
        toast({
          title: "Instelling opgeslagen",
          description: "Registratie-instelling succesvol bijgewerkt",
        });
        setInitialValue(registrationsEnabled);
        setHasChanges(false);
      } else {
        toast({
          title: "Fout",
          description: result.error || "Fout bij opslaan van instelling",
          variant: "destructive",
        });
      }
    });
  };

  const handleCancel = () => {
    setRegistrationsEnabled(initialValue);
    setHasChanges(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Gebruikersbeheer
        </CardTitle>
        <CardDescription>
          Beheer nieuwe gebruikersregistraties
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="registrations-enabled" className="text-base">
                  Nieuwe registraties toestaan
                </Label>
                <p className="text-sm text-muted-foreground">
                  {registrationsEnabled
                    ? "Nieuwe gebruikers kunnen zich registreren"
                    : "Registraties zijn uitgeschakeld"}
                </p>
              </div>
              <Switch
                id="registrations-enabled"
                checked={registrationsEnabled}
                onCheckedChange={handleToggleChange}
                disabled={isPending}
              />
            </div>

            {hasChanges && (
              <div className="flex gap-2">
                <Button
                  onClick={handleSave}
                  disabled={isPending}
                  className="flex-1"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Bezig...
                    </>
                  ) : (
                    "Opslaan"
                  )}
                </Button>
                <Button
                  onClick={handleCancel}
                  disabled={isPending}
                  variant="outline"
                  className="flex-1"
                >
                  Annuleren
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
