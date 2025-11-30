"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Realtime } from "ably";
import type { ConnectionStateChange, Message } from "ably";
import { queryClient } from "./queryClient";
import type { RealtimeEvent } from "@shared/realtime";

const GLOBAL_CHANNEL = "pulse-global";

type Channel = ReturnType<Realtime["channels"]["get"]>;

export function useRealtime(userId?: number | null) {
  const clientRef = useRef<Realtime | null>(null);
  const globalChannelRef = useRef<Channel | null>(null);
  const userChannelRef = useRef<Channel | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const handleEvent = useCallback((message: Message) => {
    const event = message.data as RealtimeEvent;
    if (!event?.type) return;

    switch (event.type) {
      case "market:updated":
        queryClient.invalidateQueries({ queryKey: ["/api/markets"] });
        queryClient.invalidateQueries({
          queryKey: ["/api/markets", event.data.id.toString()],
        });
        break;
      case "market:resolved":
        queryClient.invalidateQueries({ queryKey: ["/api/markets"] });
        queryClient.invalidateQueries({
          queryKey: ["/api/markets", event.data.id.toString()],
        });
        queryClient.invalidateQueries({ queryKey: ["/api/bets"] });
        queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
        queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
        break;
      case "bet:placed":
        queryClient.invalidateQueries({ queryKey: ["/api/markets"] });
        queryClient.invalidateQueries({
          queryKey: ["/api/markets", event.data.marketId.toString()],
        });
        queryClient.invalidateQueries({ queryKey: ["/api/bets"] });
        queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
        break;
      case "market:created":
        queryClient.invalidateQueries({ queryKey: ["/api/markets"] });
        queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
        break;
      case "balance:updated":
        queryClient.invalidateQueries({ queryKey: ["/api/wallet/balance"] });
        queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
        break;
      case "notification:new":
        queryClient.setQueryData<{ notifications: any[] } | undefined>(
          ["/api/notifications"],
          (current) => {
            const existing = current?.notifications ?? [];
            const filtered = existing.filter(
              (item) => item.id !== event.data.notification.id
            );
            return {
              notifications: [event.data.notification, ...filtered].slice(0, 30),
            };
          }
        );
        break;
    }
  }, []);

  useEffect(() => {
    const client = new Realtime({
      authUrl: "/api/realtime/auth",
      authMethod: "POST",
      transports: ["web_socket"],
      echoMessages: false,
    });

    clientRef.current = client;

    const handleStateChange = (stateChange: ConnectionStateChange) => {
      setIsConnected(stateChange.current === "connected");
    };

    client.connection.on(handleStateChange);

    const globalChannel = client.channels.get(GLOBAL_CHANNEL);
    globalChannelRef.current = globalChannel;
    globalChannel.subscribe(handleEvent).catch((error) => {
      const state = client.connection.state;
      if (state === "closing" || state === "closed") {
        return;
      }
      console.error("[Realtime] Failed to subscribe to global channel", error);
    });

    return () => {
      client.connection.off(handleStateChange);
      globalChannel.unsubscribe();
      globalChannelRef.current = null;
      client.close();
      clientRef.current = null;
    };
  }, [handleEvent]);

  useEffect(() => {
    const client = clientRef.current;
    if (!client) {
      return;
    }

    if (!userId) {
      if (userChannelRef.current) {
        userChannelRef.current.unsubscribe();
        userChannelRef.current = null;
      }
      return;
    }

    const channel = client.channels.get(`user:${userId}`);
    userChannelRef.current = channel;

    channel.subscribe(handleEvent).catch((error) => {
      const state = client.connection.state;
      if (state === "closing" || state === "closed") {
        return;
      }
      console.error("[Realtime] Failed to subscribe to user channel", error);
    });

    return () => {
      channel.unsubscribe();
      if (userChannelRef.current === channel) {
        userChannelRef.current = null;
      }
    };
  }, [userId, handleEvent]);

  return {
    isConnected,
  };
}

