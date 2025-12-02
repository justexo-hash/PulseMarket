import type { ReactNode } from "react";

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

