"use client";

import Link from "next/link";
import Image from "next/image";
import { Twitter, TrendingUp } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useQuery } from "@tanstack/react-query";

interface PriceData {
  price: number;
  change24h: number;
}

export function Footer() {
  const wallet = useWallet();

  const { data: solPrice } = useQuery<PriceData>({
    queryKey: ["crypto-price-sol-footer"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/coinmarketcap/quotes?symbol=SOL");
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error ||
              `Failed to fetch SOL price: ${response.statusText}`
          );
        }
        const json = await response.json();
        const coinData = json.data?.SOL;
        const quote = coinData?.quote?.USD;
        if (!quote) {
          throw new Error("No USD quote found for SOL");
        }
        return {
          price: quote.price || 0,
          change24h: quote.percent_change_24h || 0,
        };
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
          throw new Error(
            errorData.error ||
              `Failed to fetch ETH price: ${response.statusText}`
          );
        }
        const json = await response.json();
        const coinData = json.data?.ETH;
        const quote = coinData?.quote?.USD;
        if (!quote) {
          throw new Error("No USD quote found for ETH");
        }
        return {
          price: quote.price || 0,
          change24h: quote.percent_change_24h || 0,
        };
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
          throw new Error(
            errorData.error ||
              `Failed to fetch BTC price: ${response.statusText}`
          );
        }
        const json = await response.json();
        const coinData = json.data?.BTC;
        const quote = coinData?.quote?.USD;
        if (!quote) {
          throw new Error("No USD quote found for BTC");
        }
        return {
          price: quote.price || 0,
          change24h: quote.percent_change_24h || 0,
        };
      } catch (error) {
        console.error("Error fetching BTC price:", error);
        return { price: 67890.12, change24h: 2.45 };
      }
    },
    refetchInterval: 30000,
  });

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <TrendingUp className="h-5 w-5 text-secondary-foreground" />
              <span className="text-lg font-bold text-secondary-foreground ">
                PulseMarket
              </span>
            </Link>
            <span className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} PulseMarket
            </span>
          </div>

          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Link
              href="/about"
              className="hover:text-secondary-foreground  transition-colors"
            >
              About Us
            </Link>
            <span className="text-muted-foreground/50">•</span>
            <Link
              href="/terms"
              className="hover:text-secondary-foreground  transition-colors"
            >
              Terms of Service
            </Link>
            <span className="text-muted-foreground/50">•</span>
            <Link
              href="/privacy"
              className="hover:text-secondary-foreground  transition-colors"
            >
              Privacy Policy
            </Link>
          </div>

          <div className="flex items-center gap-4 min-w-0">
            {wallet.connected && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-2 py-1 bg-secondary/50 rounded-lg">
                  <Image
                    src="/solana.webp"
                    alt="SOL"
                    width={16}
                    height={16}
                    className="rounded-full object-cover"
                  />
                  <span className="text-xs font-medium text-secondary-foreground  whitespace-nowrap">
                    $
                    {solPrice?.price
                      ? solPrice.price.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })
                      : "---"}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 px-2 py-1 bg-secondary/50 rounded-lg">
                  <Image
                    src="/eth-logo.webp"
                    alt="ETH"
                    width={16}
                    height={16}
                    className="rounded-full object-cover"
                  />
                  <span className="text-xs font-medium text-secondary-foreground  whitespace-nowrap">
                    $
                    {ethPrice?.price
                      ? ethPrice.price.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })
                      : "---"}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 px-2 py-1 bg-secondary/50 rounded-lg">
                  <Image
                    src="/btc-logo.webp"
                    alt="BTC"
                    width={16}
                    height={16}
                    className="rounded-full object-cover"
                  />
                  <span className="text-xs font-medium text-secondary-foreground  whitespace-nowrap">
                    $
                    {btcPrice?.price
                      ? btcPrice.price.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })
                      : "---"}
                  </span>
                </div>

                <div className="flex items-center gap-2 px-2 py-1 bg-chart-2/20 rounded-lg border border-green-500/30">
                  <div className="w-2 h-2 bg-chart-2 rounded-full animate-pulse" />
                  <span className="text-xs font-medium text-chart-2">
                    Connected
                  </span>
                </div>
              </div>
            )}

            <a
              href="https://twitter.com/PulseMarket"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-secondary/50 transition-colors"
              aria-label="X (Twitter)"
            >
              <Twitter className="h-5 w-5 text-secondary-foreground " />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

