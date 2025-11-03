import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';

export type RealtimeEvent = 
  | { type: 'market:created'; data: any }
  | { type: 'market:updated'; data: { id: number } }
  | { type: 'market:resolved'; data: { id: number } }
  | { type: 'bet:placed'; data: { marketId: number } }
  | { type: 'balance:updated'; data: { userId: number } };

class RealtimeService {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();
  // Map userId to their WebSocket connections (users can have multiple tabs)
  private userConnections: Map<number, Set<WebSocket>> = new Map();
  // Map WebSocket to userId for quick lookup
  private wsToUser: Map<WebSocket, number> = new Map();
  private maxConnections = 5000; // Limit to prevent server overload

  initialize(server: Server) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws',
    });

    this.wss.on('connection', (ws: WebSocket, req) => {
      // Check connection limit
      if (this.clients.size >= this.maxConnections) {
        console.warn(`[WebSocket] Max connections (${this.maxConnections}) reached, rejecting new connection`);
        ws.close(1008, 'Server at capacity');
        return;
      }

      console.log(`[WebSocket] New client connected (${this.clients.size + 1}/${this.maxConnections})`);
      this.clients.add(ws);

      // Send ping every 30 seconds to keep connection alive
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
        }
      }, 30000);

      ws.on('close', () => {
        console.log(`[WebSocket] Client disconnected (${this.clients.size - 1}/${this.maxConnections})`);
        this.clients.delete(ws);
        
        // Clean up user mapping
        const userId = this.wsToUser.get(ws);
        if (userId) {
          const userWs = this.userConnections.get(userId);
          if (userWs) {
            userWs.delete(ws);
            if (userWs.size === 0) {
              this.userConnections.delete(userId);
            }
          }
          this.wsToUser.delete(ws);
        }
        
        clearInterval(pingInterval);
      });

      ws.on('error', (error) => {
        console.error('[WebSocket] Error:', error);
        this.clients.delete(ws);
        
        // Clean up user mapping on error
        const userId = this.wsToUser.get(ws);
        if (userId) {
          const userWs = this.userConnections.get(userId);
          if (userWs) {
            userWs.delete(ws);
            if (userWs.size === 0) {
              this.userConnections.delete(userId);
            }
          }
          this.wsToUser.delete(ws);
        }
        
        clearInterval(pingInterval);
      });

      // Listen for user authentication messages
      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          if (message.type === 'auth' && message.userId) {
            const userId = message.userId;
            this.wsToUser.set(ws, userId);
            
            if (!this.userConnections.has(userId)) {
              this.userConnections.set(userId, new Set());
            }
            this.userConnections.get(userId)!.add(ws);
            
            console.log(`[WebSocket] Client authenticated as user ${userId}`);
          }
        } catch (error) {
          // Ignore non-JSON messages or invalid auth attempts
        }
      });

      // Send initial connection confirmation
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'connected', message: 'Connected to PulseMarket real-time updates' }));
      }
    });

    console.log('[WebSocket] Server initialized on /ws');
  }

  /**
   * Broadcast an event to all connected clients
   * Optimized for parallel sending (faster for many clients)
   */
  broadcast(event: RealtimeEvent) {
    if (!this.wss) {
      console.warn('[WebSocket] Cannot broadcast: server not initialized');
      return;
    }

    const message = JSON.stringify(event);
    const clientsToNotify = Array.from(this.clients).filter(
      (client) => client.readyState === WebSocket.OPEN
    );

    // Send to all clients in parallel for better performance
    const sendPromises = clientsToNotify.map((client) => {
      try {
        client.send(message);
        return true;
      } catch (error) {
        console.error('[WebSocket] Error sending message:', error);
        return false;
      }
    });

    // Wait for all sends to complete (in case we need to track failures)
    Promise.all(sendPromises).then((results) => {
      const sentCount = results.filter(Boolean).length;
      console.log(`[WebSocket] Broadcasted ${event.type} to ${sentCount}/${clientsToNotify.length} client(s)`);
    });
  }

  /**
   * Broadcast to specific user (for user-specific updates like balance)
   * Now efficiently targets only that user's connections
   */
  broadcastToUser(userId: number, event: RealtimeEvent) {
    if (!this.wss) {
      console.warn('[WebSocket] Cannot broadcast: server not initialized');
      return;
    }

    const userWs = this.userConnections.get(userId);
    if (!userWs || userWs.size === 0) {
      // User not connected, skip broadcast
      return;
    }

    const message = JSON.stringify(event);
    let sentCount = 0;

    // Send to all of this user's connections (they might have multiple tabs)
    userWs.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
          sentCount++;
        } catch (error) {
          console.error('[WebSocket] Error sending message to user:', error);
        }
      }
    });

    if (sentCount > 0) {
      console.log(`[WebSocket] Broadcasted ${event.type} to user ${userId} (${sentCount} connection(s))`);
    }
  }

  /**
   * Get number of connected clients
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Get number of unique users connected
   */
  getUserCount(): number {
    return this.userConnections.size;
  }

  /**
   * Get connection statistics
   */
  getStats() {
    return {
      totalConnections: this.clients.size,
      uniqueUsers: this.userConnections.size,
      maxConnections: this.maxConnections,
    };
  }

  close() {
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.close();
      }
    });
    this.clients.clear();
    
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
  }
}

// Singleton instance
export const realtimeService = new RealtimeService();

