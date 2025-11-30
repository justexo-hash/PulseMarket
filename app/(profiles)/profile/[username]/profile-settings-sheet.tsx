"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useRouter } from "next/navigation";
import { ProfileSettingsCard } from "./profile-settings-card";

interface ProfileSettingsSheetProps {
  children: React.ReactNode;
  user: {
    username: string;
    displayName: string;
    bio: string | null;
    avatarUrl: string | null;
  };
}

export function ProfileSettingsSheet({
  children,
  user,
}: ProfileSettingsSheetProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>Edit Profile</SheetTitle>
          <SheetDescription>
            Update your public profile details and appearance.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6">
          <ProfileSettingsCard
            user={user}
            onSuccess={(nextUsername) => {
              setOpen(false);
              if (nextUsername && nextUsername !== user.username) {
                router.push(`/profile/${nextUsername}`);
              }
            }}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

