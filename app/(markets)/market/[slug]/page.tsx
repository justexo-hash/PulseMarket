import Comments from "app/(markets)/_components/Comments";
import { MarketDetailView } from "../../_components/MarketDetailView";

interface MarketDetailPageProps {
  params: { slug: string };
}

export default function MarketDetailPage({ params }: MarketDetailPageProps) {
  const decodedSlug = decodeURIComponent(params.slug);
  return (
    <div className="container mx-auto px-4 lg:px-0 py-6">
      <div className="w-full flex flex-col lg:flex-row gap-6">
        {/* LEFT: MARKET DETAIL */}
        <div className="flex-1 min-w-0 flex flex-col gap-6">
          <MarketDetailView slug={decodedSlug} />

          <Comments slug={decodedSlug} />
        </div>

      {/* RIGHT: SIDEBAR (Polymarket-style) */}
      <aside className="w-full lg:w-[360px] shrink-0">
        <div className="sticky top-24 rounded-xl p-4">
          <div className="w-full flex flex-col gap-4 rounded-xl p-4 bg-background">

            {/* DATE TITLE */}
            <h3 className="text-base font-semibold">November 30</h3>

            {/* BUY / SELL TABS */}
            <div className="flex items-center gap-4 text-sm">
              <button className="text-secondary-foreground  font-medium">Buy</button>
              <button className="text-muted-foreground">Sell</button>
              <div className="ml-auto flex items-center gap-1 text-sm text-muted-foreground">
                Limit <span>▾</span>
              </div>
            </div>

            <div className="h-px w-full bg-secondary-foreground/20" />

            {/* YES / NO BUTTONS */}
            <div className="grid grid-cols-2 gap-3">
              <button className="rounded-md py-2 bg-green-400/20 text-green-400 font-semibold text-sm">
                Yes 0.8¢
              </button>
              <button className="rounded-md py-2 bg-secondary text-muted-foreground font-semibold text-sm">
                No 99.4¢
              </button>
            </div>

            {/* LIMIT PRICE */}
            <div className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Limit Price</span>
              <div className="flex items-center gap-3">
                <button className="h-9 w-10 bg-secondary rounded-md text-lg">−</button>
                <div className="text-base font-semibold">0.9¢</div>
                <button className="h-9 w-10 bg-secondary rounded-md text-lg">+</button>
              </div>
            </div>

            {/* SHARES */}
            <div className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Shares</span>
              <div className="flex gap-3 items-center">
                <input
                  className="flex-1 h-9 rounded-md bg-secondary px-3"
                  value="0"
                  readOnly
                />
              </div>

              {/* SHARE QUICK BUTTONS */}
              <div className="flex items-center gap-2">
                <button className="px-3 py-1 rounded-md bg-secondary text-sm text-muted-foreground">-100</button>
                <button className="px-3 py-1 rounded-md bg-secondary text-sm text-muted-foreground">-10</button>
                <button className="px-3 py-1 rounded-md bg-secondary text-sm text-muted-foreground">+10</button>
                <button className="px-3 py-1 rounded-md bg-secondary text-sm text-muted-foreground">+100</button>
              </div>
            </div>

            {/* EXPIRATION */}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Set Expiration</span>
              <div className="h-5 w-10 bg-secondary rounded-full" />
            </div>

            {/* TOTAL */}
            <div className="flex justify-between text-sm">
              <span>Total</span>
              <span className="text-blue-400">$0</span>
            </div>

            {/* TO WIN */}
            <div className="flex justify-between text-sm">
              <span>To Win</span>
              <span className="text-green-400">$0</span>
            </div>

            {/* TRADE BUTTON */}
            <button className="w-full py-3 rounded-md bg-blue-500 text-white font-semibold text-sm">
              Trade
            </button>

            <p className="text-xs text-muted-foreground text-center">
              By trading, you agree to the Terms of Use.
            </p>
          </div>
        </div>
      </aside>
      </div>
    </div>
  );
}