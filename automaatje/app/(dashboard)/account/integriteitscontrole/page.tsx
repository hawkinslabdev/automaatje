import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/actions/auth";
import { SettingsPlaceholder } from "@/components/account/settings-placeholder";
import { Shield } from "lucide-react";

export default async function IntegriteitscontrolePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <SettingsPlaceholder
      title="Integriteitscontrole"
      description="Controleer en valideer de integriteit van je kilometerregistraties"
      icon={<Shield className="h-12 w-12 text-muted-foreground" />}
    />
  );
}
