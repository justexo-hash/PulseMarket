import { Suspense } from "react";
import { MarketListView, MarketsSkeleton } from "./_components/MarketList";

export default function MarketsPage() {
  return (
    <Suspense fallback={<MarketsSkeleton />}>
      <MarketListView />
    </Suspense>
  );
}

