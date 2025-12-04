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
            <div className="hidden lg:block category_searchbar relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-secondary  outline-none pointer-events-none" />
              <Input
                type="text"
                placeholder="Search..."
                className={
                  "w-[325px] pl-9 text-muted-secondar bg-secondary cursor-pointer border-muted-foreground/20 outline-none focus:bg-transparent focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none "
                }
              />
            </div>
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
