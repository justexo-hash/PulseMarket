"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useState } from "react";
import { type Market } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { ProbabilityGauge } from "./ProbabilityGauge";
import { Star } from "lucide-react";
// --- Countdown badge displayed when market has an expiration date ---
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

  const isUrgent =
    new Date(expiresAt).getTime() - Date.now() < 60 * 60 * 1000; // Less than 60 minutes

  return (
    <Badge
      variant="outline"
      className={`text-xs flex items-center gap-1 ${
        isUrgent
          ? "bg-destructive/20 text-destructive border-destructive/30"
          : "bg-primary/20 text-primary border-primary/30"
      }`}
    >
      <Clock className="h-3 w-3" />
      {timeRemaining}
    </Badge>
  );
}

// --- Main market card component ---
export function MarketCard({ market }: MarketCardProps) {
  const [favorited, setFavorited] = useState(false);
  // Compute market resolution state and probability
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
    // Battle market - extract names from question
    // Format: "Which token will... first: TokenName1 or TokenName2?"
    const match = market.question.match(/first:\s*([^?]+)\s*or\s*([^?]+)\?/i);
    if (match) {
      token1Name = match[1].trim();
      token2Name = match[2].trim();
    }
  } else if (market.tokenAddress) {
    // Single token market - extract name from question
    // Format: "Will TokenName's current..."
    const match = market.question.match(/Will\s+([^']+)'s/i);
    if (match) {
      token1Name = match[1].trim();
    }
  }

  return (
    <Link href={marketPath} data-testid={`group z-1 card-market-${market.id}`}>
      <div
        className={`group bg-secondary rounded-lg border border-border p-3 gap-4 shadow-lg hover-elevate active-elevate-2 transition-all duration-200 cursor-pointer h-full flex flex-col justify-between`}
      >
        {/* ========================================================= */}
        {/* SECTION 1 — HEADER (Category, Status, Countdown, Gauge)   */}
        {/* ========================================================= */}
        <div className="flex items-start justify-between min-h-[56px] w-full mb-3">
          <div className="flex gap-4 items-start w-full">
            <div className="flex flex-col flex-1 gap-4">
              <div className="flex gap-3 items-center">
                <div className="flex-shrink-0 w-1/2 gap-2 max-w-[35px] flex items-center justify-center">
                  <div className="w-full rounded-sm overflow-hidden">
                    <img
                      src={market.image || "/placeholder.png"}
                      alt={market.question}
                      className="w-[150px] object-cover"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.png";
                      }}
                    />
                  </div>
                </div>
                <h2
                  className="text-sm font-semibold text-foreground"
                  data-testid={`text-question-${market.id}`}
                >
                  {market.question}
                </h2>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            {/* <div className="gap-4 flex">
              <Badge
                variant="secondary"
                className="bg-primary text-primary-foreground uppercase text-xs font-semibold tracking-wide"
                data-testid={`badge-category-${market.id}`}
              >
                {market.category}
              </Badge>
              {isResolved && (
                <Badge
                  variant={
                    resolvedOutcome === "yes" ? "default" : "destructive"
                  }
                  className={`uppercase text-xs font-bold flex items-center gap-1 ${
                    resolvedOutcome === "yes"
                      ? "bg-green-600 text-white border-green-500"
                      : ""
                  }`}
                  data-testid={`badge-resolved-${market.id}`}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  {resolvedOutcome}
                </Badge>
              )}
              {!isResolved && market.expiresAt && (
                <CountdownTimer expiresAt={market.expiresAt} />
              )}
            </div> */}
            {/* {!isResolved && displayProbability > 50 && (
              <TrendingUp className="h-4 w-4 text-chart-2" />
            )} */}
          </div>

          {/* Probability Gauge */}
          <ProbabilityGauge
            value={displayProbability}
            resolved={isResolved}
            outcome={resolvedOutcome as "yes" | "no"}
          />
        </div>

        {/* ========================================================= */}
        {/* SECTION 2 — IMAGE & QUESTION TITLE                        */}
        {/* ========================================================= */}

        {/* ========================================================= */}
        {/* SECTION 3 — ACTION BUTTONS (UI Only)                      */}
        {/* ========================================================= */}
        <div className="flex gap-4 w-full">
          <button className="flex-1 py-2 rounded-md bg-green-400/20 text-green-400 font-semibold hover:bg-green-700/40 transition">
            {market.tokenAddress2 ? (token1Name || "Token 1") : "Yes"}
          </button>
          <button className="flex-1 py-2 rounded-md bg-red-400/20 text-red-400 font-semibold hover:bg-red-700/40 transition">
            {market.tokenAddress2 ? (token2Name || "Token 2") : "No"}
          </button>
        </div>

        {/* ========================================================= */}
        {/* SECTION 4 — VOLUME INFO & COUNTDOWN                       */}
        {/* ========================================================= */}
        <div className="flex items-center w-full justify-between text-xs text-muted-foreground mt-auto">
          <span>{volume.toFixed(2)} SOL Vol.</span>
          <div className="flex items-center gap-1.5">
            {!isResolved && market.expiresAt && (
              <CountdownTimer expiresAt={market.expiresAt} />
            )}
            {isResolved && (
              <Badge
                variant="secondary"
                className="bg-red-400/20 text-red-400 uppercase text-xs font-semibold tracking-wide"
                data-testid={`badge-category-${market.id}`}
              >
                Resolved
              </Badge>
            )}
            <Star
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();                setFavorited(!favorited);
              }}
              className={`hidden group-hover:block text-muted-foreground border-none
                cursor-pointer transition-all z-10
                ${favorited && " fill-orange-400"}
              `}
              size="18"
              fill={favorited ? "currentColor" : "none"}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
