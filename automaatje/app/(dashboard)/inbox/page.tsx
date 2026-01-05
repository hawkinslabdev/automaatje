import { InboxTabs } from "@/components/inbox/inbox-tabs";
import { getNotifications } from "@/lib/actions/notifications";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/actions/auth";

export default async function InboxPage() {
  // Check authentication
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  // Fetch unread notifications
  const { data: unreadNotifications } = await getNotifications("unread", 100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Meldingen</h1>
        <p className="text-muted-foreground">
          Overzicht van jouw berichten en meldingen
        </p>
      </div>

      <InboxTabs
        defaultTab="ongelezen"
        initialUnreadNotifications={unreadNotifications || []}
      />
    </div>
  );
}
