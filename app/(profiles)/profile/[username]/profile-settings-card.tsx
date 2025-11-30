"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface ProfileSettingsCardProps {
  user: {
    username: string;
    displayName: string;
    bio: string | null;
    avatarUrl: string | null;
  };
}

export function ProfileSettingsCard({ user }: ProfileSettingsCardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [username, setUsername] = useState(user.username);
  const [displayName, setDisplayName] = useState(user.displayName);
  const [bio, setBio] = useState(user.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      const response = await fetch("/api/profiles/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          displayName,
          bio,
          avatarUrl,
        }),
      });

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error || "Unable to update profile");
      }

      toast({
        title: "Profile Updated",
        description: "Your changes have been saved successfully.",
      });
      router.refresh();
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error?.message || "Unable to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="p-6 border border-white/10 bg-background/70 backdrop-blur">
      <div className="flex flex-col gap-2 mb-6">
        <h2 className="text-2xl font-bold text-secondary-foreground">
          Profile Settings
        </h2>
        <p className="text-sm text-muted-foreground">
          Update your public information. Usernames are unique and lowercase.
        </p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-[220px_1fr]">
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/5 bg-muted/20 p-4">
            <div className="relative h-32 w-32 overflow-hidden rounded-full border border-white/10">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={displayName}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-secondary text-3xl font-semibold text-background">
                  {displayName.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <Input
              type="url"
              placeholder="https://example.com/avatar.png"
              value={avatarUrl}
              onChange={(event) => setAvatarUrl(event.target.value)}
            />
            <p className="text-xs text-muted-foreground text-center">
              Paste an image URL. For uploads, host the file and paste the link here.
            </p>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                maxLength={50}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(event) => setUsername(event.target.value.toLowerCase())}
                maxLength={32}
                required
              />
              <p className="text-xs text-muted-foreground">
                Lowercase letters, numbers, periods, underscores, and dashes only.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                rows={4}
                maxLength={280}
                placeholder="Share a short description about your forecasting style."
              />
              <p className="text-xs text-muted-foreground text-right">
                {bio.length}/280
              </p>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </Card>
  );
}


