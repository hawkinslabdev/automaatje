"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Star,
  Trash2,
  Home,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  removeFavoriteLocation,
  moveToFavorites,
} from "@/lib/actions/locations";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface LocationCardProps {
  id: string;
  text: string;
  lat?: number;
  lon?: number;
  isFavorite?: boolean;
  isHome?: boolean;
  addedAt?: number;
  showActions?: boolean;
}

export function LocationCard({
  id,
  text,
  lat,
  lon,
  isFavorite = false,
  isHome = false,
  addedAt,
  showActions = true,
}: LocationCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleRemove = async () => {
    setError(null);
    setShowDeleteDialog(false);

    startTransition(async () => {
      const result = await removeFavoriteLocation(id);

      if (result.success) {
        router.refresh();
      } else {
        setError(result.error || "Er is een fout opgetreden");
      }
    });
  };

  const handleAddToFavorites = async () => {
    setError(null);

    startTransition(async () => {
      const result = await moveToFavorites(text);

      if (result.success) {
        router.refresh();
      } else {
        setError(result.error || "Er is een fout opgetreden");
      }
    });
  };

  return (
    <>
      <Card className={isFavorite || isHome ? "border-primary" : ""}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div
              className={`mt-1 rounded-full p-2 ${
                isHome
                  ? "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400"
                  : isFavorite
                  ? "bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-400"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {isHome ? (
                <Home className="h-4 w-4" />
              ) : isFavorite ? (
                <Star className="h-4 w-4 fill-current" />
              ) : (
                <MapPin className="h-4 w-4" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm truncate">{text}</h3>
                  {lat && lon && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {lat.toFixed(6)}, {lon.toFixed(6)}
                    </p>
                  )}
                  {addedAt && !isHome && !isFavorite && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Toegevoegd:{" "}
                      {new Date(addedAt).toLocaleDateString("nl-NL", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  )}
                </div>

                {/* Actions */}
                {showActions && !isHome && (
                  <div className="flex items-center gap-1 shrink-0">
                    {!isFavorite && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleAddToFavorites}
                        disabled={isPending}
                        className="h-8 w-8 p-0"
                        title="Toevoegen aan voorkeurslocaties"
                      >
                        {isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Star className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    {isFavorite && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowDeleteDialog(true)}
                        disabled={isPending}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        title="Verwijderen"
                      >
                        {isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Badge */}
              <div className="mt-2 flex gap-2">
                {isHome && (
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                    Thuisadres
                  </span>
                )}
                {isFavorite && !isHome && (
                  <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                    Voorkeurslocatie
                  </span>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="mt-2 flex items-center gap-2 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Voorkeurslocatie verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je &quot;{text}&quot; wilt verwijderen uit je
              voorkeurslocaties? Deze actie kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
