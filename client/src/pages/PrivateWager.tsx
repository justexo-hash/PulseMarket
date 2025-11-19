import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { type Market } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { MarketDetail } from "./MarketDetail";
import { useEffect } from "react";

export function PrivateWager() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  
  const { data: market, isLoading, error } = useQuery<Market>({
    queryKey: ["/api/wager", inviteCode],
    enabled: !!inviteCode && /^[A-Z0-9]{8}$/.test(inviteCode || ""),
    retry: false,
  });

  // Remove any stray "0" text nodes that might be rendered
  useEffect(() => {
    const removeZeroTextNodes = () => {
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null
      );
      const textNodes: Text[] = [];
      let node;
      while (node = walker.nextNode()) {
        if (node.textContent?.trim() === "0") {
          textNodes.push(node as Text);
        }
      }
      textNodes.forEach(textNode => {
        // Only remove if it's near Private Wager text
        const parent = textNode.parentElement;
        if (parent) {
          const text = parent.textContent || "";
          if (text.includes("Private Wager")) {
            textNode.remove();
          }
        }
      });
    };
    
    // Run immediately and after a short delay
    removeZeroTextNodes();
    const timeout = setTimeout(removeZeroTextNodes, 100);
    return () => clearTimeout(timeout);
  }, []);

  if (!inviteCode || !/^[A-Z0-9]{8}$/.test(inviteCode)) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center py-20">
          <h2 className="text-3xl font-bold text-foreground mb-4">Invalid Invite Code</h2>
          <p className="text-muted-foreground mb-8">
            The invite code format is invalid. Invite codes are 8 characters (uppercase letters and numbers).
          </p>
          <Link href="/">
            <Button variant="default">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Markets
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="bg-card border border-card-border rounded-lg p-8 shadow-xl animate-pulse">
            <div className="h-8 w-32 bg-muted rounded mb-4" />
            <div className="h-12 bg-muted rounded mb-8" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !market) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center py-20">
          <h2 className="text-3xl font-bold text-foreground mb-4">Private Wager Not Found</h2>
          <p className="text-muted-foreground mb-8">
            The private wager with this invite code doesn't exist or may have been deleted.
          </p>
          <Link href="/">
            <Button variant="default">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Markets
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Render MarketDetail directly with market data, keeping invite code in URL
  return <MarketDetail marketOverride={market} />;
}

