import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css";
import { AppProviders } from "./providers";

export const metadata: Metadata = {
  title: "PulseMarket - Memecoin Prediction Markets",
  description:
    "Building the future of memecoin prediction markets.",
  icons: {
    icon: "/favicon.png",
  },
  openGraph: {
    title: "PulseMarket - Memecoin Prediction Markets",
    description: "Building the future of memecoin prediction markets.",
    url: "https://pulsemarket.fun",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      
      <body className="min-h-screen bg-background text-foreground antialiased">
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

