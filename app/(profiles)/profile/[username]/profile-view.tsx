import { format } from "date-fns";
import type { ReactNode } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  Target,
  Users,
  Trophy,
  Sparkles,
  Shield,
  Settings,
} from "lucide-react";
import { FollowControls } from "./follow-controls";
import type { PulseProfileSummary } from "@server/profiles";
import Link from "next/link";
import { ProfileSettingsSheet } from "./profile-settings-sheet";

interface PulseProfileViewProps {
  profile: PulseProfileSummary;
  viewerId?: number;
}

export function PulseProfileView({ profile, viewerId }: PulseProfileViewProps) {
  const { user, stats, followers, recentBets } = profile;

  const canFollow = viewerId !== undefined && viewerId !== user.id;
  const ownerAction =
    viewerId === user.id ? (
      <ProfileSettingsSheet
        user={{
          username: user.username,
          displayName: user.displayName,
          bio: user.bio,
          avatarUrl: user.avatarUrl,
        }}
      >
        <Button variant="outline" className="gap-2">
          <Settings className="h-4 w-4" />
          Edit Profile
        </Button>
      </ProfileSettingsSheet>
    ) : null;

  return (
    <div className="max-w-7xl mx-auto">
         <div className="mb-8">
        <h1 className="text-4xl font-bold text-secondary-foreground  mb-2">
          Profile
        </h1>
        <p className="text-muted-foreground text-lg">
          See your profile
        </p>
      </div>
      <div className="flex flex-col gap-6">
        <div className="rounded-2xl border border-muted-foreground/20 bg-secondary shadow-lg p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <Avatar className="h-24 w-24 border border-muted-foreground/20 shadow-inner">
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
                  <h2 className="text-4xl font-bold text-secondary-foreground">
                    {user.displayName}
                  </h2>
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
                  <span>
                    Joined {format(new Date(user.joinedAt), "MMMM d, yyyy")}
                  </span>
                  <span className="flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    {user.walletAddress.slice(0, 4)}...
                    {user.walletAddress.slice(-4)}
                  </span>
                </div>
              </div>
            </div>
            <FollowControls
              username={user.username}
              initialFollowers={followers.followersCount}
              initialFollowing={followers.followingCount}
              initialIsFollowing={followers.isFollowing}
              canFollow={canFollow}
              ownerAction={ownerAction}
            />
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
                      (acc, bucket) =>
                        acc + Math.abs(bucket.winRate - bucket.bucket / 100),
                      0
                    ) / stats.calibrationBuckets.length
                  ).toFixed(2)}`
                : "N/A"
            }
            helper="Lower is better"
          />
        </div>

        <Tabs defaultValue="activity" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-secondary border border-muted-foreground/20 rounded-xl p-1 lg:w-auto">
            <TabsTrigger
              value="activity"
              className="data-[state=active]:bg-muted data-[state=active]:text-secondary-foreground"
            >
              Activity
            </TabsTrigger>
            <TabsTrigger
              value="calibration"
              className="data-[state=active]:bg-muted data-[state=active]:text-secondary-foreground"
            >
              Calibration
            </TabsTrigger>
            <TabsTrigger
              value="sectors"
              className="data-[state=active]:bg-muted data-[state=active]:text-secondary-foreground"
            >
              Sectors
            </TabsTrigger>
          </TabsList>

          <TabsContent value="activity" className="mt-6">
            <Card className="p-6 space-y-4 bg-secondary border border-muted-foreground/20 shadow-sm">
              {recentBets.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No betting activity yet.
                </p>
              ) : (
                recentBets.map((bet) => (
                  <div
                    key={bet.id}
                    className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/50 pb-4 last:border-b-0 last:pb-0"
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
                          {format(
                            new Date(bet.createdAt),
                            "MMM d, yyyy h:mm a"
                          )}
                        </span>
                      </div>
                      <Link
                        href={
                          bet.marketSlug
                            ? `/markets/${bet.marketSlug}`
                            : bet.marketInviteCode
                            ? `/wager/${bet.marketInviteCode}`
                            : "#"
                        }
                        className="text-lg font-semibold hover:underline text-secondary-foreground"
                      >
                        {bet.marketQuestion || "Unknown market"}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {bet.marketCategory} • Probability at entry{" "}
                        {bet.probability}%
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
            <Card className="p-6 border border-muted-foreground/20 bg-secondary shadow-sm">
              {stats.calibrationBuckets.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Need more resolved bets to compute calibration.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {stats.calibrationBuckets.map((bucket) => (
                    <div
                      key={bucket.bucket}
                      className="rounded-xl border border-muted-foreground/20 p-4 bg-secondary shadow-sm"
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
                      <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
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
            <Card className="p-6 border border-muted-foreground/20 bg-secondary shadow-sm">
              {stats.sectorSpecialization.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No sector data yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {stats.sectorSpecialization.map((sector) => (
                    <div
                      key={sector.category}
                      className="flex items-center justify-between border-b border-border/50 pb-4 last:border-none last:pb-0"
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
    <Card className="p-5 space-y-2 border border-muted-foreground/20 bg-secondary shadow-sm">
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
