"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { type Market } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { ProbabilityGauge } from "./ProbabilityGauge";

interface MarketCardProps {
  market: Market;
}

function CountdownTimer({ expiresAt }: { expiresAt: Date | string | null }) {
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  useEffect(() => {
    if (!expiresAt) {
      setTimeRemaining("");
      return;
    }

    const updateTimer = () => {
      const now = new Date().getTime();
      const expiration = new Date(expiresAt).getTime();
      const diff = expiration - now;

      if (diff <= 0) {
        setTimeRemaining("Expired");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m`);
      } else if (minutes > 0) {
        setTimeRemaining(`${minutes}m ${seconds}s`);
      } else {
        setTimeRemaining(`${seconds}s`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  if (!expiresAt || !timeRemaining) return null;

  const isExpired = timeRemaining === "Expired";
  const isUrgent =
    !isExpired &&
    new Date(expiresAt).getTime() - Date.now() < 60 * 60 * 1000;

  return (
    <Badge
      variant="outline"
      className={
        isExpired
          ? "text-xs flex items-center gap-1 bg-muted text-muted-foreground border-muted"
          : isUrgent
          ? "text-xs flex items-center gap-1 bg-destructive text-destructive-foreground"
          : "text-xs flex items-center gap-1 bg-primary text-primary-foreground"
      }
    >
      <Clock className="h-3 w-3" />
      {timeRemaining}
    </Badge>
  );
}

export function MarketCard({ market }: MarketCardProps) {
  const isResolved = market.status === "resolved";
  const resolvedOutcome = market.resolvedOutcome;
  const volume =
    parseFloat(market.yesPool || "0") + parseFloat(market.noPool || "0");

  const yesPool = parseFloat(market.yesPool || "0");
  const noPool = parseFloat(market.noPool || "0");
  const totalPool = yesPool + noPool;
  const calculatedProbability =
    totalPool > 0
      ? Math.max(0, Math.min(100, Math.round((yesPool / totalPool) * 100)))
      : 50;

  const displayProbability = isResolved
    ? market.probability
    : calculatedProbability;

  const marketPath =
    market.isPrivate === 1 && market.inviteCode
      ? `/wager/${market.inviteCode}`
      : `/markets/${market.slug || market.id}`;

  // Extract token names for battle markets
  let token1Name: string | null = null;
  let token2Name: string | null = null;

  if (market.tokenAddress2) {
    const match = market.question.match(/:\s*([^?]+?)\s+or\s+([^?]+?)\s*\?/i);
    if (match && match[1] && match[2]) {
      token1Name = match[1].trim();
      token2Name = match[2].trim();
    }
  } else if (market.tokenAddress) {
    const match = market.question.match(/Will\s+([^']+)'s/i);
    if (match) {
      token1Name = match[1].trim();
    }
  }

  const truncateText = (text: string | null, maxLength: number = 12): string => {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + "...";
  };

  return (
    <Link
      href={marketPath}
      data-testid={`card-market-${market.id}`}
      className="group block h-full"
    >
      <Card className="h-full flex flex-col p-4">
        <CardContent className="p-0 flex-1">
          {/* Header: Image + Question + Gauge */}
          <div className="flex gap-3 mb-4">
            {/* Market Image */}
            <div className="shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={market.image || "/placeholder.png"}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = "/placeholder.png";
                }}
              />
            </div>

            {/* Question */}
            <div className="flex-1 min-w-0">
              <h2
                className="text-sm font-semibold text-foreground line-clamp-2 leading-snug"
                data-testid={`text-question-${market.id}`}
              >
                {market.question}
              </h2>
            </div>

            {/* Probability Gauge */}
            <div className="shrink-0">
              <ProbabilityGauge
                value={displayProbability}
                resolved={isResolved}
                outcome={resolvedOutcome as "yes" | "no"}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="success"
              className="flex-1"
              title={market.tokenAddress2 ? (token1Name || "Token 1") : "Yes"}
            >
              <span className="truncate block">
                {market.tokenAddress2
                  ? truncateText(token1Name || "Token 1")
                  : "Yes"}
              </span>
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              title={market.tokenAddress2 ? (token2Name || "Token 2") : "No"}
            >
              <span className="truncate block">
                {market.tokenAddress2
                  ? truncateText(token2Name || "Token 2")
                  : "No"}
              </span>
            </Button>
          </div>
        </CardContent>

        {/* Footer: Volume & Status */}
        <CardFooter className="p-0 pt-4 mt-auto border-t border-border justify-between text-xs text-muted-foreground">
          <span className="font-medium">{volume.toFixed(2)} SOL</span>
          <div className="flex items-center gap-2">
            {!isResolved && market.expiresAt && (
              <CountdownTimer expiresAt={market.expiresAt} />
            )}
            {isResolved && (
              <Badge
                variant="secondary"
                className={
                  resolvedOutcome === "yes"
                    ? "text-xs font-semibold bg-success/20 text-success"
                    : "text-xs font-semibold bg-destructive/20 text-destructive"
                }
              >
                {resolvedOutcome === "yes" ? "Yes Won" : "No Won"}
              </Badge>
            )}
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
