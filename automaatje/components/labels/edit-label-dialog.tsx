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
import { updateLabel } from "@/lib/actions/labels";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import {
  labelSchema,
  type LabelFormData,
} from "@/lib/validations/label";

// Preset colors for labels
const PRESET_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#eab308", // yellow
  "#84cc16", // lime
  "#22c55e", // green
  "#10b981", // emerald
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#0ea5e9", // sky
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#a855f7", // purple
  "#d946ef", // fuchsia
  "#ec4899", // pink
  "#f43f5e", // rose
  "#64748b", // slate
];

interface EditLabelDialogProps {
  id: string;
  currentName: string;
  currentColor: string;
}

export function EditLabelDialog({
  id,
  currentName,
  currentColor,
}: EditLabelDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const form = useForm<LabelFormData>({
    resolver: zodResolver(labelSchema),
    defaultValues: {
      name: currentName,
      color: currentColor,
    },
  });

  const handleSubmit = async (data: LabelFormData) => {
    startTransition(async () => {
      const result = await updateLabel(id, data);

      if (result.success) {
        toast({
          title: "Label bijgewerkt",
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
      // Reset to current values when closing
      form.reset({
        name: currentName,
        color: currentColor,
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
      <DialogContent className="sm:max-w-[500px]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <DialogHeader>
              <DialogTitle>Label bewerken</DialogTitle>
              <DialogDescription>
                Wijzig de naam of kleur van deze label.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Label naam</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="bijv. Afspraak, Tussenbestemming, Lunch, Woon-werk"
                        {...field}
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kleur</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <div className="grid grid-cols-9 gap-2">
                          {PRESET_COLORS.map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => {
                                field.onChange(color);
                              }}
                              className={`h-8 w-8 rounded-md border-2 transition-all ${
                                field.value === color
                                  ? "border-primary scale-110"
                                  : "border-transparent hover:scale-105"
                              }`}
                              style={{ backgroundColor: color }}
                              title={color}
                            />
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={field.value}
                            onChange={(e) => field.onChange(e.target.value)}
                            className="h-10 w-20 rounded-md border border-input"
                            disabled={isPending}
                          />
                          <input
                            type="text"
                            value={field.value}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                                if (value.length === 7) {
                                  field.onChange(value);
                                }
                              }
                            }}
                            placeholder="#808080"
                            maxLength={7}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={isPending}
                          />
                        </div>
                      </div>
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
