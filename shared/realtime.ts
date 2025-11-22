export type RealtimeEvent =
  | { type: "market:created"; data: any }
  | { type: "market:updated"; data: { id: number } }
  | { type: "market:resolved"; data: { id: number } }
  | { type: "bet:placed"; data: { marketId: number } }
  | { type: "balance:updated"; data: { userId: number } };

export type RealtimeChannel =
  | "pulse-global"
  | `user:${number}`;

