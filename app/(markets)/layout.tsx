import type { ReactNode } from "react";
import { Header } from "./_components/Header";
import { Footer } from "./_components/Footer";

export default function MarketsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col relative">

      <div className="relative z-10 flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow pb-20">{children}</main>
        <Footer />
      </div>
    </div>
  );
}

