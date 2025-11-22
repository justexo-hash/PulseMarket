import type { ReactNode } from "react";
import { Header } from "../(markets)/_components/Header";
import { Footer } from "../(markets)/_components/Footer";

export default function ProfilesLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col relative">
      <div className="fixed inset-0 z-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: "blur(2px)" }}
        >
          <source src="/bgvideo.mp4" type="video/mp4" />
        </video>
      </div>
      <div className="relative z-10 flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow pb-20">{children}</main>
        <Footer />
      </div>
    </div>
  );
}

