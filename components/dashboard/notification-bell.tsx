"use client";

import * as React from "react";
import { IconBell } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { NotificationDrawer } from "@/components/dashboard/notification-drawer";
import { getUnreadNotificationCountAction } from "@/actions/notification";

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = React.useState<number>(0);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState<boolean>(false);

  const fetchUnreadCount = React.useCallback(async () => {
    try {
      const res = await getUnreadNotificationCountAction();
      if (res.success && res.data) {
        setUnreadCount(res.data.unreadCount);
      }
    } catch {
      // Silently ignore polling errors
    }
  }, []);

  React.useEffect(() => {
    let isMounted = true;

    // Initial fetch in async promise
    void getUnreadNotificationCountAction().then((res) => {
      if (isMounted && res.success && res.data) {
        setUnreadCount(res.data.unreadCount);
      }
    });

    // 30-second interval polling
    const interval = setInterval(() => {
      void getUnreadNotificationCountAction().then((res) => {
        if (isMounted && res.success && res.data) {
          setUnreadCount(res.data.unreadCount);
        }
      });
    }, 30000);

    // Revalidate on window focus
    const handleFocus = () => {
      void getUnreadNotificationCountAction().then((res) => {
        if (isMounted && res.success && res.data) {
          setUnreadCount(res.data.unreadCount);
        }
      });
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const displayCount = unreadCount > 9 ? "9+" : unreadCount;

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        onClick={() => setIsDrawerOpen(true)}
        className="relative flex size-8 sm:size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card shadow-2xs hover:bg-accent text-foreground transition-colors cursor-pointer"
        aria-label="Activity Notifications"
        title="Activity Notifications"
      >
        <IconBell size={18} className="text-foreground" />

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold leading-none shadow-xs animate-pulse">
            {displayCount}
          </span>
        )}
      </Button>

      <NotificationDrawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        onNotificationsUpdated={fetchUnreadCount}
      />
    </>
  );
}
