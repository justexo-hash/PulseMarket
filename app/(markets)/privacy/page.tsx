import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function PrivacyPage() {
  const lastUpdated = new Date().toLocaleDateString();

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Button variant="ghost" className="mb-6 hover-elevate" asChild>
        <Link href="/">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Link>
      </Button>

      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold text-primary  mb-4">Privacy Policy</h1>

        <Card className="p-8 space-y-6">
          <section>
            <p className="text-sm text-muted-foreground mb-6">Last updated: {lastUpdated}</p>
            <h2 className="text-2xl font-semibold text-primary  mb-3">1. Overview</h2>
            <p className="text-muted-foreground leading-relaxed">
              PulseMarket respects your privacy. This Privacy Policy explains how we collect, use, and protect
              your information when you use our platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-primary  mb-3">2. Information We Collect</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">
              We collect the following information:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Wallet addresses (public keys) for account creation</li>
              <li>Transaction signatures and on-chain activity</li>
              <li>Betting history and market participation</li>
              <li>Session data for authentication</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-primary  mb-3">3. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed">We use your information to:</p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Provide and maintain the platform</li>
              <li>Process bets and payouts</li>
              <li>Verify on-chain transactions</li>
              <li>Maintain session security</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-primary  mb-3">4. Blockchain Transparency</h2>
            <p className="text-muted-foreground leading-relaxed">
              All transactions on PulseMarket are conducted on the Solana blockchain, which is public and transparent.
              Your wallet address and transaction history are visible on-chain. We cannot and do not hide this information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-primary  mb-3">5. Data Storage</h2>
            <p className="text-muted-foreground leading-relaxed">
              We store your wallet address, betting history, and transaction signatures in our database. We do not store private
              keys or sensitive authentication data. Session data is stored securely using industry-standard practices.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-primary  mb-3">6. Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement security measures to protect your information, including secure session management and encrypted data
              transmission. However, no system is completely secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-primary  mb-3">7. Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use session cookies to maintain your authentication state. These cookies are essential for the platform to function
              and do not contain personally identifiable information beyond your wallet address.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-primary  mb-3">8. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed">
              You have the right to access, correct, or delete your account information. However, blockchain transactions are permanent
              and cannot be deleted.
            </p>
          </section>
        </Card>
      </div>
    </div>
  );
}

