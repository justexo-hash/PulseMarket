import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Info, ArrowLeft, ArrowRight } from "lucide-react";

type Step = {
  title: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
};

const steps: Step[] = [
  {
    title: "Pick a Market",
    description:
      "Choose a market and select Yes/No. Odds and potential payout update in real time.",
    imageSrc: "/1.JPEG",
    imageAlt: "Pick a market screenshot",
  },
  {
    title: "Place Your Bet",
    description:
      "Enter an amount and confirm. Funds are escrowed securely until resolution.",
    imageSrc: "/2.PNG",
    imageAlt: "Place bet screenshot",
  },
  {
    title: "Get Paid Fairly",
    description:
      "When a market resolves, payouts are proportional and provably fair. View hashes and on-chain txs.",
    imageSrc: "/3.PNG",
    imageAlt: "Payout and transparency screenshot",
  },
];

export function HowItWorksButton() {
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const step = steps[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)} className="gap-2">
        <Info className="h-4 w-4" />
        How it works
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="text-xl">How it works</DialogTitle>
            <DialogDescription>
              A quick walkthrough of placing a bet on PulseMarket.
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 pb-6">
            <div className="mb-3 flex items-center justify-between">
              <Badge variant="secondary">{stepIndex + 1} / {steps.length}</Badge>
              <div className="text-right">
                <div className="font-semibold">{step.title}</div>
                <div className="text-sm text-muted-foreground">{step.description}</div>
              </div>
            </div>

            <div className="aspect-video w-full overflow-hidden rounded-md border bg-muted">
              {/* Public assets under /client/public are served from root */}
              <img
                src={step.imageSrc}
                alt={step.imageAlt}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>

            <div className="mt-4 flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={() => setStepIndex((i) => Math.max(0, i - 1))} disabled={isFirst}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              {isLast ? (
                <Button size="sm" onClick={() => setOpen(false)}>Got it</Button>
              ) : (
                <Button size="sm" onClick={() => setStepIndex((i) => Math.min(steps.length - 1, i + 1))}>
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default HowItWorksButton;


