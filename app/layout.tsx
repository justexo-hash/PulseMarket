import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css";
import { AppProviders } from "./providers";

export const metadata: Metadata = {
  title: "PulseMarket | World largest memecoin prediction markets",
  description:
    "Building the future of memecoin prediction markets.",
  icons: {
    icon: "/favicon.png",
  },
  openGraph: {
    title: "PulseMarket | World largest memecoin prediction markets",
    description: "Building the future of memecoin prediction markets.",
    url: "https://pulsemarket.fun",
  },
  twitter: {
    card: "summary_large_image",
    title: "PulseMarket | World largest memecoin prediction markets",
    description: "Predict memecoin markets, track sentiment and trade probabilities instantly.",
    creator: "@pulsemkt",
    images: ["/og-image.png"],
  },
  keywords: [
    "memecoin",
    "prediction market",
    "crypto predictions",
    "solana",
    "yes/no markets",
    "crypto betting",
    "pulsemarket",
    "web3 trading",
    "onchain markets",
  ],
  authors: [
    { name: "PulseMarket Team", url: "https://pulsemarket.fun" }
  ],
  category: "finance",
  applicationName: "PulseMarket",
  generator: "Next.js",
  referrer: "origin-when-cross-origin",
  metadataBase: new URL("https://pulsemarket.fun"),
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-secondary-foreground  antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AppProviders>{children}</AppProviders>
        </ThemeProvider>
      </body>
    </html>
  );
}
