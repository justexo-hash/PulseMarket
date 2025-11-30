"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { FollowButton } from "./follow-button";

interface FollowControlsProps {
  username: string;
  initialFollowers: number;
  initialFollowing: number;
  initialIsFollowing: boolean;
  canFollow: boolean;
  ownerAction?: ReactNode;
}

export function FollowControls({
  username,
  initialFollowers,
  initialFollowing,
  initialIsFollowing,
  canFollow,
  ownerAction,
}: FollowControlsProps) {
  const [followersCount, setFollowersCount] = useState(initialFollowers);

  const handleToggle = (nextState: boolean) => {
    setFollowersCount((prev) => {
      const next = nextState ? prev + 1 : prev - 1;
      return next < 0 ? 0 : next;
    });
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="grid grid-cols-2 gap-3 sm:w-64">
        <StatPill label="Followers" value={followersCount.toLocaleString()} />
        <StatPill label="Following" value={initialFollowing.toLocaleString()} />
      </div>
      <div className="flex items-center justify-end gap-3">
        {canFollow ? (
          <FollowButton
            username={username}
            initialIsFollowing={initialIsFollowing}
            onToggle={handleToggle}
          />
        ) : (
          ownerAction ?? null
        )}
      </div>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-muted-foreground/20 bg-secondary px-4 py-3 text-center shadow-sm">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-xl font-semibold text-secondary-foreground">{value}</p>
    </div>
  );
}


