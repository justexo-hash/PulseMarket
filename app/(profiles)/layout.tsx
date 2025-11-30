import type { ReactNode } from "react";
import { Header } from "../(markets)/_components/Header";
import { Footer } from "../(markets)/_components/Footer";

export default function ProfilesLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background via-background to-muted/10">
      <Header />
      <main className="flex-grow pb-20">{children}</main>
      <Footer />
    </div>
  );
}

