import { useState } from "react";
import { Keypair } from "@solana/web3.js";
import { Buffer } from "buffer";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Copy, Check, Wallet, AlertTriangle, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function WalletGenerate() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [wallet, setWallet] = useState<{ publicKey: string; privateKey: string } | null>(null);
  const [copiedPublic, setCopiedPublic] = useState(false);
  const [copiedPrivate, setCopiedPrivate] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const generateWallet = () => {
    const keypair = Keypair.generate();
    const publicKey = keypair.publicKey.toBase58();
    const privateKey = Buffer.from(keypair.secretKey).toString("hex");
    
    setWallet({ publicKey, privateKey });
    setCopiedPublic(false);
    setCopiedPrivate(false);
    setConfirmed(false);
  };

  const copyToClipboard = async (text: string, type: "public" | "private") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "public") {
        setCopiedPublic(true);
        setTimeout(() => setCopiedPublic(false), 2000);
      } else {
        setCopiedPrivate(true);
        setTimeout(() => setCopiedPrivate(false), 2000);
      }
      toast({
        title: "Copied!",
        description: `${type === "public" ? "Public key" : "Private key"} copied to clipboard.`,
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please copy manually.",
        variant: "destructive",
      });
    }
  };

  const handleContinue = () => {
    if (wallet) {
      // Store wallet in session storage for registration
      sessionStorage.setItem("walletAddress", wallet.publicKey);
      setLocation("/register");
    }
  };

  return (
    <div className="relative min-h-screen">
      {/* Background Image with Dark Overlay */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: 'url(/IMG_8113.PNG)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/70" />
      </div>
      
      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold text-white mb-2">Create Your Wallet</h1>
            <p className="text-white/80 text-lg">
              Generate a Solana wallet to get started with PulseMarket
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Wallet Generation
              </CardTitle>
              <CardDescription>
                Your wallet is your identity on PulseMarket. Keep your private key safe!
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!wallet ? (
                <div className="text-center py-8">
                  <Wallet className="h-16 w-16 mx-auto mb-4 text-primary" />
                  <p className="text-muted-foreground mb-6">
                    Click the button below to generate your Solana wallet
                  </p>
                  <Button 
                    size="lg" 
                    onClick={generateWallet}
                    data-testid="button-generate-wallet"
                  >
                    Generate Wallet
                  </Button>
                </div>
              ) : (
                <>
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Important:</strong> Save your private key in a secure location. 
                      You will need it to access your wallet. If you lose it, your wallet cannot be recovered.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-4">
                    {/* Public Key */}
                    <div>
                      <Label className="text-base font-semibold mb-2 block">
                        Public Key (Wallet Address)
                      </Label>
                      <div className="flex gap-2">
                        <div className="flex-1 bg-muted p-3 rounded-md border border-border font-mono text-sm break-all">
                          {wallet.publicKey}
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => copyToClipboard(wallet.publicKey, "public")}
                          data-testid="button-copy-public"
                        >
                          {copiedPublic ? (
                            <Check className="h-4 w-4 text-primary" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        This is your wallet address. Share this to receive funds.
                      </p>
                    </div>

                    {/* Private Key */}
                    <div>
                      <Label className="text-base font-semibold mb-2 block text-destructive">
                        Private Key (Secret - Keep Safe!)
                      </Label>
                      <div className="flex gap-2">
                        <div className="flex-1 bg-destructive/10 p-3 rounded-md border border-destructive/30 font-mono text-sm break-all">
                          {wallet.privateKey}
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => copyToClipboard(wallet.privateKey, "private")}
                          data-testid="button-copy-private"
                        >
                          {copiedPrivate ? (
                            <Check className="h-4 w-4 text-primary" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-sm text-destructive mt-1">
                        Never share your private key with anyone. Store it securely.
                      </p>
                    </div>
                  </div>

                  {/* Confirmation Checkbox */}
                  <div className="flex items-start space-x-3 rounded-lg border border-border p-4 bg-muted/30">
                    <Checkbox
                      id="confirm-saved"
                      checked={confirmed}
                      onCheckedChange={(checked) => setConfirmed(checked as boolean)}
                      data-testid="checkbox-confirm-saved"
                    />
                    <div className="space-y-1 leading-none">
                      <Label
                        htmlFor="confirm-saved"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        I have safely stored my private key
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        I understand that I will need this key to recover my wallet and that it cannot be retrieved if lost.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
            {wallet && (
              <CardFooter className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={generateWallet}
                  data-testid="button-regenerate"
                >
                  Generate New Wallet
                </Button>
                <Button
                  onClick={handleContinue}
                  disabled={!confirmed}
                  data-testid="button-continue-registration"
                >
                  Continue to Registration
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
