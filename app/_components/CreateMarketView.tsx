"use client";

/* eslint-disable @next/next/no-img-element */

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
import { ArrowLeft, Plus, Shield, Users, Search, Loader2, Upload, X } from "lucide-react";
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

const createMarketFormSchema = insertMarketSchema.extend({
  isPrivate: z.boolean().optional(),
});

type CreateMarketFormValues = z.infer<typeof createMarketFormSchema>;

export function CreateMarketView() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<CreateMarketFormValues>({
    resolver: zodResolver(createMarketFormSchema),
    defaultValues: {
      question: "",
      category: "",
      expiresAt: null,
      isPrivate: !user?.isAdmin, // Default to private for non-admins, public for admins
      image: undefined,
      tokenAddress: undefined,
    },
  });

  const isPrivate = form.watch("isPrivate");
  const isAdmin = user?.isAdmin;
  const [isFetchingToken, setIsFetchingToken] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const createMarket = useMutation({
    mutationFn: async (data: CreateMarketFormValues) => {
      // Convert expiresAt to ISO string if it's a date string
      // Normalize image field: convert null/undefined to undefined, keep strings as-is
      const payload: CreateMarketFormValues = {
        ...data,
        expiresAt: data.expiresAt ? new Date(data.expiresAt).toISOString() : null,
        payoutType: data.isPrivate ? "winner-takes-all" : "proportional",
      };
      
      // Only include image field if it has a value (not null/undefined/empty)
      if (data.image !== null && data.image !== undefined && data.image !== "") {
        payload.image = data.image;
      } else {
        // Explicitly set to undefined (will be omitted in JSON)
        payload.image = undefined;
      }
      
      console.log('[CreateMarket] Sending payload:', JSON.stringify(payload, null, 2));
      console.log('[CreateMarket] Image value:', data.image);
      console.log('[CreateMarket] Image type:', typeof data.image);
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
        window.location.href = `/markets/${market.slug}`;
      } else {
        toast({
          title: "Market Created!",
          description: "Your new market has been added successfully.",
        });
        router.push("/");
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

  const handleFileUpload = async (file: File) => {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a JPEG, PNG, GIF, or WebP image.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please upload an image smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      // For FormData, we need to let the browser set Content-Type automatically
      const response = await fetch("/api/upload/image", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      console.log("[Upload] Response status:", response.status);
      console.log("[Upload] Response headers:", Object.fromEntries(response.headers.entries()));
      
      // Check content type before parsing
      const contentType = response.headers.get("content-type");
      console.log("[Upload] Content-Type:", contentType);
      
      if (!contentType || !contentType.includes("application/json")) {
        // Clone response to read text without consuming the original
        const clonedResponse = response.clone();
        const text = await clonedResponse.text();
        console.error("[Upload] Non-JSON response (first 500 chars):", text.substring(0, 500));
        throw new Error(`Server returned ${contentType || "unknown"} instead of JSON`);
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch((e) => {
          console.error("[Upload] Failed to parse error JSON:", e);
          return { error: "Failed to upload image" };
        });
        throw new Error(errorData.error || "Failed to upload image");
      }

      const data = await response.json();
      console.log("[Upload] Success! Data:", data);
      
      if (data.success && data.url) {
      form.setValue("image", data.url);
        setImagePreview(data.url);
        toast({
          title: "Image Uploaded!",
          description: "Image has been uploaded successfully.",
        });
      } else {
        throw new Error("Failed to upload image");
      }
    } catch (error: any) {
      console.error("[Upload] Error:", error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const removeImage = () => {
    form.setValue("image", undefined);
    setImagePreview(null);
  };

  const fetchTokenData = async () => {
    const currentTokenAddress = form.getValues("tokenAddress");
    if (!currentTokenAddress || currentTokenAddress.trim() === "") {
      toast({
        title: "Token Address Required",
        description: "Please enter a token contract address first.",
        variant: "destructive",
      });
      return;
    }

    setIsFetchingToken(true);
    try {
      // Use fetch directly to avoid apiRequest consuming the response body
      const response = await fetch(`/api/tokens/${currentTokenAddress.trim()}`, {
        method: "GET",
        credentials: "include",
      });
      
      console.log("[Fetch Token] Response status:", response.status);
      console.log("[Fetch Token] Response headers:", Object.fromEntries(response.headers.entries()));
      
      // Check content type before parsing
      const contentType = response.headers.get("content-type");
      console.log("[Fetch Token] Content-Type:", contentType);
      
      if (!contentType || !contentType.includes("application/json")) {
        // Clone response to read text without consuming the original
        const clonedResponse = response.clone();
        const text = await clonedResponse.text();
        console.error("[Fetch Token] Non-JSON response (first 500 chars):", text.substring(0, 500));
        throw new Error(`Server returned ${contentType || "unknown"} instead of JSON. Response: ${text.substring(0, 100)}`);
      }
      
      // Check if response is ok
      if (!response.ok) {
        // Clone response to read text without consuming
        const clonedResponse = response.clone();
        const errorText = await clonedResponse.text();
        console.error("[Fetch Token] Error response text:", errorText);
        let errorMessage = `Failed to fetch token data: ${response.status}`;
        
        // Try to parse as JSON for better error message
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.details || errorJson.error || errorMessage;
        } catch {
          // If not JSON, use the text or status
          if (errorText && errorText.length < 200) {
            errorMessage = errorText;
          }
        }
        
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      console.log("[Fetch Token] Success! Data:", data);
      
      if (data.success && data.token) {
        // Auto-populate image field if available
        if (data.token.image) {
          form.setValue("image", data.token.image);
          setImagePreview(data.token.image);
        }
        
        toast({
          title: "Token Data Fetched!",
          description: `Found ${data.token.name} (${data.token.symbol})`,
        });
      } else {
        throw new Error(data.error || "Failed to fetch token data");
      }
    } catch (error: any) {
      console.error("[Fetch Token] Error:", error);
      toast({
        title: "Failed to Fetch Token Data",
        description: error.message || "Please check the token address and try again.",
        variant: "destructive",
      });
    } finally {
      setIsFetchingToken(false);
    }
  };

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
      <Button variant="ghost" className="mb-6 hover-elevate" asChild>
        <Link href="/" data-testid="button-back">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Markets
        </Link>
      </Button>

      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-secondary-foreground  mb-2">
            {isAdmin ? "Create New Market" : "Create Private Wager"}
          </h1>
          <p className="text-muted-foreground text-lg">
            {isAdmin 
              ? "Create a public market or a private wager between friends"
              : "Create a private wager that only people with the invite code can bet on"}
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="bg-card rounded-lg p-8 shadow-xl">
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
                    <Shield className="h-5 w-5 text-secondary-foreground mt-0.5" />
                    <div className="text-sm text-muted-foreground">
                      <p className="font-medium mb-1">Private Wager Details:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Only people with the invite code can bet</li>
                        <li>Winner takes all (entire pool split among winners)</li>
                        <li>You&apos;ll receive an invite code to share</li>
                        <li>Not visible in public market list</li>
                      </ul>
                    </div>
                  </div>
                </Card>
              )}

              {isAdmin && (
                <>
                  <FormField
                    control={form.control}
                    name="tokenAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold">Token Contract Address (Optional)</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input
                              placeholder="e.g., 77SDHo2kgfNiYbR4bCPLLaDtjZ22ucTPsD3zFRB5c3Gu"
                              {...field}
                              value={field.value || ""}
                              className="text-base font-mono"
                              data-testid="input-token-address"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={fetchTokenData}
                              disabled={isFetchingToken || !field.value || field.value.trim() === ""}
                              className="flex-shrink-0"
                            >
                              {isFetchingToken ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Fetching...
                                </>
                              ) : (
                                <>
                                  <Search className="mr-2 h-4 w-4" />
                                  Fetch Data
                                </>
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormDescription>
                          Enter a Solana token contract address and click &quot;Fetch Data&quot; to automatically populate the image field
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="image"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold">Market Image (Optional)</FormLabel>
                        <FormControl>
                          <div className="space-y-4">
                            {imagePreview || field.value ? (
                              <div className="relative">
                                <img
                                  src={imagePreview || field.value || ""}
                                  alt="Market preview"
                                  className="w-full h-48 object-cover rounded-lg border border-card-border"
                                />
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  className="absolute top-2 right-2"
                                  onClick={removeImage}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <div
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={handleDrop}
                                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                                  dragActive
                                    ? "border-primary bg-primary/5"
                                    : "border-card-border bg-secondary/30"
                                } ${isUploading ? "opacity-50 pointer-events-none" : "cursor-pointer hover:border-primary/50"}`}
                              >
                                <input
                                  type="file"
                                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                                  onChange={handleFileSelect}
                                  className="hidden"
                                  id="image-upload"
                                  disabled={isUploading}
                                />
                                <label htmlFor="image-upload" className="cursor-pointer">
                                  {isUploading ? (
                                    <div className="flex flex-col items-center gap-2">
                                      <Loader2 className="h-8 w-8 animate-spin text-secondary-foreground" />
                                      <p className="text-sm text-muted-foreground">Uploading...</p>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col items-center gap-2">
                                      <Upload className="h-8 w-8 text-muted-foreground" />
                                      <p className="text-sm font-medium text-secondary-foreground ">
                                        Drag and drop an image here, or click to select
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        JPEG, PNG, GIF, or WebP (max 5MB)
                                      </p>
                                    </div>
                                  )}
                                </label>
                              </div>
                            )}
                            <input type="hidden" {...field} value={field.value || ""} />
                          </div>
                        </FormControl>
                        <FormDescription>
                          Upload an image for this market. Will be auto-populated if you fetch token data.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
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
