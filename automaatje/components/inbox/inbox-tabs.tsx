"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from "next/navigation";
import { NotificationList } from "./notification-list";
import type { Notification } from "@/lib/db/schema";

interface InboxTabsProps {
  defaultTab?: "ongelezen" | "archief";
  initialUnreadNotifications?: Notification[];
  initialArchivedNotifications?: Notification[];
}

export function InboxTabs({
  defaultTab = "ongelezen",
  initialUnreadNotifications = [],
  initialArchivedNotifications = [],
}: InboxTabsProps) {
  const router = useRouter();

  const handleTabChange = (value: string) => {
    if (value === "ongelezen") {
      router.push("/inbox");
    } else {
      router.push("/inbox/archief");
    }
  };

  const handleRefresh = () => {
    router.refresh();
  };

  return (
    <Tabs value={defaultTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="grid w-full max-w-md grid-cols-2">
        <TabsTrigger value="ongelezen">Ongelezen</TabsTrigger>
        <TabsTrigger value="archief">Archief</TabsTrigger>
      </TabsList>

      <TabsContent value="ongelezen" className="mt-6">
        <NotificationList
          initialNotifications={initialUnreadNotifications}
          filter="unread"
          onRefresh={handleRefresh}
        />
      </TabsContent>

      <TabsContent value="archief" className="mt-6">
        <NotificationList
          initialNotifications={initialArchivedNotifications}
          filter="archived"
          onRefresh={handleRefresh}
        />
      </TabsContent>
    </Tabs>
  );
}
