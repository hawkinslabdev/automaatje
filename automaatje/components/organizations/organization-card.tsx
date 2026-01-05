"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Trash2, Loader2, AlertCircle, Pencil } from "lucide-react";
import { deleteOrganization } from "@/lib/actions/organizations";
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
import { useToast } from "@/hooks/use-toast";
import { EditOrganizationDialog } from "@/components/organizations/edit-organization-dialog";

interface OrganizationCardProps {
  id: string;
  name: string;
  createdAt: Date;
}

export function OrganizationCard({
  id,
  name,
  createdAt,
}: OrganizationCardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDelete = async () => {
    setShowDeleteDialog(false);

    startTransition(async () => {
      const result = await deleteOrganization(id);

      if (result.success) {
        toast({
          title: "Organisatie verwijderd",
          description: "De organisatie is succesvol verwijderd",
        });
        router.refresh();
      } else {
        toast({
          title: "Fout bij verwijderen",
          description: result.error || "Er is een fout opgetreden",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="mt-1 rounded-full bg-primary/10 p-2 text-primary">
              <Building2 className="h-4 w-4" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm truncate">{name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Toegevoegd:{" "}
                    {new Date(createdAt).toLocaleDateString("nl-NL", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <EditOrganizationDialog
                    id={id}
                    currentName={name}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDeleteDialog(true)}
                    disabled={isPending}
                    className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    title="Verwijderen"
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Organisatie verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je <strong>{name}</strong> wilt verwijderen?
              Deze actie kan niet ongedaan worden gemaakt.
              <br />
              <br />
              <span className="text-amber-600 dark:text-amber-500 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Let op: Je kunt deze organisatie alleen verwijderen als er geen
                registraties aan gekoppeld zijn.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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
