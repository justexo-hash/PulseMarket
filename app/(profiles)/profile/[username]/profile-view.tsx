import { format } from "date-fns";
import type { ReactNode } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TrendingUp, Target, Users, Trophy } from "lucide-react";
import { FollowButton } from "./follow-button";
import type { PulseProfileSummary } from "@server/profiles";
import Link from "next/link";

interface PulseProfileViewProps {
  profile: PulseProfileSummary;
  viewerId?: number;
}

export function PulseProfileView({ profile, viewerId }: PulseProfileViewProps) {
  const {
    user,
    stats,
    followers,
    recentBets,
  } = profile;

  const canFollow = viewerId !== undefined && viewerId !== user.id;

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="rounded-3xl border border-border/40 bg-gradient-to-br from-slate-900/60 via-slate-900/20 to-slate-800/40 p-8 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20 border-2 border-primary/60">
              {user.avatarUrl ? (
                <Image
                  src={user.avatarUrl}
                  alt={user.displayName}
                  width={80}
                  height={80}
                />
              ) : (
                <AvatarFallback className="text-xl font-bold">
                  {user.displayName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-4xl font-bold text-secondary-foreground ">
                  {user.displayName}
                </h1>
                <Badge variant="secondary" className="text-sm">
                  @{user.username}
                </Badge>
              </div>
              <p className="text-muted-foreground mt-2 max-w-2xl">
                {user.bio || "This forecaster hasn’t added a bio yet."}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Joined {format(new Date(user.joinedAt), "MMMM d, yyyy")}
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="grid grid-cols-2 gap-3">
              <StatPill
                label="Followers"
                value={followers.followersCount.toLocaleString()}
              />
              <StatPill
                label="Following"
                value={followers.followingCount.toLocaleString()}
              />
            </div>
            {canFollow && (
              <FollowButton
                username={user.username}
                initialIsFollowing={followers.isFollowing}
              />
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <MetricCard
          icon={<TrendingUp className="h-5 w-5 text-secondary-foreground" />}
          label="Realized PnL"
          value={`${formatNumber(stats.realizedPnl)} SOL`}
          helper="Settled outcomes only"
        />
        <MetricCard
          icon={<Target className="h-5 w-5 text-secondary-foreground" />}
          label="Total Predictions"
          value={stats.totalPredictions.toString()}
          helper={`${stats.resolvedPredictions} resolved`}
        />
        <MetricCard
          icon={<Trophy className="h-5 w-5 text-secondary-foreground" />}
          label="Win Rate"
          value={`${(stats.winRate * 100).toFixed(1)}%`}
          helper={`${stats.correctPredictions}/${stats.resolvedPredictions} resolved wins`}
        />
        <MetricCard
          icon={<Users className="h-5 w-5 text-secondary-foreground" />}
          label="Calibration Score"
          value={
            stats.calibrationBuckets.length > 0
              ? `${(
                  stats.calibrationBuckets.reduce(
                    (acc, bucket) => acc + Math.abs(bucket.winRate - bucket.bucket / 100),
                    0
                  ) / stats.calibrationBuckets.length
                ).toFixed(2)}`
              : "N/A"
          }
          helper="Lower is better"
        />
      </div>

      <Tabs defaultValue="activity" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto">
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="calibration">Calibration</TabsTrigger>
          <TabsTrigger value="sectors">Sectors</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="mt-6">
          <Card className="p-6 space-y-4">
            {recentBets.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No betting activity yet.
              </p>
            ) : (
              recentBets.map((bet) => (
                <div
                  key={bet.id}
                  className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/40 pb-4 last:border-b-0 last:pb-0"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant={
                          bet.position === "yes" ? "default" : "destructive"
                        }
                      >
                        {bet.position.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(bet.createdAt), "MMM d, yyyy h:mm a")}
                      </span>
                    </div>
                    <Link
                      href={
                        bet.marketSlug
                          ? `/market/${bet.marketSlug}`
                          : bet.marketInviteCode
                          ? `/wager/${bet.marketInviteCode}`
                          : "#"
                      }
                      className="text-lg font-semibold hover:underline"
                    >
                      {bet.marketQuestion || "Unknown market"}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {bet.marketCategory} • Probability at entry {bet.probability}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Amount</p>
                    <p className="text-xl font-bold text-secondary-foreground">
                      {formatNumber(bet.amount)} SOL
                    </p>
                    {bet.marketStatus === "resolved" && (
                      <p
                        className={`text-sm ${
                          bet.resolvedOutcome === bet.position
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {bet.resolvedOutcome === bet.position
                          ? "Winner"
                          : "Settled"}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </Card>
        </TabsContent>

        <TabsContent value="calibration" className="mt-6">
          <Card className="p-6">
            {stats.calibrationBuckets.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Need more resolved bets to compute calibration.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stats.calibrationBuckets.map((bucket) => (
                  <div
                    key={bucket.bucket}
                    className="rounded-xl border border-border/40 p-4 bg-card/60"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold">{bucket.bucket}% bets</p>
                      <Badge variant="secondary">
                        {bucket.correct}/{bucket.predictions} hits
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Realized win rate{" "}
                      <span className="font-semibold text-secondary-foreground">
                        {(bucket.winRate * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="mt-2 h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${bucket.winRate * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="sectors" className="mt-6">
          <Card className="p-6">
            {stats.sectorSpecialization.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No sector data yet.
              </p>
            ) : (
              <div className="space-y-4">
                {stats.sectorSpecialization.map((sector) => (
                  <div
                    key={sector.category}
                    className="flex items-center justify-between"
                  >
                    <div>
                      <p className="font-semibold">{sector.category}</p>
                      <p className="text-xs text-muted-foreground">
                        {sector.total} resolved wagers
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">
                        {(sector.winRate * 100).toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {sector.wins} wins
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/40 bg-card/40 px-4 py-3 text-center">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-xl font-semibold text-secondary-foreground ">{value}</p>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  helper,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <Card className="p-5 bg-card/70 border-border/40 space-y-2">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-2xl font-bold text-secondary-foreground ">{value}</p>
      {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
    </Card>
  );
}

function formatNumber(value: number): string {
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

