import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/actions/auth";
import { SettingsPlaceholder } from "@/components/account/settings-placeholder";
import { FileText } from "lucide-react";

export default async function RapportagegegevensPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <SettingsPlaceholder
      title="Rapportagegegevens"
      description="Configureer welke gegevens worden opgenomen in rapporten"
      icon={<FileText className="h-12 w-12 text-muted-foreground" />}
    />
  );
}
