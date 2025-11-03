import { Link } from "wouter";
import { TrendingUp, Twitter } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-card mt-auto">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand Section */}
          <div className="flex flex-col gap-4">
            <Link href="/">
              <div className="flex items-center gap-2 hover-elevate rounded-lg px-3 py-2 transition-all cursor-pointer w-fit">
                <TrendingUp className="h-6 w-6 text-primary" />
                <span className="text-xl font-bold text-foreground">PulseMarket</span>
              </div>
            </Link>
            <p className="text-sm text-muted-foreground">
              Decentralized prediction markets on Solana. Bet on future events with transparency and provably fair outcomes.
            </p>
          </div>

          {/* Quick Links Section */}
          <div className="flex flex-col gap-4">
            <h3 className="font-semibold text-foreground">Quick Links</h3>
            <div className="flex flex-col gap-2">
              <Link href="/about">
                <div className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer w-fit">
                  About Us
                </div>
              </Link>
              <Link href="/terms">
                <div className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer w-fit">
                  Terms of Service
                </div>
              </Link>
              <Link href="/privacy">
                <div className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer w-fit">
                  Privacy Policy
                </div>
              </Link>
            </div>
          </div>

          {/* Social Section */}
          <div className="flex flex-col gap-4">
            <h3 className="font-semibold text-foreground">Connect</h3>
            <div className="flex items-center gap-2">
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                onClick={(e) => {
                  e.preventDefault();
                  // Placeholder - will add Twitter link later
                }}
              >
                <Twitter className="h-4 w-4" />
                <span>X (Twitter)</span>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-6 border-t border-border">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground text-center sm:text-left">
              © {new Date().getFullYear()} PulseMarket. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground text-center sm:text-right">
              Built on Solana
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

