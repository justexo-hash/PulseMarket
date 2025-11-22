import { type Market } from "@shared/schema";

export function recalculateProbability(market: Market): Market {
  const yesPool = parseFloat(market.yesPool || "0");
  const noPool = parseFloat(market.noPool || "0");
  const totalPool = yesPool + noPool;

  const probability =
    totalPool > 0
      ? Math.max(0, Math.min(100, Math.round((yesPool / totalPool) * 100)))
      : 50;

  return {
    ...market,
    probability,
  };
}

