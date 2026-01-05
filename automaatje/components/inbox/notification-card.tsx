"use client";

import { useState, useTransition } from "react";
import type { Notification } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileText,
  Trophy,
  Wrench,
  Users,
  AlertTriangle,
  Info,
  Circle,
  CheckCircle2,
  Archive,
  ArchiveRestore,
  Trash2,
  MoreVertical,
  Pin,
  PinOff,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import Link from "next/link";
import {
  markAsRead,
  markAsUnread,
  archiveNotification,
  unarchiveNotification,
  deleteNotification,
  togglePin,
} from "@/lib/actions/notifications";
import { useRouter } from "next/navigation";

interface NotificationCardProps {
  notification: Notification;
  onUpdate?: () => void;
}

// Map notification types to icons
const iconMap: Record<string, any> = {
  report_generated: FileText,
  odometer_milestone: Trophy,
  maintenance_reminder: Wrench,
  shared_vehicle: Users,
  incomplete_trip: AlertTriangle,
  system_announcement: Info,
  custom: Info,
};

// Map priority to colors
const priorityColors: Record<string, string> = {
  low: "text-blue-500",
  normal: "text-gray-500",
  high: "text-orange-500",
  urgent: "text-red-500",
};

export function NotificationCard({ notification, onUpdate }: NotificationCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDeleting, setIsDeleting] = useState(false);

  const data = notification.data as any;
  const Icon = iconMap[data.type] || Info;
  const priorityColor = priorityColors[data.priority || "normal"];

  const handleMarkAsRead = async () => {
    startTransition(async () => {
      if (notification.isRead) {
        await markAsUnread(notification.id);
      } else {
        await markAsRead(notification.id);
      }
      onUpdate?.();
    });
  };

  const handleArchive = async () => {
    startTransition(async () => {
      if (notification.isArchived) {
        await unarchiveNotification(notification.id);
      } else {
        await archiveNotification(notification.id);
      }
      onUpdate?.();
    });
  };

  const handleDelete = async () => {
    if (!confirm("Weet je zeker dat je deze notificatie wilt verwijderen?")) {
      return;
    }

    setIsDeleting(true);
    startTransition(async () => {
      await deleteNotification(notification.id);
      onUpdate?.();
    });
  };

  const handleTogglePin = async () => {
    startTransition(async () => {
      await togglePin(notification.id);
      onUpdate?.();
    });
  };

  const handleCardClick = async () => {
    // Mark as read when clicking
    if (!notification.isRead) {
      await markAsRead(notification.id);
      onUpdate?.();
    }

    // Navigate to action URL if available
    if (data.action?.url) {
      router.push(data.action.url);
    }
  };

  const relativeTime = notification.createdAt
    ? formatDistanceToNow(new Date(notification.createdAt), {
        addSuffix: true,
        locale: nl,
      })
    : "";

  if (isDeleting) {
    return null;
  }

  return (
    <div
      className={cn(
        "group relative flex gap-4 rounded-lg border p-4 transition-all hover:bg-accent/50",
        !notification.isRead && "bg-accent/20 border-l-4 border-l-primary",
        notification.isPinned && "border-2 border-yellow-500/50",
        data.action?.url && "cursor-pointer"
      )}
      onClick={data.action?.url ? handleCardClick : undefined}
    >
      {/* Icon */}
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
          data.color === "blue" && "bg-blue-500/10 text-blue-500",
          data.color === "yellow" && "bg-yellow-500/10 text-yellow-500",
          data.color === "red" && "bg-red-500/10 text-red-500",
          data.color === "green" && "bg-green-500/10 text-green-500",
          data.color === "orange" && "bg-orange-500/10 text-orange-500",
          !data.color && "bg-primary/10 text-primary"
        )}
      >
        <Icon className="h-5 w-5" />
      </div>

      {/* Content */}
      <div className="flex-1 space-y-1">
        {/* Title and badges */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className={cn("font-semibold", !notification.isRead && "font-bold")}>
              {data.title}
            </h3>
            {!notification.isRead && (
              <Circle className="h-2 w-2 fill-primary text-primary" />
            )}
            {notification.isPinned && (
              <Pin className="h-3 w-3 text-yellow-500 fill-yellow-500" />
            )}
          </div>

          {/* Actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
                disabled={isPending}
              >
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Meer opties</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleMarkAsRead}>
                {notification.isRead ? (
                  <>
                    <Circle className="mr-2 h-4 w-4" />
                    Markeer als ongelezen
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Markeer als gelezen
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleTogglePin}>
                {notification.isPinned ? (
                  <>
                    <PinOff className="mr-2 h-4 w-4" />
                    Losmaken
                  </>
                ) : (
                  <>
                    <Pin className="mr-2 h-4 w-4" />
                    Vastpinnen
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleArchive}>
                {notification.isArchived ? (
                  <>
                    <ArchiveRestore className="mr-2 h-4 w-4" />
                    Terugzetten
                  </>
                ) : (
                  <>
                    <Archive className="mr-2 h-4 w-4" />
                    Archiveren
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Verwijderen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Message */}
        <p className="text-sm text-muted-foreground">{data.message}</p>

        {/* Footer: timestamp and action button */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{relativeTime}</span>
            {data.deliveredVia && data.deliveredVia.length > 0 && (
              <Badge variant="outline" className="h-5 text-xs">
                {data.deliveredVia.join(", ")}
              </Badge>
            )}
            {data.priority && data.priority !== "normal" && (
              <Badge
                variant={data.priority === "urgent" ? "destructive" : "secondary"}
                className="h-5 text-xs"
              >
                {data.priority === "urgent" && "Urgent"}
                {data.priority === "high" && "Hoog"}
                {data.priority === "low" && "Laag"}
              </Badge>
            )}
          </div>

          {/* Action button */}
          {data.action && !data.action.url && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={(e) => {
                e.stopPropagation();
                handleCardClick();
              }}
            >
              {data.action.label}
              <ExternalLink className="ml-2 h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
