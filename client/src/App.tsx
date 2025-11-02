import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { Header } from "@/components/Header";
import { MarketList } from "@/pages/MarketList";
import { MarketDetail } from "@/pages/MarketDetail";
import { CreateMarket } from "@/pages/CreateMarket";
import { Portfolio } from "@/pages/Portfolio";
import { WalletGenerate } from "@/pages/WalletGenerate";
import { Register } from "@/pages/Register";
import { Login } from "@/pages/Login";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <>
      <Header />
      <Switch>
        <Route path="/" component={MarketList} />
        <Route path="/market/:id" component={MarketDetail} />
        <Route path="/create" component={CreateMarket} />
        <Route path="/portfolio" component={Portfolio} />
        <Route path="/wallet/generate" component={WalletGenerate} />
        <Route path="/register" component={Register} />
        <Route path="/login" component={Login} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
