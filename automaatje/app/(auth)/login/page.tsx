"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { GalleryVerticalEnd } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { login } from "@/lib/actions/auth";
import { checkResendConfigured } from "@/lib/actions/password-reset";
import { isRegistrationEnabled } from "@/lib/actions/setup";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [passwordResetEnabled, setPasswordResetEnabled] = useState(false);
  const [registrationEnabled, setRegistrationEnabled] = useState(true);

  useEffect(() => {
    // Check if password reset is available
    checkResendConfigured().then(setPasswordResetEnabled);
    // Check if registration is enabled
    isRegistrationEnabled().then(setRegistrationEnabled);

    // Check for redirect reason
    const errorParam = searchParams.get("error");
    if (errorParam === "registration_disabled") {
      setInfo("Registratie is uitgeschakeld. Neem contact op met de beheerder als je een account nodig hebt.");
    }
  }, [searchParams]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);

    try {
      const result = await login(formData);

      if (result.success) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setError(result.error || "Er is een fout opgetreden");
      }
    } catch (err) {
      setError("Er is een onverwachte fout opgetreden");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
      <div className="w-full max-w-md md:max-w-3xl">
        <Card className="overflow-hidden">
          <CardContent className="grid p-0 md:grid-cols-2">
            <form onSubmit={handleSubmit} className="p-6 md:p-8">
              <div className="flex flex-col gap-6">
                <div className="flex flex-col items-center text-center">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                    <GalleryVerticalEnd className="size-4" />
                  </div>
                  <h1 className="mt-4 text-2xl font-bold">Welkom terug</h1>
                  <p className="text-balance text-muted-foreground">
                    Log in met je account
                  </p>
                </div>

                {info && (
                  <div className="rounded-md bg-blue-500/15 p-3 text-sm text-blue-700 dark:text-blue-400">
                    {info}
                  </div>
                )}

                {error && (
                  <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <div className="grid gap-2">
                  <Label htmlFor="email">E-mailadres</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="naam@voorbeeld.nl"
                    required
                    autoComplete="email"
                    disabled={isLoading}
                  />
                </div>

                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Wachtwoord</Label>
                    {passwordResetEnabled && (
                      <Link
                        href="/wachtwoord-vergeten"
                        className="text-sm underline-offset-4 hover:underline text-muted-foreground hover:text-foreground"
                      >
                        Vergeten?
                      </Link>
                    )}
                  </div>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="********"
                    required
                    autoComplete="current-password"
                    disabled={isLoading}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Bezig met inloggen..." : "Inloggen"}
                </Button>

                {registrationEnabled && (
                  <div className="text-center text-sm">
                    Nog geen account?{" "}
                    <Link
                      href="/register"
                      className="underline underline-offset-4"
                    >
                      Registreren
                    </Link>
                  </div>
                )}
              </div>
            </form>
            <div className="relative hidden bg-muted md:block">
              <img
                src="https://images.unsplash.com/photo-1652439511786-d7abdabe0aaa?q=80&w=2070&auto=format&fit=crop"
                alt="Don't see this image? Check your connection."
                className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
              />
            </div>
          </CardContent>
        </Card>
        <div className="text-balance mt-4 text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary">
          Door in te loggen ga je akkoord met onze{" "}
          <Link href="#">Algemene Voorwaarden</Link> en{" "}
          <Link href="#">Privacybeleid</Link>.
        </div>
      </div>
    </div>
  );
}