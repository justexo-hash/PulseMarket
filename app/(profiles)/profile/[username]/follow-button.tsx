"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface FollowButtonProps {
  username: string;
  initialIsFollowing: boolean;
  onToggle?: (nextState: boolean) => void;
}

export function FollowButton({
  username,
  initialIsFollowing,
  onToggle,
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
          const { error } = await response.json();
          throw new Error(error || "Failed to update follow status");
        }
        setIsFollowing((prev) => {
          const next = !prev;
          onToggle?.(next);
          return next;
        });
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

