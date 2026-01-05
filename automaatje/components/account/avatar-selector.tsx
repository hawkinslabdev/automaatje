"use client";

import { useState } from "react";
import { AVATAR_SEEDS } from "@/lib/avatar";
import { UserAvatar } from "@/components/user-avatar";
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
import { Label } from "@/components/ui/label";
import { updateUserAvatar } from "@/lib/actions/user";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";

interface AvatarSelectorProps {
  currentSeed?: string;
  userName: string;
}

export function AvatarSelector({ currentSeed, userName }: AvatarSelectorProps) {
  const [selectedSeed, setSelectedSeed] = useState(currentSeed || AVATAR_SEEDS[0]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  async function handleSave() {
    setIsSaving(true);
    const result = await updateUserAvatar(selectedSeed);
    setIsSaving(false);

    if (result.success) {
      setIsOpen(false);
      router.refresh();
    } else {
      alert(result.error || "Er is een fout opgetreden");
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full p-0 shadow-md"
        >
          <Pencil className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Kies je avatar</DialogTitle>
          <DialogDescription>
            Selecteer een avatar die bij je past
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label className="text-sm font-medium">Beschikbare avatars</Label>
          <div className="mt-3 grid grid-cols-3 gap-4">
            {AVATAR_SEEDS.map((seed) => (
              <button
                key={seed}
                onClick={() => setSelectedSeed(seed)}
                className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all hover:bg-accent ${
                  selectedSeed === seed
                    ? "border-primary bg-accent"
                    : "border-transparent"
                }`}
              >
                <UserAvatar
                  name={userName}
                  avatarSeed={seed}
                  className="h-16 w-16"
                />
                <span className="text-xs font-medium">{seed}</span>
              </button>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isSaving}
          >
            Annuleren
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Bezig met opslaan..." : "Opslaan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
