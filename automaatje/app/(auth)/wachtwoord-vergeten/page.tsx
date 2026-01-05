"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Mail } from "lucide-react";
import { requestPasswordReset, verifyResetToken } from "@/lib/actions/password-reset";

export default function WachtwoordVergetenPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Step state: "email" or "verify"
  const [step, setStep] = useState<"email" | "verify">("email");

  // Form data
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // UI state
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Step 1: Request reset code
  const handleRequestReset = () => {
    startTransition(async () => {
      setError(undefined);
      setSuccess(undefined);
      setFieldErrors({});

      const result = await requestPasswordReset({ email });

      if (!result.success && result.error) {
        setError(result.error);
      } else {
        setSuccess("Als dit e-mailadres bestaat, ontvang je binnen enkele minuten een code.");
        setStep("verify");
      }
    });
  };

  // Step 2: Verify code and reset password
  const handleVerifyReset = () => {
    startTransition(async () => {
      setError(undefined);
      setSuccess(undefined);
      setFieldErrors({});

      const result = await verifyResetToken({
        email,
        token: code,
        password,
        confirmPassword,
      });

      if (!result.success && result.error) {
        setError(result.error);
      } else {
        setSuccess("Wachtwoord succesvol hersteld! Je wordt doorgestuurd naar de inlogpagina...");
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Terug
                </Button>
              </Link>
            </div>
            <CardTitle>Wachtwoord herstellen</CardTitle>
            <CardDescription>
              {step === "email"
                ? "Voer je e-mailadres in om een herstelcode te ontvangen"
                : "Voer de code in die je per e-mail hebt ontvangen"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            {step === "email" ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mailadres</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="jouw@email.nl"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isPending}
                    autoComplete="email"
                    autoFocus
                  />
                  {fieldErrors.email && (
                    <p className="text-sm text-destructive">{fieldErrors.email}</p>
                  )}
                </div>

                <Button
                  onClick={handleRequestReset}
                  disabled={isPending || !email}
                  className="w-full"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Bezig...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Code verzenden
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">6-cijferige code</Label>
                  <Input
                    id="code"
                    type="text"
                    placeholder="123456"
                    value={code}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                      setCode(value);
                    }}
                    disabled={isPending}
                    maxLength={6}
                    autoComplete="one-time-code"
                    autoFocus
                    className="text-center text-2xl tracking-widest font-mono"
                  />
                  {fieldErrors.token && (
                    <p className="text-sm text-destructive">{fieldErrors.token}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    De code is 15 minuten geldig en kan maximaal 3 keer gebruikt worden
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Nieuw wachtwoord</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Minimaal 8 tekens"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isPending}
                    autoComplete="new-password"
                  />
                  {fieldErrors.password && (
                    <p className="text-sm text-destructive">{fieldErrors.password}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Minimaal 8 tekens, inclusief hoofdletter, kleine letter en cijfer
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Bevestig nieuw wachtwoord</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Herhaal je wachtwoord"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isPending}
                    autoComplete="new-password"
                  />
                  {fieldErrors.confirmPassword && (
                    <p className="text-sm text-destructive">{fieldErrors.confirmPassword}</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStep("email");
                      setCode("");
                      setPassword("");
                      setConfirmPassword("");
                      setError(undefined);
                      setSuccess(undefined);
                    }}
                    disabled={isPending}
                    className="w-full"
                  >
                    Nieuwe code
                  </Button>
                  <Button
                    onClick={handleVerifyReset}
                    disabled={isPending || !code || !password || !confirmPassword}
                    className="w-full"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Bezig...
                      </>
                    ) : (
                      "Wachtwoord herstellen"
                    )}
                  </Button>
                </div>
              </div>
            )}

            <div className="pt-4 text-center border-t">
              <p className="text-sm text-muted-foreground">
                Weet je je wachtwoord weer?{" "}
                <Link href="/login" className="text-primary hover:underline">
                  Inloggen
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
