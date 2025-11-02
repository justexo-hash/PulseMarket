import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LogIn, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useState } from "react";

const loginSchema = z.object({
  walletAddress: z.string().min(32, "Invalid wallet address"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { login } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      walletAddress: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoggingIn(true);
    try {
      await login(data.walletAddress, data.password);
      toast({
        title: "Login Successful!",
        description: "Welcome to PulseMarket.",
      });
      setLocation("/");
    } catch (error: any) {
      const errorMessage = error.message || "Login failed. Please check your credentials.";
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoggingIn(false);
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
        <div className="max-w-md mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold text-white mb-2">Welcome Back</h1>
            <p className="text-white/80 text-lg">
              Log in to your PulseMarket account
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LogIn className="h-5 w-5" />
                Log In
              </CardTitle>
              <CardDescription>
                Enter your wallet address and password
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="walletAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Wallet Address</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Enter your wallet address"
                            className="font-mono text-sm"
                            data-testid="input-wallet-address"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="password" 
                            placeholder="Enter password"
                            data-testid="input-password"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoggingIn}
                    data-testid="button-login"
                  >
                    {isLoggingIn ? "Logging in..." : "Log In"}
                  </Button>
                </form>
              </Form>

              <div className="mt-6 text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Don't have a wallet yet?{" "}
                  <span
                    className="text-primary cursor-pointer hover:underline"
                    onClick={() => setLocation("/generate-wallet")}
                    data-testid="link-generate-wallet"
                  >
                    Generate Wallet
                  </span>
                </p>
              </div>

              <Alert className="mt-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Your wallet address is your public key. You can deposit Solana to this address
                  to fund your PulseMarket account.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
