import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Header } from "@/components/Header";
import { MarketList } from "@/pages/MarketList";
import { MarketDetail } from "@/pages/MarketDetail";
import { CreateMarket } from "@/pages/CreateMarket";
import NotFound from "@/pages/not-found";
import { mockMarkets, type Market } from "@shared/schema";

function Router() {
  const [markets, setMarkets] = useState<Market[]>(mockMarkets);

  const handleCreateMarket = (question: string, category: string) => {
    const newMarket: Market = {
      id: Math.max(...markets.map((m) => m.id), 0) + 1,
      question,
      category,
      probability: Math.floor(Math.random() * 80) + 10,
    };
    setMarkets([...markets, newMarket]);
  };

  return (
    <>
      <Header />
      <Switch>
        <Route path="/">
          <MarketList markets={markets} />
        </Route>
        <Route path="/market/:id">
          <MarketDetail markets={markets} />
        </Route>
        <Route path="/create">
          <CreateMarket onCreateMarket={handleCreateMarket} />
        </Route>
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
