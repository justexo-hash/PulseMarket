import { Link } from "wouter";
import { TrendingUp, Twitter } from "lucide-react";

export function Footer() {
  return (
    // Minimal bar that sits at the bottom of the document (not sticky)
    <footer className="border-t border-border bg-card mt-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Left: brand */}
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer w-fit">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">PulseMarket</span>
            </div>
          </Link>

          {/* Center: quick links */}
          <nav className="flex items-center gap-4 text-xs text-foreground/80">
            <Link href="/about"><span className="hover:text-foreground cursor-pointer">About Us</span></Link>
            <span className="opacity-40">•</span>
            <Link href="/terms"><span className="hover:text-foreground cursor-pointer">Terms of Service</span></Link>
            <span className="opacity-40">•</span>
            <Link href="/privacy"><span className="hover:text-foreground cursor-pointer">Privacy Policy</span></Link>
          </nav>

          {/* Right: socials */}
          <div className="flex items-center gap-2 text-xs text-foreground/80">
            <a href="#" onClick={(e)=>e.preventDefault()} className="flex items-center gap-1 hover:text-foreground">
              <Twitter className="h-3 w-3" />
              X
            </a>
          </div>
        </div>

        {/* tiny bottom line */}
        <div className="mt-3 text-[10px] leading-none text-muted-foreground/70">
          © {new Date().getFullYear()} PulseMarket
        </div>
      </div>
    </footer>
  );
}

