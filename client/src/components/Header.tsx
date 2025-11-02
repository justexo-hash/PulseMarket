import { Link, useLocation } from "wouter";
import { TrendingUp } from "lucide-react";

export function Header() {
  const [location] = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card shadow-lg">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" data-testid="link-home">
            <div className="flex items-center gap-2 hover-elevate rounded-lg px-3 py-2 transition-all cursor-pointer">
              <TrendingUp className="h-7 w-7 text-primary" />
              <span className="text-2xl font-bold text-foreground">PulseMarket</span>
            </div>
          </Link>

          <nav className="flex items-center gap-2">
            <Link href="/" data-testid="link-markets">
              <div
                className={`px-4 py-2 rounded-lg font-semibold transition-all hover-elevate ${
                  location === "/"
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground"
                }`}
              >
                Markets
              </div>
            </Link>
            <Link href="/create" data-testid="link-create-market">
              <div
                className={`px-4 py-2 rounded-lg font-semibold transition-all hover-elevate ${
                  location === "/create"
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground"
                }`}
              >
                Create Market
              </div>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
