import { useEffect, useRef, useCallback } from 'react';
import { queryClient } from './queryClient';

type RealtimeEvent = 
  | { type: 'market:created'; data: any }
  | { type: 'market:updated'; data: { id: number } }
  | { type: 'market:resolved'; data: { id: number } }
  | { type: 'bet:placed'; data: { marketId: number } }
  | { type: 'balance:updated'; data: { userId: number } }
  | { type: 'connected'; message: string };

export function useRealtime(userId?: number | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const isConnectingRef = useRef(false);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000; // 3 seconds

  const connect = useCallback((currentUserId?: number | null) => {
    // Don't create a new connection if one already exists and is connecting/open
    if (wsRef.current && (wsRef.current.readyState === WebSocket.CONNECTING || wsRef.current.readyState === WebSocket.OPEN)) {
      console.log('[Realtime] Connection already exists, skipping');
      return;
    }

    // Prevent multiple simultaneous connection attempts
    if (isConnectingRef.current) {
      console.log('[Realtime] Connection attempt already in progress, skipping');
      return;
    }

    // Determine WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    try {
      isConnectingRef.current = true;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[Realtime] Connected to WebSocket');
        reconnectAttempts.current = 0; // Reset on successful connection
        isConnectingRef.current = false;
        
        // Authenticate with user ID if available
        // This allows the server to send targeted updates
        if (currentUserId) {
          ws.send(JSON.stringify({ type: 'auth', userId: currentUserId }));
          console.log(`[Realtime] Authenticated WebSocket as user ${currentUserId}`);
        }
      };

      ws.onmessage = (event) => {
        try {
          const message: RealtimeEvent = JSON.parse(event.data);
          
          // Handle different event types
          switch (message.type) {
            case 'connected':
              console.log('[Realtime]', message.message);
              break;
              
              
            case 'market:updated':
              // Invalidate specific market and markets list
              queryClient.invalidateQueries({ queryKey: ['/api/markets'] });
              queryClient.invalidateQueries({ queryKey: ['/api/markets', message.data.id.toString()] });
              break;
              
            case 'market:resolved':
              // Invalidate markets and specific market
              queryClient.invalidateQueries({ queryKey: ['/api/markets'] });
              queryClient.invalidateQueries({ queryKey: ['/api/markets', message.data.id.toString()] });
              queryClient.invalidateQueries({ queryKey: ['/api/bets'] });
              queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
              queryClient.invalidateQueries({ queryKey: ['/api/activity'] }); // Update activity feed
              break;
              
            case 'bet:placed':
              // Invalidate market data (pools/probabilities updated)
              queryClient.invalidateQueries({ queryKey: ['/api/markets'] });
              queryClient.invalidateQueries({ queryKey: ['/api/markets', message.data.marketId.toString()] });
              queryClient.invalidateQueries({ queryKey: ['/api/bets'] });
              queryClient.invalidateQueries({ queryKey: ['/api/activity'] }); // Update activity feed
              break;
              
            case 'market:created':
              // Invalidate markets list to show new market
              queryClient.invalidateQueries({ queryKey: ['/api/markets'] });
              queryClient.invalidateQueries({ queryKey: ['/api/activity'] }); // Update activity feed
              break;
              
            case 'balance:updated':
              // Invalidate balance and transactions for the user
              queryClient.invalidateQueries({ queryKey: ['/api/wallet/balance'] });
              queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
              break;
          }
        } catch (error) {
          console.error('[Realtime] Error parsing message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[Realtime] WebSocket error:', error);
        isConnectingRef.current = false;
        // Don't throw - just log the error
      };

      ws.onclose = (event) => {
        console.log('[Realtime] WebSocket disconnected', event.code, event.reason);
        wsRef.current = null;
        isConnectingRef.current = false;
        
        // Don't reconnect if it was a normal closure (code 1000) or if we're cleaning up
        if (event.code === 1000) {
          console.log('[Realtime] Normal closure, not reconnecting');
          return;
        }
        
        // Only attempt to reconnect if we haven't exceeded max attempts
        if (reconnectAttempts.current < maxReconnectAttempts && !reconnectTimeoutRef.current) {
          reconnectAttempts.current++;
          console.log(`[Realtime] Will reconnect in ${reconnectDelay}ms (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null;
            connect(userId);
          }, reconnectDelay);
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          console.warn('[Realtime] Max reconnect attempts reached. Stopping reconnection.');
        }
      };
    } catch (error) {
      console.error('[Realtime] Failed to create WebSocket:', error);
      isConnectingRef.current = false;
      // Don't throw - gracefully handle the error
    }
  }, [userId]);

  useEffect(() => {
    connect(userId);

    return () => {
      // Cleanup on unmount
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        // Close with normal closure code to prevent reconnection attempts
        if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
          wsRef.current.close(1000, 'Component unmounting');
        }
        wsRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only connect once on mount

  // Re-authenticate when userId changes (e.g., user logs in after connection established)
  useEffect(() => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN && userId) {
      ws.send(JSON.stringify({ type: 'auth', userId }));
      console.log(`[Realtime] Re-authenticated WebSocket as user ${userId}`);
    }
  }, [userId]);

  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
  };
}

