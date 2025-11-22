import { Suspense } from "react";
import { MarketListView } from "./_components/MarketList";

export default function MarketsPage() {
  return (
    <Suspense>
      <MarketListView />
    </Suspense>
  );
}

