import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { type Market } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ThumbsUp, ThumbsDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function MarketDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  
  const { data: market, isLoading, error } = useQuery<Market>({
    queryKey: ["/api/markets", id],
    enabled: !!id,
  });

  const handleBet = (type: "yes" | "no") => {
    toast({
      title: `${type === "yes" ? "Yes" : "No"} Bet Placed!`,
      description: "Your mock trade has been placed successfully.",
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="bg-card border border-card-border rounded-lg p-8 shadow-xl animate-pulse">
            <div className="h-8 w-32 bg-muted rounded mb-4" />
            <div className="h-12 bg-muted rounded mb-8" />
            <div className="grid md:grid-cols-2 gap-8">
              <div className="h-48 bg-muted rounded" />
              <div className="h-48 bg-muted rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !market) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center py-20">
          <h2 className="text-3xl font-bold text-foreground mb-4">Market Not Found</h2>
          <p className="text-muted-foreground mb-8">
            The market you're looking for doesn't exist.
          </p>
          <Link href="/">
            <Button variant="default" data-testid="button-back-home">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Markets
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const noProbability = 100 - market.probability;

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link href="/" data-testid="button-back">
        <Button variant="ghost" className="mb-6 hover-elevate">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Markets
        </Button>
      </Link>

      <div className="max-w-4xl mx-auto">
        <div className="bg-card border border-card-border rounded-lg p-8 shadow-xl">
          <div className="mb-6">
            <Badge
              variant="secondary"
              className="bg-primary/20 text-primary border-primary/30 uppercase text-xs font-semibold tracking-wide mb-4"
              data-testid="badge-category"
            >
              {market.category}
            </Badge>
            <h1 className="text-4xl font-bold text-foreground mb-4" data-testid="text-question">
              {market.question}
            </h1>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div className="bg-muted/50 rounded-lg p-6 border border-border">
              <div className="text-center">
                <p className="text-sm text-muted-foreground uppercase tracking-wide font-medium mb-2">
                  Yes Probability
                </p>
                <p className="text-6xl font-bold text-primary mb-4" data-testid="text-yes-probability">
                  {market.probability}%
                </p>
                <div className="w-full h-3 bg-background rounded-full overflow-hidden mb-4">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${market.probability}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-6 border border-border">
              <div className="text-center">
                <p className="text-sm text-muted-foreground uppercase tracking-wide font-medium mb-2">
                  No Probability
                </p>
                <p className="text-6xl font-bold text-destructive mb-4" data-testid="text-no-probability">
                  {noProbability}%
                </p>
                <div className="w-full h-3 bg-background rounded-full overflow-hidden mb-4">
                  <div
                    className="h-full bg-destructive rounded-full transition-all"
                    style={{ width: `${noProbability}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-8">
            <h2 className="text-2xl font-bold text-foreground mb-6">Place Your Bet</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Button
                size="lg"
                variant="default"
                className="h-auto py-6 text-lg font-semibold"
                onClick={() => handleBet("yes")}
                data-testid="button-bet-yes"
              >
                <ThumbsUp className="mr-2 h-5 w-5" />
                Bet Yes
              </Button>
              <Button
                size="lg"
                variant="destructive"
                className="h-auto py-6 text-lg font-semibold"
                onClick={() => handleBet("no")}
                data-testid="button-bet-no"
              >
                <ThumbsDown className="mr-2 h-5 w-5" />
                Bet No
              </Button>
            </div>
            <p className="text-sm text-muted-foreground text-center mt-4">
              This is a simulated trading interface. No real bets are placed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
