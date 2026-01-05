import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/actions/auth";
import { getNotificationSettings } from "@/lib/actions/notification-settings";
import { NotificationSettingsClient } from "./_components/notification-settings-client";

export default async function NotificationSettingsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const { data: settings } = await getNotificationSettings();

  // Check if Resend API key is configured
  const resendApiKey = process.env.RESEND_API_KEY;
  const isEmailConfigured = !!(resendApiKey && resendApiKey.startsWith("re_"));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notificatie-instellingen</h1>
        <p className="text-muted-foreground">
          Beheer hoe en wanneer je meldingen ontvangt
        </p>
      </div>

      <NotificationSettingsClient
        initialSettings={settings}
        userEmail={user.email}
        isEmailConfigured={isEmailConfigured}
      />
    </div>
  );
}
