import { Link, useLocation } from "wouter";
import { TrendingUp, Wallet, LogOut, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

export function Header() {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const handleLogout = () => {
    logout();
    toast({
      title: "Logged Out",
      description: "You have been logged out successfully.",
    });
    setLocation("/login");
  };

  const truncateAddress = (address?: string) => {
    if (!address) return '';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

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
            <Link href="/portfolio" data-testid="link-portfolio">
              <div
                className={`px-4 py-2 rounded-lg font-semibold transition-all hover-elevate flex items-center gap-2 ${
                  location === "/portfolio"
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground"
                }`}
              >
                <Wallet className="h-4 w-4" />
                Portfolio
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

            {user ? (
              <div className="flex items-center gap-2 ml-4 border-l border-border pl-4">
                <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
                  <Wallet className="h-4 w-4 text-primary" />
                  <span className="font-mono text-sm" data-testid="text-wallet-address">
                    {truncateAddress(user.walletAddress)}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  data-testid="button-logout"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            ) : (
              <div className="ml-4 border-l border-border pl-4">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setLocation("/login")}
                  data-testid="button-login"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Login
                </Button>
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
