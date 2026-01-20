"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock } from "lucide-react";
import { changePassword } from "@/lib/actions/password-change";
import { useToast } from "@/hooks/use-toast";

export function PasswordChangeDialog() {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  // Form data
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // UI state
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = () => {
    startTransition(async () => {
      setFieldErrors({});

      const result = await changePassword({
        currentPassword,
        password,
        confirmPassword,
      });

      if (!result.success && result.error) {
        toast({
          title: "Fout bij wijzigen",
          description: result.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Wachtwoord gewijzigd",
          description: "Je wachtwoord is succesvol gewijzigd",
        });
        setOpen(false);
        resetForm();
        router.refresh();
      }
    });
  };

  const resetForm = () => {
    setCurrentPassword("");
    setPassword("");
    setConfirmPassword("");
    setFieldErrors({});
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen);
      if (!newOpen) {
        resetForm();
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Lock className="h-4 w-4 mr-2" />
          Wijzigen
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Wachtwoord wijzigen</DialogTitle>
          <DialogDescription>
            Voer je huidige wachtwoord en je nieuwe wachtwoord in om te wijzigen
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Huidig wachtwoord</Label>
            <Input
              id="currentPassword"
              type="password"
              placeholder="Voer je huidige wachtwoord in"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={isPending}
              autoComplete="current-password"
            />
            {fieldErrors.currentPassword && (
              <p className="text-sm text-destructive">{fieldErrors.currentPassword}</p>
            )}
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
              placeholder="Herhaal je nieuwe wachtwoord"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isPending}
              autoComplete="new-password"
            />
            {fieldErrors.confirmPassword && (
              <p className="text-sm text-destructive">{fieldErrors.confirmPassword}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Annuleren
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || !currentPassword || !password || !confirmPassword}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Bezig...
              </>
            ) : (
              "Wachtwoord wijzigen"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
