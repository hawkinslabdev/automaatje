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
import { Plus, Loader2 } from "lucide-react";
import { addOrganization } from "@/lib/actions/organizations";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import {
  organizationSchema,
  type OrganizationFormData,
} from "@/lib/validations/organization";

export function AddOrganizationDialog() {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const form = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: "",
    },
  });

  const handleSubmit = async (data: OrganizationFormData) => {
    startTransition(async () => {
      const result = await addOrganization(data);

      if (result.success) {
        toast({
          title: "Organisatie toegevoegd",
          description: `${data.name} is toegevoegd aan je organisaties`,
        });
        form.reset();
        setOpen(false);
        router.refresh();
      } else {
        toast({
          title: "Fout bij toevoegen",
          description: result.error || "Er is een fout opgetreden",
          variant: "destructive",
        });
      }
    });
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      form.reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Organisatie toevoegen
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <DialogHeader>
              <DialogTitle>Organisatie toevoegen</DialogTitle>
              <DialogDescription>
                Voeg een bedrijfsnaam toe voor rapportage van zakelijke ritten.
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
                        placeholder="bijv. Hovenierbedrijf Jacobs"
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
                Toevoegen
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
