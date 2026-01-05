import { getCurrentUser } from "@/lib/actions/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";
import { JobsStatusCard } from "@/components/admin/jobs-status-card";
import { UserManagementCard } from "@/components/admin/user-management-card";

export default async function InstellingenPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Check if user is admin
  if (user.role !== "ADMIN") {
    redirect("/registraties");
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Instellingen</h1>
        <p className="text-muted-foreground">
          Beheer systeeminstellingen en gebruikers
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Jobs Status */}
        <JobsStatusCard />

        {/* User Management */}
        <UserManagementCard />

        {/* System Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Systeeminformatie
            </CardTitle>
            <CardDescription>
              Overzicht van systeem status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <h4 className="font-medium mb-2">Backup</h4>
                <p className="text-sm text-muted-foreground">
                  Configureer automatische backups naar S3-compatibele storage.
                  Herstel vanuit eerdere backups.
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <h4 className="font-medium mb-2">Database</h4>
                <p className="text-sm text-muted-foreground">
                  Bekijk database grootte en andere technische details.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
