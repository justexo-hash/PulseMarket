import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { insertMarketSchema, type InsertMarket } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus } from "lucide-react";
import { Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";

export function CreateMarket() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<InsertMarket>({
    resolver: zodResolver(insertMarketSchema),
    defaultValues: {
      question: "",
      category: "",
    },
  });

  const createMarket = useMutation({
    mutationFn: async (data: InsertMarket) => {
      return await apiRequest("POST", "/api/markets", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/markets"] });
      toast({
        title: "Market Created!",
        description: "Your new market has been added successfully.",
      });
      setLocation("/");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create market. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertMarket) => {
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
          <h1 className="text-4xl font-bold text-foreground mb-2">Create New Market</h1>
          <p className="text-muted-foreground text-lg">
            Propose a prediction market for the community to trade on
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

              <div className="pt-4">
                <Button
                  type="submit"
                  size="lg"
                  className="w-full text-lg font-semibold h-auto py-4"
                  disabled={createMarket.isPending}
                  data-testid="button-submit"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  {createMarket.isPending ? "Creating..." : "Create Market"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
