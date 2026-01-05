import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/actions/auth";
import { SettingsPlaceholder } from "@/components/account/settings-placeholder";
import { Calendar } from "lucide-react";

export default async function RapportageperiodenPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <SettingsPlaceholder
      title="Rapportageperioden"
      description="Stel standaard rapportageperioden in voor je overzichten"
      icon={<Calendar className="h-12 w-12 text-muted-foreground" />}
    />
  );
}
