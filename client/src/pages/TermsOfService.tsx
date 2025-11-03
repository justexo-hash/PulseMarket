import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function TermsOfService() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link href="/">
        <Button variant="ghost" className="mb-6 hover-elevate">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>
      </Link>

      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold text-foreground mb-4">Terms of Service</h1>
        
        <Card className="p-8 space-y-6">
          <section>
            <p className="text-sm text-muted-foreground mb-6">
              Last updated: {new Date().toLocaleDateString()}
            </p>
            
            <h2 className="text-2xl font-semibold text-foreground mb-3">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing and using PulseMarket, you accept and agree to be bound by 
              these Terms of Service. If you do not agree with these terms, please do 
              not use our platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">2. Eligibility</h2>
            <p className="text-muted-foreground leading-relaxed">
              You must be at least 18 years old to use PulseMarket. You are responsible 
              for ensuring that your use of the platform complies with all applicable laws 
              in your jurisdiction.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">3. Platform Use</h2>
            <p className="text-muted-foreground leading-relaxed">
              PulseMarket provides a decentralized prediction market platform. You are 
              responsible for your account security and all activities that occur under 
              your wallet address. We do not store your private keys.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">4. Betting and Markets</h2>
            <p className="text-muted-foreground leading-relaxed">
              All bets are final once confirmed on the Solana blockchain. Market outcomes 
              are determined according to their resolution criteria. Payouts are 
              calculated proportionally based on the total pool and your bet amount.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">5. Prohibited Activities</h2>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Creating markets that violate applicable laws</li>
              <li>Attempting to manipulate market outcomes</li>
              <li>Using the platform for illegal activities</li>
              <li>Attempting to hack or compromise the platform</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">6. Disclaimer</h2>
            <p className="text-muted-foreground leading-relaxed">
              PulseMarket is provided "as is" without warranties of any kind. We do not 
              guarantee the accuracy of market information or outcomes. You participate 
              in markets at your own risk.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">7. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              To the maximum extent permitted by law, PulseMarket and its operators shall 
              not be liable for any damages arising from your use of the platform.
            </p>
          </section>
        </Card>
      </div>
    </div>
  );
}

