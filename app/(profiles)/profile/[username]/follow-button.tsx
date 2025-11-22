"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface FollowButtonProps {
  username: string;
  initialIsFollowing: boolean;
}

export function FollowButton({
  username,
  initialIsFollowing,
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleToggle = () => {
    startTransition(async () => {
      try {
        const method = isFollowing ? "DELETE" : "POST";
        const response = await fetch(`/api/profiles/${username}/follow`, {
          method,
        });
        if (!response.ok) {
          throw new Error("Failed to update follow status");
        }
        setIsFollowing(!isFollowing);
        toast({
          title: isFollowing ? "Unfollowed" : "Following",
          description: isFollowing
            ? `You will no longer receive updates from ${username}.`
            : `You will get notifications when ${username} opens new positions.`,
        });
      } catch (error: any) {
        toast({
          title: "Action failed",
          description: error?.message || "Unable to update follow status.",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <Button
      onClick={handleToggle}
      variant={isFollowing ? "outline" : "default"}
      disabled={pending}
      className="min-w-[140px]"
    >
      {pending
        ? "Please wait..."
        : isFollowing
        ? "Following"
        : "Follow forecaster"}
    </Button>
  );
}

