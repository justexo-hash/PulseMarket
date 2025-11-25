import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css";
import { AppProviders } from "./providers";
import localFont from "next/font/local";

const openSauce = localFont({
  src: [
    {
      path: "../public/fonts/OpenSauceOne-Regular.woff",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/OpenSauceOne-Medium.woff",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/OpenSauceOne-SemiBold.woff",
      weight: "600",
      style: "normal",
    },
    {
      path: "../public/fonts/OpenSauceOne-Bold.woff",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-open-sauce",
  display: "swap",
});

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
    <html lang="en"  className={openSauce.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-openSauce text-secondary-foreground  antialiased">
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
