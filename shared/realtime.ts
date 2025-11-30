export type RealtimeEvent =
  | { type: "market:created"; data: any }
  | { type: "market:updated"; data: { id: number } }
  | { type: "market:resolved"; data: { id: number } }
  | { type: "bet:placed"; data: { marketId: number } }
  | { type: "balance:updated"; data: { userId: number } }
  | {
      type: "notification:new";
      data: {
        userId: number;
        notification: {
          id: string;
          type: "follower" | "payout" | "refund";
          title: string;
          message: string;
          createdAt: string;
          href?: string;
        };
      };
    };

export type RealtimeChannel =
  | "pulse-global"
  | `user:${number}`;

