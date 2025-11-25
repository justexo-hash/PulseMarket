"use client";
import { WarpBackground } from "@/components/ui/shadcn-io/warp-background";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getCookie, setCookie } from "cookies-next";
import { cn } from "@/lib/utils";

export default function IntroModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  // Steps content
  const steps = [
    {
      title: "Welcome to PulseMarket",
      desc: "A next‑gen prediction market for memecoins, events, narratives and crypto culture.",
    },
    {
      title: "How It Works",
      desc: "Bet YES or NO on markets. Prices reflect probabilities. If your side wins, you earn.",
    },
    {
      title: "Why Memecoins?",
      desc: "Memecoins move with culture and narratives. Prediction markets let you trade them.",
    },
    {
      title: "Events & Trends",
      desc: "Elections, crypto news, influencer drama, token launches — everything is tradable.",
    },
    {
      title: "Ready to Start?",
      desc: "Connect your wallet and explore live markets instantly.",
    },
  ];

  useEffect(() => {
    const hasSeen = getCookie("seen_intro");
    if (!hasSeen) {
      setOpen(true);
    }
  }, []);

  const handleFinish = () => {
    setCookie("seen_intro", "1", { maxAge: 60 * 60 * 24 * 365 });
    setOpen(false);
  };

  const isLast = step === steps.length - 1;
  const isFirst = step === 0;

  return (
    
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md p-6 flex flex-col gap-6 justify-center min-h-[400px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-center">
            {steps[step].title}
          </DialogTitle>
        </DialogHeader>

        <p className="min-h-[50px] text-muted-foreground text-center mt-3">
          {steps[step].desc}
        </p>

        {/* Slider dots */}
        <div className="flex justify-center mt-6 gap-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                i === step ? "bg-primary w-4" : "bg-muted"
              )}
            />
          ))}
        </div>

        {/* Navigation buttons */}
        <div className="mt-6 flex items-center justify-between">
          <Button
            variant="ghost"
            disabled={isFirst}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            Back
          </Button>

          {!isLast && (
            <div className="flex items-center gap-3">
              {/* Skip button replacing the default close icon */}
              <Button
                variant="ghost"
                onClick={handleFinish}
              >
                Skip
              </Button>
              <Button
                onClick={() =>
                  setStep((s) => Math.min(steps.length - 1, s + 1))
                }
              >
                Next
              </Button>
            </div>
          )}

          {isLast && <Button onClick={handleFinish}>Enter App</Button>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
