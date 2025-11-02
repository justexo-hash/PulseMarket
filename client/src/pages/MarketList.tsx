import { type Market } from "@shared/schema";
import { MarketCard } from "@/components/MarketCard";

interface MarketListProps {
  markets: Market[];
}

export function MarketList({ markets }: MarketListProps) {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">Active Markets</h1>
        <p className="text-muted-foreground text-lg">
          Explore prediction markets and place your bets on future events
        </p>
      </div>

      {markets.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-2xl text-muted-foreground mb-4">No markets available yet</p>
          <p className="text-muted-foreground">Be the first to create a market!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {markets.map((market) => (
            <MarketCard key={market.id} market={market} />
          ))}
        </div>
      )}
    </div>
  );
}
