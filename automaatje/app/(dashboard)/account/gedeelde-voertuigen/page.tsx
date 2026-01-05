import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/actions/auth";
import { SettingsPlaceholder } from "@/components/account/settings-placeholder";
import { Share2 } from "lucide-react";

export default async function GedeeldeVoertuigenPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <SettingsPlaceholder
      title="Gedeelde voertuigen"
      description="Beheer voertuigen die met je gedeeld zijn of die je hebt gedeeld"
      icon={<Share2 className="h-12 w-12 text-muted-foreground" />}
    />
  );
}
