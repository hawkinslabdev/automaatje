"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Pencil, Loader2 } from "lucide-react";
import { updateOrganization } from "@/lib/actions/organizations";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import {
  organizationSchema,
  type OrganizationFormData,
} from "@/lib/validations/organization";

interface EditOrganizationDialogProps {
  id: string;
  currentName: string;
}

export function EditOrganizationDialog({
  id,
  currentName,
}: EditOrganizationDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const form = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: currentName,
    },
  });

  const handleSubmit = async (data: OrganizationFormData) => {
    startTransition(async () => {
      const result = await updateOrganization(id, data);

      if (result.success) {
        toast({
          title: "Organisatie bijgewerkt",
          description: `${data.name} is succesvol bijgewerkt`,
        });
        setOpen(false);
        router.refresh();
      } else {
        toast({
          title: "Fout bij bijwerken",
          description: result.error || "Er is een fout opgetreden",
          variant: "destructive",
        });
      }
    });
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      // Reset to current value when closing
      form.reset({
        name: currentName,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Bewerken"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <DialogHeader>
              <DialogTitle>Organisatie bewerken</DialogTitle>
              <DialogDescription>
                Wijzig de naam van deze organisatie.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bedrijfsnaam</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="bijv. Acme B.V."
                        {...field}
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Annuleren
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Opslaan
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
