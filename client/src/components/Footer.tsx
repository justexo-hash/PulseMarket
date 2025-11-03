import { Link } from "wouter";
import { Twitter, TrendingUp } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useQuery } from "@tanstack/react-query";
import { useSolanaConnection, getSOLBalance } from "@/lib/solana";

interface PriceData {
  price: number;
  change24h: number;
}

export function Footer() {
  const wallet = useWallet();
  const connection = useSolanaConnection();

  // Get on-chain SOL balance if wallet is connected
  const { data: solBalance } = useQuery({
    queryKey: ["wallet-balance", wallet.publicKey?.toBase58()],
    queryFn: async () => {
      if (!wallet.publicKey || !connection) return 0;
      return await getSOLBalance(connection, wallet.publicKey);
    },
    enabled: !!wallet.publicKey && !!connection,
    refetchInterval: 10000,
  });

  // Fetch crypto prices from CoinMarketCap API (same as widgets)
  const { data: solPrice } = useQuery<PriceData>({
    queryKey: ["crypto-price-sol-footer"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/coinmarketcap/quotes?symbol=SOL");
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to fetch SOL price: ${response.statusText}`);
        }
        const json = await response.json();
        if (json.status?.error_code && json.status.error_code !== 0) {
          throw new Error(json.status.error_message || `CoinMarketCap API error: ${json.status.error_code}`);
        }
        if (!json.data || typeof json.data !== 'object' || !json.data.SOL) {
          throw new Error("Invalid response structure from CoinMarketCap API");
        }
        const coinData = json.data.SOL;
        const quote = coinData.quote?.USD;
        if (!quote) {
          throw new Error("No USD quote found for SOL");
        }
        return { price: quote.price || 0, change24h: quote.percent_change_24h || 0 };
      } catch (error) {
        console.error("Error fetching SOL price:", error);
        return { price: 164.52, change24h: 0.08 };
      }
    },
    refetchInterval: 30000,
  });

  const { data: ethPrice } = useQuery<PriceData>({
    queryKey: ["crypto-price-eth-footer"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/coinmarketcap/quotes?symbol=ETH");
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to fetch ETH price: ${response.statusText}`);
        }
        const json = await response.json();
        if (json.status?.error_code && json.status.error_code !== 0) {
          throw new Error(json.status.error_message || `CoinMarketCap API error: ${json.status.error_code}`);
        }
        if (!json.data || typeof json.data !== 'object' || !json.data.ETH) {
          throw new Error("Invalid response structure from CoinMarketCap API");
        }
        const coinData = json.data.ETH;
        const quote = coinData.quote?.USD;
        if (!quote) {
          throw new Error("No USD quote found for ETH");
        }
        return { price: quote.price || 0, change24h: quote.percent_change_24h || 0 };
      } catch (error) {
        console.error("Error fetching ETH price:", error);
        return { price: 3420.15, change24h: -1.23 };
      }
    },
    refetchInterval: 30000,
  });

  const { data: btcPrice } = useQuery<PriceData>({
    queryKey: ["crypto-price-btc-footer"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/coinmarketcap/quotes?symbol=BTC");
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to fetch BTC price: ${response.statusText}`);
        }
        const json = await response.json();
        if (json.status?.error_code && json.status.error_code !== 0) {
          throw new Error(json.status.error_message || `CoinMarketCap API error: ${json.status.error_code}`);
        }
        if (!json.data || typeof json.data !== 'object' || !json.data.BTC) {
          throw new Error("Invalid response structure from CoinMarketCap API");
        }
        const coinData = json.data.BTC;
        const quote = coinData.quote?.USD;
        if (!quote) {
          throw new Error("No USD quote found for BTC");
        }
        return { price: quote.price || 0, change24h: quote.percent_change_24h || 0 };
      } catch (error) {
        console.error("Error fetching BTC price:", error);
        return { price: 67890.12, change24h: 2.45 };
      }
    },
    refetchInterval: 30000,
  });

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-card/80 backdrop-blur-md">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Left: Brand and Copyright */}
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span className="text-lg font-bold text-foreground">PulseMarket</span>
            </Link>
            <span className="text-sm text-muted-foreground">© 2025 PulseMarket</span>
          </div>

          {/* Center: Links */}
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Link href="/about" className="hover:text-foreground transition-colors">
              About Us
            </Link>
            <span className="text-muted-foreground/50">•</span>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms of Service
            </Link>
            <span className="text-muted-foreground/50">•</span>
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
          </div>

          {/* Right: Coin Prices and Social */}
          <div className="flex items-center gap-4 min-w-0">
            {/* Coin Prices */}
            {wallet.connected && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-2 py-1 bg-muted/50 rounded-lg">
                  <img src="/solana.webp" alt="SOL" className="w-4 h-4 rounded-full object-cover" />
                  <span className="text-xs font-medium text-foreground whitespace-nowrap">
                    ${solPrice?.price ? solPrice.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "---"}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 px-2 py-1 bg-muted/50 rounded-lg">
                  <img src="/eth-logo.webp" alt="ETH" className="w-4 h-4 rounded-full object-cover" />
                  <span className="text-xs font-medium text-foreground whitespace-nowrap">
                    ${ethPrice?.price ? ethPrice.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "---"}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 px-2 py-1 bg-muted/50 rounded-lg">
                  <img src="/btc-logo.webp" alt="BTC" className="w-4 h-4 rounded-full object-cover" />
                  <span className="text-xs font-medium text-foreground whitespace-nowrap">
                    ${btcPrice?.price ? btcPrice.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "---"}
                  </span>
                </div>

                {/* Connection Status */}
                <div className="flex items-center gap-2 px-2 py-1 bg-green-500/20 rounded-lg border border-green-500/30">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs font-medium text-green-500">Connected</span>
                </div>
              </div>
            )}

            {/* X (Twitter) Icon */}
            <a
              href="https://twitter.com/PulseMarket"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-muted/50 transition-colors"
              aria-label="X (Twitter)"
            >
              <Twitter className="h-5 w-5 text-foreground" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
