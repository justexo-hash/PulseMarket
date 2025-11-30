import { format } from "date-fns";
import type { ReactNode } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TrendingUp, Target, Users, Trophy, Sparkles, Shield, Settings } from "lucide-react";
import { FollowButton } from "./follow-button";
import type { PulseProfileSummary } from "@server/profiles";
import Link from "next/link";
import { ProfileSettingsSheet } from "./profile-settings-sheet";

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
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-background via-background to-muted/20 p-8 shadow-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <Avatar className="h-24 w-24 border-2 border-white/40 ring-4 ring-black/20">
              {user.avatarUrl ? (
                <Image
                  src={user.avatarUrl}
                  alt={user.displayName}
                  width={96}
                  height={96}
                  className="object-cover"
                />
              ) : (
                <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                  {user.displayName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-4xl font-bold text-secondary-foreground">
                  {user.displayName}
                </h1>
                <Badge variant="secondary" className="text-sm">
                  @{user.username}
                </Badge>
                <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-wide text-white/80">
                  <Sparkles className="mr-1 h-3 w-3" />
                  Pulse Forecaster
                </span>
              </div>
              <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">
                {user.bio || "This forecaster hasn’t added a bio yet."}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span>Joined {format(new Date(user.joinedAt), "MMMM d, yyyy")}</span>
                <span className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  {user.walletAddress.slice(0, 4)}...{user.walletAddress.slice(-4)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
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
            <div className="flex items-center justify-end gap-3">
              {canFollow ? (
                <FollowButton
                  username={user.username}
                  initialIsFollowing={followers.isFollowing}
                />
              ) : viewerId === user.id ? (
                <ProfileSettingsSheet
                  user={{
                    username: user.username,
                    displayName: user.displayName,
                    bio: user.bio,
                    avatarUrl: user.avatarUrl,
                  }}
                >
                  <Badge
                    asChild
                    className="cursor-pointer rounded-full px-4 py-2 text-sm font-medium"
                  >
                    <button className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Edit Profile
                    </button>
                  </Badge>
                </ProfileSettingsSheet>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {viewerId === user.id && (
        <ProfileSettingsCard
          user={{
            username: user.username,
            displayName: user.displayName,
            bio: user.bio,
            avatarUrl: user.avatarUrl,
          }}
        />
      )}

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
        <TabsList className="grid w-full grid-cols-3 rounded-2xl border border-white/10 bg-white/5 p-1 lg:w-auto">
          <TabsTrigger
            value="activity"
            className="rounded-xl data-[state=active]:bg-background data-[state=active]:text-secondary-foreground"
          >
            Activity
          </TabsTrigger>
          <TabsTrigger
            value="calibration"
            className="rounded-xl data-[state=active]:bg-background data-[state=active]:text-secondary-foreground"
          >
            Calibration
          </TabsTrigger>
          <TabsTrigger
            value="sectors"
            className="rounded-xl data-[state=active]:bg-background data-[state=active]:text-secondary-foreground"
          >
            Sectors
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="mt-6">
          <Card className="p-6 space-y-4 border border-white/5 bg-white/5 backdrop-blur">
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
                      className="text-lg font-semibold hover:underline text-secondary-foreground"
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
          <Card className="p-6 border border-white/5 bg-white/5 backdrop-blur">
            {stats.calibrationBuckets.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Need more resolved bets to compute calibration.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stats.calibrationBuckets.map((bucket) => (
                  <div
                    key={bucket.bucket}
                    className="rounded-xl border border-white/10 p-4 bg-background/60"
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
          <Card className="p-6 border border-white/5 bg-white/5 backdrop-blur">
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
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center backdrop-blur">
      <p className="text-xs uppercase tracking-wide text-white/70">{label}</p>
      <p className="text-xl font-semibold text-secondary-foreground">{value}</p>
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
    <Card className="p-5 space-y-2 border border-white/10 bg-gradient-to-br from-white/5 to-transparent backdrop-blur">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-2xl font-bold text-secondary-foreground">{value}</p>
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

