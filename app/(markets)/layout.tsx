// app/(markets)/layout.tsx
"use client";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function MarketsLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  return (
    <Suspense>
      {user ? (
        <Tabs defaultValue="explore">
          <div className="flex items-center justify-start gap-6 mb-6">
            <TabsList>
              <TabsTrigger value="explore">Explore</TabsTrigger>
              <TabsTrigger value="watchlist">Watchlist</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="explore">{children}</TabsContent>

          <TabsContent value="watchlist">
            <div className="text-muted-foreground">Your saved markets</div>
            <p>
              your watchlist is empty to add a coin to the watchlist, click the
              bookmark or ‘add to watchlist’ buttons on a coin detail screen.
            </p>
          </TabsContent>
        </Tabs>
      ) : (
        <>{children}</>
      )}
    </Suspense>
  );
}
