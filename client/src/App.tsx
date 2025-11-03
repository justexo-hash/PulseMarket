import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WalletContextProvider } from "@/lib/wallet";
import { AuthProvider, useAuth } from "@/lib/auth";
import { useRealtime } from "@/lib/realtime";
import { useMarketNotifications } from "@/lib/notifications";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { MarketList } from "@/pages/MarketList";
import { MarketDetail } from "@/pages/MarketDetail";
import { CreateMarket } from "@/pages/CreateMarket";
import { Portfolio } from "@/pages/Portfolio";
import { Deposit } from "@/pages/Deposit";
import { Withdraw } from "@/pages/Withdraw";
import { ActivityFeed } from "@/pages/ActivityFeed";
import { AdminPanel } from "@/pages/AdminPanel";
import { Transparency } from "@/pages/Transparency";
import { PrivateWager } from "@/pages/PrivateWager";
import AboutUs from "@/pages/AboutUs";
import TermsOfService from "@/pages/TermsOfService";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <div className="min-h-screen flex flex-col relative">
      <div className="fixed inset-0 z-0" />
      <div className="relative z-10 flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow pb-20">
          <Switch>
            <Route path="/" component={MarketList} />
            <Route path="/market/:slug" component={MarketDetail} />
            <Route path="/create" component={CreateMarket} />
            <Route path="/portfolio" component={Portfolio} />
            <Route path="/deposit" component={Deposit} />
            <Route path="/withdraw" component={Withdraw} />
            <Route path="/activity" component={ActivityFeed} />
            <Route path="/admin" component={AdminPanel} />
            <Route path="/transparency" component={Transparency} />
            <Route path="/wager/:inviteCode" component={PrivateWager} />
            <Route path="/about" component={AboutUs} />
            <Route path="/terms" component={TermsOfService} />
            <Route path="/privacy" component={PrivacyPolicy} />
            <Route component={NotFound} />
          </Switch>
        </main>
        <Footer />
      </div>
    </div>
  );
}

function AppContent() {
  const { user } = useAuth();
  // Initialize real-time WebSocket connection with user ID for authentication
  useRealtime(user?.id);
  // Initialize market expiration notifications
  useMarketNotifications(user?.id);
  
  return (
    <TooltipProvider>
      <Toaster />
      <Router />
    </TooltipProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <WalletContextProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </WalletContextProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
