import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Button variant="ghost" className="mb-6 hover-elevate" asChild>
        <Link href="/">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Link>
      </Button>

      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold text-primary  mb-4">About Us</h1>

        <Card className="p-8 space-y-6">
          <section>
            <h2 className="text-2xl font-semibold text-primary  mb-3">What is PulseMarket?</h2>
            <p className="text-muted-foreground leading-relaxed">
              PulseMarket is a decentralized prediction market platform built on Solana.
              We enable users to bet on future events with complete transparency and
              provably fair outcomes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-primary  mb-3">Our Mission</h2>
            <p className="text-muted-foreground leading-relaxed">
              We believe in democratizing access to prediction markets and creating
              a transparent, fair platform where anyone can participate in forecasting
              future events. By leveraging Solana&apos;s fast and low-cost transactions,
              we make prediction markets accessible to everyone.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-primary  mb-3">Key Features</h2>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Provably fair outcomes with commitment hashes</li>
              <li>On-chain transaction transparency</li>
              <li>Real-time odds and market updates</li>
              <li>Private wagers for friends</li>
              <li>Secure Solana wallet integration</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-primary  mb-3">Technology</h2>
            <p className="text-muted-foreground leading-relaxed">
              PulseMarket is built on the Solana blockchain, ensuring fast transactions
              and low fees. All deposits, bets, and payouts are handled on-chain with
              full transparency. Our provably fair system ensures that market outcomes
              cannot be manipulated.
            </p>
          </section>
        </Card>
      </div>
    </div>
  );
}

