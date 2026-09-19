"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  IconAlertCircle,
  IconBell,
  IconCalendarEvent,
  IconCheck,
  IconChecks,
  IconCreditCard,
  IconMail,
  IconNews,
  IconTrash,
} from "@tabler/icons-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  getNotificationsAction,
  markNotificationAsReadAction,
  markAllNotificationsAsReadAction,
  deleteNotificationAction,
  clearAllReadNotificationsAction,
} from "@/actions/notification";
import type { NotificationDTO, NotificationType } from "@/types/notification";

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

const NOTIFICATION_ICONS: Record<
  NotificationType,
  { icon: React.ComponentType<{ size?: number; className?: string }>; bg: string; text: string }
> = {
  appointment_created: {
    icon: IconCalendarEvent,
    bg: "bg-blue-500/10 dark:bg-blue-500/20",
    text: "text-blue-600 dark:text-blue-400",
  },
  appointment_status_changed: {
    icon: IconCalendarEvent,
    bg: "bg-amber-500/10 dark:bg-amber-500/20",
    text: "text-amber-600 dark:text-amber-400",
  },
  appointment_cancelled: {
    icon: IconCalendarEvent,
    bg: "bg-red-500/10 dark:bg-red-500/20",
    text: "text-red-600 dark:text-red-400",
  },
  appointment_reminder: {
    icon: IconCalendarEvent,
    bg: "bg-indigo-500/10 dark:bg-indigo-500/20",
    text: "text-indigo-600 dark:text-indigo-400",
  },
  payment_received: {
    icon: IconCreditCard,
    bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  inquiry_received: {
    icon: IconMail,
    bg: "bg-violet-500/10 dark:bg-violet-500/20",
    text: "text-violet-600 dark:text-violet-400",
  },
  subscriber_joined: {
    icon: IconNews,
    bg: "bg-cyan-500/10 dark:bg-cyan-500/20",
    text: "text-cyan-600 dark:text-cyan-400",
  },
  system_alert: {
    icon: IconAlertCircle,
    bg: "bg-rose-500/10 dark:bg-rose-500/20",
    text: "text-rose-600 dark:text-rose-400",
  },
};

interface NotificationDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNotificationsUpdated?: () => void;
}

export function NotificationDrawer({
  open,
  onOpenChange,
  onNotificationsUpdated,
}: NotificationDrawerProps) {
  const router = useRouter();
  const [filter, setFilter] = React.useState<"all" | "unread">("all");
  const [notifications, setNotifications] = React.useState<NotificationDTO[]>([]);
  const [unreadCount, setUnreadCount] = React.useState<number>(0);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [isMarkingAll, setIsMarkingAll] = React.useState<boolean>(false);
  const [isClearingRead, setIsClearingRead] = React.useState<boolean>(false);

  const fetchNotifications = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getNotificationsAction({ filter, limit: 30 });
      if (res.success && res.data) {
        setNotifications(res.data.notifications);
        setUnreadCount(res.data.unreadCount);
      }
    } catch {
      toast.error("Failed to load notifications");
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  React.useEffect(() => {
    let isMounted = true;

    if (open) {
      void getNotificationsAction({ filter, limit: 30 }).then((res) => {
        if (isMounted && res.success && res.data) {
          setNotifications(res.data.notifications);
          setUnreadCount(res.data.unreadCount);
        }
      });
    }

    return () => {
      isMounted = false;
    };
  }, [open, filter]);

  const handleMarkAsRead = async (notification: NotificationDTO) => {
    if (notification.isRead) {
      if (notification.link) {
        onOpenChange(false);
        router.push(notification.link);
      }
      return;
    }

    // Optimistic update
    setNotifications((prev) =>
      prev.map((item) => (item.id === notification.id ? { ...item, isRead: true } : item))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    onNotificationsUpdated?.();

    if (notification.link) {
      onOpenChange(false);
      router.push(notification.link);
    }

    try {
      await markNotificationAsReadAction(notification.id);
    } catch {
      toast.error("Failed to mark as read");
      void fetchNotifications();
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;
    setIsMarkingAll(true);

    // Optimistic update
    setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
    setUnreadCount(0);
    onNotificationsUpdated?.();

    try {
      const res = await markAllNotificationsAsReadAction();
      if (res.success) {
        toast.success("All notifications marked as read");
      } else {
        toast.error(res.error || "Failed to mark all as read");
        void fetchNotifications();
      }
    } catch {
      toast.error("Failed to mark all as read");
      void fetchNotifications();
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();

    // Optimistic update
    const target = notifications.find((n) => n.id === id);
    setNotifications((prev) => prev.filter((item) => item.id !== id));
    if (target && !target.isRead) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
    onNotificationsUpdated?.();

    try {
      const res = await deleteNotificationAction(id);
      if (res.success) {
        toast.success("Notification removed");
      } else {
        toast.error(res.error || "Failed to delete notification");
        void fetchNotifications();
      }
    } catch {
      toast.error("Failed to delete notification");
      void fetchNotifications();
    }
  };

  const handleClearAllRead = async () => {
    setIsClearingRead(true);

    // Optimistic update
    setNotifications((prev) => prev.filter((item) => !item.isRead));
    onNotificationsUpdated?.();

    try {
      const res = await clearAllReadNotificationsAction();
      if (res.success) {
        toast.success(res.message || "Read notifications cleared");
      } else {
        toast.error(res.error || "Failed to clear notifications");
        void fetchNotifications();
      }
    } catch {
      toast.error("Failed to clear notifications");
      void fetchNotifications();
    } finally {
      setIsClearingRead(false);
    }
  };

  const readCount = notifications.filter((n) => n.isRead).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col h-full bg-card border-l border-border"
      >
        {/* Header */}
        <SheetHeader className="p-4 border-b border-border/60 bg-muted/20 shrink-0">
          <div className="flex items-center justify-between pr-8">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <IconBell size={18} />
              </div>
              <div>
                <SheetTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  Notifications
                  {unreadCount > 0 && (
                    <Badge variant="destructive" className="h-5 px-1.5 text-[10px] font-semibold">
                      {unreadCount} unread
                    </Badge>
                  )}
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">
                  Stay updated with activities and alerts.
                </SheetDescription>
              </div>
            </div>

            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                disabled={isMarkingAll}
                className="h-8 text-xs font-medium text-primary hover:text-primary/90 hover:bg-primary/10 gap-1"
              >
                <IconChecks size={14} />
                <span>Mark all read</span>
              </Button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 pt-2">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer",
                filter === "all"
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilter("unread")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5",
                filter === "unread"
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <span>Unread</span>
              {unreadCount > 0 && (
                <span
                  className={cn(
                    "inline-flex items-center justify-center size-4 rounded-full text-[10px]",
                    filter === "unread" ? "bg-primary-foreground/20 text-primary-foreground" : "bg-destructive text-destructive-foreground"
                  )}
                >
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </SheetHeader>

        {/* Notification List Container */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/40 min-h-0">
          {isLoading && notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground">
              <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-xs">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 p-6 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/80 text-muted-foreground mb-3">
                <IconCheck size={24} />
              </div>
              <p className="text-sm font-semibold text-foreground">
                {filter === "unread" ? "No unread notifications" : "No notifications yet"}
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">
                {filter === "unread"
                  ? "You are completely caught up with your activities."
                  : "When appointments, inquiries, or alerts occur, they will show up here."}
              </p>
            </div>
          ) : (
            notifications.map((notification) => {
              const meta = NOTIFICATION_ICONS[notification.type] || NOTIFICATION_ICONS.system_alert;
              const IconComp = meta.icon;

              return (
                <div
                  key={notification.id}
                  onClick={() => handleMarkAsRead(notification)}
                  className={cn(
                    "group relative flex items-start gap-3 p-3.5 transition-colors cursor-pointer hover:bg-muted/50",
                    !notification.isRead && "bg-primary/[0.03] dark:bg-primary/[0.06]"
                  )}
                >
                  {/* Icon Avatar */}
                  <div
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105",
                      meta.bg,
                      meta.text
                    )}
                  >
                    <IconComp size={18} />
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-center gap-1.5">
                      <p
                        className={cn(
                          "text-xs font-semibold truncate text-foreground",
                          !notification.isRead && "font-bold text-foreground"
                        )}
                      >
                        {notification.title}
                      </p>
                      {!notification.isRead && (
                        <span className="size-1.5 rounded-full bg-primary shrink-0" />
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                      {notification.message}
                    </p>

                    <span className="text-[10px] text-muted-foreground/75 font-medium mt-1 inline-block">
                      {formatRelativeTime(notification.createdAt)}
                    </span>
                  </div>

                  {/* Delete Item Action */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleDelete(e, notification.id)}
                    className="absolute top-3 right-3 size-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md"
                    title="Delete notification"
                  >
                    <IconTrash size={14} />
                  </Button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {readCount > 0 && (
          <SheetFooter className="p-3 border-t border-border/60 bg-muted/20 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAllRead}
              disabled={isClearingRead}
              className="w-full text-xs font-medium border-border hover:bg-accent text-muted-foreground hover:text-foreground gap-1.5"
            >
              <IconTrash size={14} />
              <span>Clear all read ({readCount})</span>
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
