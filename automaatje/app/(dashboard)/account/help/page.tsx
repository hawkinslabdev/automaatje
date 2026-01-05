import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/actions/auth";
import { SettingsPlaceholder } from "@/components/account/settings-placeholder";
import { HelpCircle } from "lucide-react";

export default async function HelpPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <SettingsPlaceholder
      title="Helpcentrum"
      description="Doorzoek het helpcentrum voor antwoorden op je vragen"
      icon={<HelpCircle className="h-12 w-12 text-muted-foreground" />}
    />
  );
}
