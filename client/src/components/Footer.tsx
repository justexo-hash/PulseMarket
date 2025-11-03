import { Link } from "wouter";
import { TrendingUp, Twitter } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-card mt-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Left: brand with copyright below */}
          <div className="flex flex-col gap-1">
            <Link href="/">
              <div className="flex items-center gap-2 cursor-pointer w-fit">
                <TrendingUp className="h-5 w-5 text-primary" />
                <span className="text-base font-bold text-foreground">PulseMarket</span>
              </div>
            </Link>
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} PulseMarket
            </p>
          </div>

          {/* Center: quick links */}
          <nav className="flex items-center gap-3 text-sm text-foreground/90">
            <Link href="/about">
              <span className="hover:text-foreground cursor-pointer transition-colors">About Us</span>
            </Link>
            <span className="text-muted-foreground/50">•</span>
            <Link href="/terms">
              <span className="hover:text-foreground cursor-pointer transition-colors">Terms of Service</span>
            </Link>
            <span className="text-muted-foreground/50">•</span>
            <Link href="/privacy">
              <span className="hover:text-foreground cursor-pointer transition-colors">Privacy Policy</span>
            </Link>
          </nav>

          {/* Right: social icon only */}
          <div className="flex items-center">
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              className="hover:text-foreground transition-colors"
              aria-label="X (Twitter)"
            >
              <Twitter className="h-5 w-5 text-foreground/90" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

