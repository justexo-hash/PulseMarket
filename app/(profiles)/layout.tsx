import type { ReactNode } from "react";

export default function ProfilesLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col">
  
      <main className="flex-grow pb-20">{children}</main>

    </div>
  );
}

