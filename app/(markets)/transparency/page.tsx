"use client";

import { useQuery } from "@tanstack/react-query";
import { type Market, type Transaction } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, ExternalLink, CheckCircle2, XCircle, Copy } from "lucide-react";
import { format } from "date-fns";
import { extractTxSignature, getSolscanUrl, truncateSignature } from "@/lib/transparency";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function TransparencyPage() {
  const { toast } = useToast();
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const { data: markets = [] } = useQuery<Market[]>({
    queryKey: ["/api/markets"],
  });

  const { data: transactions = [] } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

  // Get all resolved markets with commitments
  const resolvedMarkets = markets.filter(m => m.status === "resolved" && m.commitmentHash);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
    setTimeout(() => setCopiedHash(null), 2000);
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="h-8 w-8 text-secondary-foreground" />
          <h1 className="text-4xl font-bold text-secondary-foreground ">Transparency & Verification</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Verify all transactions and market resolutions on-chain. Everything is provably fair and transparent.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Provably Fair Markets */}
        <div>
          <h2 className="text-2xl font-bold text-secondary-foreground  mb-6">Provably Fair Markets</h2>
          
          {resolvedMarkets.length === 0 ? (
            <Card className="p-8">
              <div className="text-center">
                <p className="text-muted-foreground">No resolved markets yet</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {resolvedMarkets.map((market) => {
                const isValid = market.commitmentHash && market.commitmentSecret && market.resolvedOutcome;
                
                return (
                  <Card key={market.id} className="p-6">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-secondary-foreground  mb-2">{market.question}</h3>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge 
                          variant={market.resolvedOutcome === "yes" ? "default" : market.resolvedOutcome === "no" ? "destructive" : "secondary"}
                          className={market.resolvedOutcome === "yes" ? "bg-green-600 text-white border-green-500" : ""}
                        >
                          {market.resolvedOutcome?.toUpperCase() || "UNKNOWN"}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          Resolved {format(new Date(market.createdAt), "MMM d, yyyy")}
                        </span>
                      </div>
                    </div>

                    {market.commitmentHash && (
                      <div className="space-y-3">
                        <div className="bg-secondary/50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-muted-foreground">Commitment Hash</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(market.commitmentHash!, "Commitment hash")}
                              className="h-6 px-2"
                            >
                              <Copy className={`h-3 w-3 ${copiedHash === market.commitmentHash ? 'text-secondary-foreground' : ''}`} />
                            </Button>
                          </div>
                          <code className="text-xs font-mono break-all text-secondary-foreground ">
                            {market.commitmentHash}
                          </code>
                        </div>

                        {market.commitmentSecret && (
                          <div className="bg-secondary/50 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-muted-foreground">Revealed Secret</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(market.commitmentSecret!, "Secret")}
                                className="h-6 px-2"
                              >
                                <Copy className={`h-3 w-3 ${copiedHash === market.commitmentSecret ? 'text-secondary-foreground' : ''}`} />
                              </Button>
                            </div>
                            <code className="text-xs font-mono break-all text-secondary-foreground ">
                              {market.commitmentSecret}
                            </code>
                          </div>
                        )}

                        {isValid && (
                          <div className="flex items-center gap-2 p-3 bg-chart-2/10 border border-green-500/20 rounded-lg">
                            <CheckCircle2 className="h-4 w-4 text-chart-2" />
                            <span className="text-sm text-chart-2 font-medium">
                              Verifiable: hash({market.resolvedOutcome} + secret + marketId) = commitment
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* On-Chain Transactions */}
        <div>
          <h2 className="text-2xl font-bold text-secondary-foreground  mb-6">On-Chain Transactions</h2>
          
          {transactions.filter(t => {
            // Filter out deposits and withdrawals (private transactions)
            if (t.type === "deposit" || t.type === "withdraw") return false;
            // Only show transactions with on-chain signatures
            return extractTxSignature(t.description, t.txSignature);
          }).length === 0 ? (
            <Card className="p-8">
              <div className="text-center">
                <p className="text-muted-foreground">No on-chain transactions yet</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {transactions
                .filter(t => {
                  // Filter out deposits and withdrawals (private transactions)
                  if (t.type === "deposit" || t.type === "withdraw") return false;
                  // Only show transactions with on-chain signatures
                  return extractTxSignature(t.description, t.txSignature);
                })
                .map((transaction) => {
                  const txSig = extractTxSignature(transaction.description, transaction.txSignature);
                  
                  return (
                    <Card key={transaction.id} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            transaction.type === "deposit" || transaction.type === "payout" 
                              ? "default" 
                              : transaction.type === "bet" 
                              ? "destructive" 
                              : "secondary"
                          }>
                            {transaction.type.toUpperCase()}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(transaction.createdAt), "MMM d, yyyy 'at' h:mm a")}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-secondary-foreground ">
                          {parseFloat(transaction.amount.replace(/^-/, "")).toFixed(4)} SOL
                        </span>
                        
                        {txSig && (
                          <a
                            href={getSolscanUrl(txSig)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-mono text-secondary-foreground hover:underline inline-flex items-center gap-1"
                          >
                            {truncateSignature(txSig)}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </Card>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* Verification Instructions */}
      <Card className="mt-8 p-6 bg-primary/5 border-primary/20">
        <h3 className="text-lg font-semibold text-secondary-foreground  mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-secondary-foreground" />
          How to Verify
        </h3>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong className="text-secondary-foreground ">Provably Fair Markets:</strong> The commitment hash is generated using SHA256(outcome + secret + marketId). 
            After resolution, the secret is revealed. Anyone can verify the hash matches by computing the same hash function.
          </p>
          <p>
            <strong className="text-secondary-foreground ">On-Chain Transactions:</strong> All deposits, payouts, and refunds include Solana transaction signatures. 
            Click any signature link to verify the transaction on Solscan.
          </p>
          <p className="pt-2 border-t border-border">
            <strong className="text-secondary-foreground ">Transparency:</strong> All market resolutions and financial transactions are recorded on-chain 
            and can be independently verified by anyone.
          </p>
        </div>
      </Card>
    </div>
  );
}

