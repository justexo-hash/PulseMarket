"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, CheckCircle2, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  type: "follower" | "payout" | "refund";
  title: string;
  message: string;
  createdAt: string;
  href?: string;
}

interface NotificationsDropdownProps {
  enabled: boolean;
  align?: "start" | "center" | "end";
}

const LAST_SEEN_STORAGE_KEY = "pulse-notifications-last-seen";

export function NotificationsDropdown({
  enabled,
  align = "end",
}: NotificationsDropdownProps) {
  const [lastSeen, setLastSeen] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    const stored = window.localStorage.getItem(LAST_SEEN_STORAGE_KEY);
    return stored ? Number(stored) : 0;
  });

  const { data, isLoading, isError } = useQuery<{ notifications: NotificationItem[] }>({
    queryKey: ["/api/notifications"],
    enabled,
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(LAST_SEEN_STORAGE_KEY);
    if (stored) {
      setLastSeen(Number(stored));
    }
  }, []);

  const notifications = data?.notifications ?? [];

  const mostRecentTimestamp = notifications.length
    ? new Date(notifications[0].createdAt).getTime()
    : lastSeen;

  const hasUnread =
    notifications.length > 0 &&
    notifications.some(
      (item) => new Date(item.createdAt).getTime() > lastSeen
    );

  const handleOpenChange = (open: boolean) => {
    if (open && hasUnread) {
      const now = Date.now();
      setLastSeen(now);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          LAST_SEEN_STORAGE_KEY,
          now.toString()
        );
      }
    }
  };

  const iconClass = useMemo(
    () =>
      cn("h-5 w-5", {
        "text-secondary-foreground": !hasUnread,
        "text-primary": hasUnread,
      }),
    [hasUnread]
  );

  if (!enabled) {
    return null;
  }

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className={iconClass} />
          {hasUnread && (
            <span className="absolute top-1 right-1 inline-flex h-2 w-2 rounded-full bg-primary" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        className="w-80 bg-background text-secondary-foreground shadow-xl"
      >
        <div className="px-4 py-2">
          <p className="text-xs uppercase text-muted-foreground">Notifications</p>
          <p className="text-xs text-muted-foreground">
            {notifications.length
              ? `Last update ${formatDistanceToNow(mostRecentTimestamp, {
                  addSuffix: true,
                })}`
              : "No notifications yet"}
          </p>
        </div>
        <DropdownMenuSeparator />
        {isLoading ? (
          <div className="px-4 py-6 text-sm text-muted-foreground">Loading…</div>
        ) : isError ? (
          <div className="px-4 py-6 text-sm text-destructive">
            Unable to load notifications.
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-4 py-6 text-sm text-muted-foreground">
            You're all caught up!
          </div>
        ) : (
          notifications.map((notification) => {
            const content = (
              <div className="flex gap-3">
                <div className="mt-1">
                  {notification.type === "follower" ? (
                    <UserPlus className="h-4 w-4 text-primary" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-semibold">{notification.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {notification.message}
                  </p>
                  <p className="text-xs text-muted-foreground/80">
                    {formatDistanceToNow(new Date(notification.createdAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </div>
            );
            if (notification.href) {
              return (
                <DropdownMenuItem
                  key={notification.id}
                  asChild
                  className="focus:bg-muted/40 focus:text-secondary-foreground"
                >
                  <Link href={notification.href} className="block w-full">
                    {content}
                  </Link>
                </DropdownMenuItem>
              );
            }
            return (
              <DropdownMenuItem
                key={notification.id}
                className="focus:bg-muted/40 focus:text-secondary-foreground"
              >
                {content}
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


