import { type Bet } from "@shared/schema";

const BETS_STORAGE_KEY = "pulsemarketbets";

export function getBets(): Bet[] {
  try {
    const stored = localStorage.getItem(BETS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function addBet(bet: Omit<Bet, "id" | "timestamp">): Bet {
  const bets = getBets();
  const newBet: Bet = {
    ...bet,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  };
  bets.push(newBet);
  localStorage.setItem(BETS_STORAGE_KEY, JSON.stringify(bets));
  return newBet;
}

export function getBetsByMarket(marketId: number): Bet[] {
  return getBets().filter(bet => bet.marketId === marketId);
}

export function getTotalBetAmount(): number {
  return getBets().reduce((sum, bet) => sum + bet.amount, 0);
}

export function getPortfolioValue(markets: Array<{ id: number; probability: number }>): number {
  const bets = getBets();
  return bets.reduce((total, bet) => {
    const market = markets.find(m => m.id === bet.marketId);
    if (!market) return total;
    
    const currentProbability = Math.max(0.1, Math.min(99.9, market.probability));
    const betProbability = Math.max(0.1, Math.min(99.9, bet.probability));
    
    // Calculate potential value based on probability change
    // If betting "yes" and probability increased, value goes up
    // If betting "no" and probability decreased, value goes up
    let multiplier = 1;
    if (bet.position === "yes") {
      multiplier = currentProbability / betProbability;
    } else {
      multiplier = (100 - currentProbability) / (100 - betProbability);
    }
    
    // Ensure multiplier stays reasonable (prevent Infinity)
    multiplier = Math.max(0, Math.min(100, multiplier));
    
    return total + (bet.amount * multiplier);
  }, 0);
}
