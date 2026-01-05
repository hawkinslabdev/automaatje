"use client";

import { useEffect, useState, useTransition } from "react";
import type { Notification } from "@/lib/db/schema";
import { NotificationCard } from "./notification-card";
import { Button } from "@/components/ui/button";
import { CheckCheck, Trash2, Inbox, Archive as ArchiveIcon } from "lucide-react";
import { markAllAsRead, deleteAllArchived } from "@/lib/actions/notifications";
import { Skeleton } from "@/components/ui/skeleton";

interface NotificationListProps {
  initialNotifications: Notification[];
  filter: "unread" | "archived";
  onRefresh?: () => void;
}

export function NotificationList({
  initialNotifications,
  filter,
  onRefresh,
}: NotificationListProps) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [isPending, startTransition] = useTransition();

  // Update local state when initialNotifications change
  useEffect(() => {
    setNotifications(initialNotifications);
  }, [initialNotifications]);

  const handleMarkAllAsRead = async () => {
    startTransition(async () => {
      await markAllAsRead();
      onRefresh?.();
    });
  };

  const handleDeleteAllArchived = async () => {
    if (
      !confirm(
        "Weet je zeker dat je alle gearchiveerde notificaties wilt verwijderen? Dit kan niet ongedaan worden gemaakt."
      )
    ) {
      return;
    }

    startTransition(async () => {
      await deleteAllArchived();
      onRefresh?.();
    });
  };

  const handleUpdate = () => {
    onRefresh?.();
  };

  // Empty state
  if (notifications.length === 0 && !isPending) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        {filter === "unread" ? (
          <>
            <div className="mb-4 rounded-full bg-primary/10 p-6">
              <Inbox className="h-12 w-12 text-primary" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">Geen nieuwe meldingen</h3>
            <p className="text-sm text-muted-foreground">
              Je bent helemaal bij! Nieuwe meldingen verschijnen hier.
            </p>
          </>
        ) : (
          <>
            <div className="mb-4 rounded-full bg-primary/10 p-6">
              <ArchiveIcon className="h-12 w-12 text-primary" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">Geen gearchiveerde meldingen</h3>
            <p className="text-sm text-muted-foreground">
              Gearchiveerde meldingen verschijnen hier.
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bulk actions */}
      {notifications.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border bg-card p-3">
          <span className="text-sm text-muted-foreground">
            {notifications.length} {notifications.length === 1 ? "melding" : "meldingen"}
          </span>
          <div className="flex gap-2">
            {filter === "unread" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllAsRead}
                disabled={isPending}
              >
                <CheckCheck className="mr-2 h-4 w-4" />
                Alles als gelezen markeren
              </Button>
            )}
            {filter === "archived" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteAllArchived}
                disabled={isPending}
                className="text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Alles verwijderen
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {isPending && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border p-4">
              <div className="flex gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Notification list */}
      {!isPending && (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onUpdate={handleUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
