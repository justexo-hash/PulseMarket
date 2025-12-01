import type { ReactNode } from "react";
import { Header } from "../(markets)/_components/Header";
import { Footer } from "../(markets)/_components/Footer";

export default function ProfilesLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col bg-gradient-to-b from-background via-background to-muted/10">
  
      <main className="flex-grow pb-20">{children}</main>

    </div>
  );
}

