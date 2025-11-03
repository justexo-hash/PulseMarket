import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { insertMarketSchema, type InsertMarket, type Market } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Shield, Users } from "lucide-react";
import { Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";

// Helper to format date for datetime-local input
const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export function CreateMarket() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<InsertMarket & { isPrivate?: boolean }>({
    resolver: zodResolver(insertMarketSchema),
    defaultValues: {
      question: "",
      category: "",
      expiresAt: null,
      isPrivate: !user?.isAdmin, // Default to private for non-admins, public for admins
    },
  });

  const isPrivate = form.watch("isPrivate");
  const isAdmin = user?.isAdmin;

  const createMarket = useMutation({
    mutationFn: async (data: InsertMarket & { isPrivate?: boolean }) => {
      // Convert expiresAt to ISO string if it's a date string
      const payload = {
        ...data,
        expiresAt: data.expiresAt ? new Date(data.expiresAt).toISOString() : null,
        payoutType: data.isPrivate ? "winner-takes-all" : "proportional",
      };
      const response = await apiRequest("POST", "/api/markets", payload);
      // Ensure we parse JSON if it's a Response object
      const market = response instanceof Response ? await response.json() : response;
      console.log('[CreateMarket] Mutation response:', market);
      return market as Market;
    },
    onSuccess: (market) => {
      queryClient.invalidateQueries({ queryKey: ["/api/markets"] });
      console.log('[CreateMarket] Market created:', market);
      console.log('[CreateMarket] Market isPrivate:', market?.isPrivate);
      console.log('[CreateMarket] Market id:', market?.id);

      if (market?.isPrivate === 1 && market?.inviteCode) {
        toast({
          title: "Private Wager Created!",
          description: "Redirecting to your wager page...",
        });

        // Use invite code URL for private wagers
        const targetUrl = `/wager/${market.inviteCode}`;
        console.log('[CreateMarket] Redirecting to:', targetUrl);
        
        // Force redirect using window.location (most reliable)
        window.location.href = targetUrl;
      } else if (market?.slug) {
        toast({
          title: "Market Created!",
          description: "Redirecting to your market page...",
        });
        
        // Use slug for public markets
        window.location.href = `/market/${market.slug}`;
      } else {
        toast({
          title: "Market Created!",
          description: "Your new market has been added successfully.",
        });
        setLocation("/");
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create market. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertMarket & { isPrivate?: boolean }) => {
    // Force isPrivate=true for non-admins
    if (!isAdmin) {
      data.isPrivate = true;
    }
    
    if (data.isPrivate && !user) {
      toast({
        title: "Authentication Required",
        description: "Please connect your wallet to create private wagers.",
        variant: "destructive",
      });
      return;
    }
    createMarket.mutate(data);
  };



  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link href="/" data-testid="button-back">
        <Button variant="ghost" className="mb-6 hover-elevate">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Markets
        </Button>
      </Link>

      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            {isAdmin ? "Create New Market" : "Create Private Wager"}
          </h1>
          <p className="text-muted-foreground text-lg">
            {isAdmin 
              ? "Create a public market or a private wager between friends"
              : "Create a private wager that only people with the invite code can bet on"}
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="bg-card border border-card-border rounded-lg p-8 shadow-xl">
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="question"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold">Market Question</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Will Bitcoin reach $100,000 by 2026?"
                        {...field}
                        className="text-base"
                        data-testid="input-question"
                      />
                    </FormControl>
                    <FormDescription>
                      Ask a clear yes/no question about a future event
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold">Category</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Crypto, Politics, Sports, Technology"
                        {...field}
                        className="text-base"
                        data-testid="input-category"
                      />
                    </FormControl>
                    <FormDescription>
                      Choose a category that best describes this market
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expiresAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold">Expiration Date (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        {...field}
                        value={field.value ? formatDateForInput(new Date(field.value)) : ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value ? new Date(value).toISOString() : null);
                        }}
                        className="text-base"
                        data-testid="input-expires-at"
                        min={formatDateForInput(new Date())}
                      />
                    </FormControl>
                    <FormDescription>
                      When should this market expire? Leave empty for no expiration
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isAdmin && (
                <FormField
                  control={form.control}
                  name="isPrivate"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-base font-semibold flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Private Wager
                        </FormLabel>
                        <FormDescription>
                          Create a private wager that only people with the invite code can bet on. 
                          Winner takes all the SOL in the pool.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              )}
              {!isAdmin && (
                <input type="hidden" {...form.register("isPrivate")} value="true" />
              )}

              {isPrivate && (
                <Card className="p-4 bg-primary/5 border-primary/20">
                  <div className="flex items-start gap-2">
                    <Shield className="h-5 w-5 text-primary mt-0.5" />
                    <div className="text-sm text-muted-foreground">
                      <p className="font-medium mb-1">Private Wager Details:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Only people with the invite code can bet</li>
                        <li>Winner takes all (entire pool split among winners)</li>
                        <li>You'll receive an invite code to share</li>
                        <li>Not visible in public market list</li>
                      </ul>
                    </div>
                  </div>
                </Card>
              )}

              <div className="pt-4">
                <Button
                  type="submit"
                  size="lg"
                  className="w-full text-lg font-semibold h-auto py-4"
                  disabled={createMarket.isPending}
                  data-testid="button-submit"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  {createMarket.isPending 
                    ? "Creating..." 
                    : isAdmin 
                      ? "Create Market" 
                      : "Create Private Wager"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
