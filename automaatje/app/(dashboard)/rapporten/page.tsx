import { getCurrentUser } from "@/lib/actions/auth";
import { redirect } from "next/navigation";
import { FileText } from "lucide-react";

export default async function RapportenPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Rapporten</h1>
        <p className="text-muted-foreground">
          Exporteer en analyseer je kilometerregistraties
        </p>
      </div>

      <div className="rounded-lg border bg-card p-12">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="rounded-full bg-muted p-6 mb-4">
            <FileText className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Rapportages</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Exporteer je registraties naar CSV, Excel of JSON voor verdere
            verwerking.
          </p>
        </div>
      </div>
    </div>
  );
}
