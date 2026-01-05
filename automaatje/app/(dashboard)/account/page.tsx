import { getCurrentUser } from "@/lib/actions/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/user-avatar";
import { AvatarSelector } from "@/components/account/avatar-selector";
import { PasswordChangeDialog } from "@/components/account/password-change-dialog";

export default async function AccountPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const profile = user.profile && typeof user.profile === 'object' ? user.profile : {};
  const name = 'name' in profile ? String(profile.name) : '';
  const avatarSeed = 'avatarSeed' in profile ? String(profile.avatarSeed) : undefined;
  const location = profile && typeof profile === 'object' && 'location' in profile
    ? profile.location as { text?: string; lat?: number; lon?: number }
    : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Je account</h1>
        <p className="text-muted-foreground">
          Beheer je persoonlijke gegevens en accountinstellingen
        </p>
      </div>

      <Separator />

      {/* Profile Header */}
      <Card>
        <CardContent className="flex items-center gap-6 p-6">
          <div className="relative">
            <UserAvatar
              name={name}
              avatarSeed={avatarSeed}
              className="h-20 w-20"
            />
            <AvatarSelector currentSeed={avatarSeed} userName={name} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold">{name || "Geen naam"}</h2>
              <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
                {user.role === "ADMIN" ? "Beheerder" : "Gebruiker"}
              </Badge>
            </div>
            <p className="text-muted-foreground">{user.email}</p>
            {location?.text && (
              <p className="mt-1 text-sm text-muted-foreground">
                📍 {location.text}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Account Information */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profiel informatie</CardTitle>
            <CardDescription>
              Je persoonlijke gegevens en contactinformatie
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Volledige naam
              </label>
              <p className="text-base">{name || "Niet ingesteld"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                E-mailadres
              </label>
              <p className="text-base">{user.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Locatie
              </label>
              <p className="text-base">
                {location?.text || "Niet ingesteld"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Beveiliging</CardTitle>
            <CardDescription>
              Accountbeveiliging en wachtwoordinstellingen
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Wachtwoord
                </label>
                <p className="text-base text-muted-foreground">••••••••••••</p>
              </div>
              <PasswordChangeDialog />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Account type
              </label>
              <p className="text-base">
                {user.role === "ADMIN" ? "Beheerder" : "Gebruiker"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Information */}
      <Card>
        <CardHeader>
          <CardTitle>Account activiteit</CardTitle>
          <CardDescription>
            Overzicht van je accountgegevens
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Account aangemaakt</span>
            <span className="font-medium">
              {new Date(user.createdAt).toLocaleDateString('nl-NL', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Laatst bijgewerkt</span>
            <span className="font-medium">
              {new Date(user.updatedAt).toLocaleDateString('nl-NL', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
