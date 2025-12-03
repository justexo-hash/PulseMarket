// app/(markets)/layout.tsx
"use client";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import FilterHeader from "app/_components/Header/FilterHeader";

import { useAuth } from "@/lib/auth";

export default function MarketsLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  return (
    <Suspense>
      <div className="mb-6">
        <h2 className="font-semibold mb-3">Now trending</h2>
        <Carousel className="w-full">
          <CarouselContent>
            {Array.from({ length: 10 }).map((_, index) => (
              <CarouselItem key={index} className="md:basis-1/3 lg:basis-1/6">
                <Card className="animate-pulse bg-secondary">
                  <CardContent className="flex h-24 aspect-square items-center justify-center p-0">
                    <span className="text-3xl font-semibold">{index + 1}</span>
                  </CardContent>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>

      {user ? (
        <Tabs defaultValue="explore">
          <TabsList className="mb-3">
            <TabsTrigger value="explore">Explore</TabsTrigger>
            <TabsTrigger value="watchlist">Watchlist</TabsTrigger>
          </TabsList>

          <TabsContent value="explore">
            <FilterHeader />
            {children}
          </TabsContent>

          <TabsContent value="watchlist">
            <div className="text-muted-foreground">Your saved markets</div>
            <p>
              your watchlist is empty to add a coin to the watchlist, click the
              bookmark or ‘add to watchlist’ buttons on a coin detail screen.
            </p>
          </TabsContent>
        </Tabs>
      ) : (
        <>
          <FilterHeader />
          {children}
        </>
      )}
    </Suspense>
  );
}
