import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { type Market } from '@shared/schema';

/**
 * Hook to request notification permission and set up market expiration notifications
 */
export function useMarketNotifications(userId?: number | null) {
  const notificationPermissionRef = useRef<NotificationPermission | null>(null);
  const notifiedMarketsRef = useRef<Set<number>>(new Set());

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        notificationPermissionRef.current = permission;
        console.log('[Notifications] Permission:', permission);
      });
    } else if ('Notification' in window) {
      notificationPermissionRef.current = Notification.permission;
    }
  }, []);

  // Fetch markets that the user has bets on
  const { data: bets = [] } = useQuery({
    queryKey: ['/api/bets'],
    enabled: !!userId,
    refetchInterval: 60000, // Check every minute
  });

  const { data: markets = [] } = useQuery<Market[]>({
    queryKey: ['/api/markets'],
    refetchInterval: 60000, // Check every minute
  });

  // Check for expiring markets
  useEffect(() => {
    if (!userId || !notificationPermissionRef.current || notificationPermissionRef.current !== 'granted') {
      return;
    }

    if (!bets.length || !markets.length) {
      return;
    }

    const now = new Date().getTime();
    const ONE_HOUR = 60 * 60 * 1000;
    const ONE_DAY = 24 * 60 * 60 * 1000;

    // Get markets the user has bets on
    const userMarketIds = new Set(bets.map(bet => bet.marketId));
    const userMarkets = markets.filter(m => 
      userMarketIds.has(m.id) && 
      m.status === 'active' && 
      m.expiresAt
    );

    for (const market of userMarkets) {
      if (!market.expiresAt || notifiedMarketsRef.current.has(market.id)) {
        continue;
      }

      const expirationTime = new Date(market.expiresAt).getTime();
      const timeUntilExpiry = expirationTime - now;

      // Notify if market expires in the next hour
      if (timeUntilExpiry > 0 && timeUntilExpiry <= ONE_HOUR) {
        const minutesLeft = Math.floor(timeUntilExpiry / (60 * 1000));
        
        new Notification('Market Expiring Soon!', {
          body: `${market.question}\n\nExpires in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}`,
          icon: '/favicon.ico', // You can add a notification icon
          tag: `market-${market.id}`, // Prevent duplicate notifications
        });

        notifiedMarketsRef.current.add(market.id);
        console.log(`[Notifications] Notified about market ${market.id} expiring in ${minutesLeft} minutes`);
      }
      // Also notify if market expires in next 24 hours (one-time)
      else if (timeUntilExpiry > ONE_HOUR && timeUntilExpiry <= ONE_DAY) {
        const hoursLeft = Math.floor(timeUntilExpiry / (60 * 60 * 1000));
        const notificationTag = `market-${market.id}-24h`;
        
        // Check if we already sent the 24h warning
        if (!notifiedMarketsRef.current.has(market.id * 1000)) {
          new Notification('Market Expiring Soon', {
            body: `${market.question}\n\nExpires in ${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''}`,
            icon: '/favicon.ico',
            tag: notificationTag,
          });

          notifiedMarketsRef.current.add(market.id * 1000); // Use special ID for 24h notification
          console.log(`[Notifications] Notified about market ${market.id} expiring in ${hoursLeft} hours`);
        }
      }
    }

    // Clean up old notifications (markets that have expired or been resolved)
    const expiredMarkets = markets.filter(m => 
      (m.status === 'resolved' || (m.expiresAt && new Date(m.expiresAt).getTime() < now)) &&
      notifiedMarketsRef.current.has(m.id)
    );
    
    expiredMarkets.forEach(m => {
      notifiedMarketsRef.current.delete(m.id);
      notifiedMarketsRef.current.delete(m.id * 1000); // Also clean up 24h notification marker
    });
  }, [userId, bets, markets]);

  return {
    permission: notificationPermissionRef.current,
    requestPermission: () => {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then((permission) => {
          notificationPermissionRef.current = permission;
        });
      }
    },
  };
}

