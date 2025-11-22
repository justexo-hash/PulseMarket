"use client";

import { useAuth } from "@/lib/auth";
import { useRealtime } from "@/lib/realtime";
import { useMarketNotifications } from "@/lib/notifications";

export function AppEffects() {
  const { user } = useAuth();

  useRealtime(user?.id);
  useMarketNotifications(user?.id);

  return null;
}

