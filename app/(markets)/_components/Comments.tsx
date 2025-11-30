"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/lib/auth";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface CommentsProps {
  slug: string;
}

interface CommentPayload {
  id: number;
  content: string;
  createdAt: string;
  user: {
    id: number;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    activePosition?: "yes" | "no" | null;
  };
}

export default function Comments({ slug }: CommentsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");

  const {
    data,
    isLoading,
    isError,
  } = useQuery<{ comments: CommentPayload[] }>({
    queryKey: ["market-comments", slug],
    queryFn: async () => {
      const response = await fetch(`/api/markets/${encodeURIComponent(slug)}/comments`);
      if (!response.ok) {
        throw new Error("Failed to load comments");
      }
      return response.json();
    },
  });

  const comments = data?.comments ?? [];

  const { mutateAsync: postComment, isPending } = useMutation({
    mutationFn: async (payload: { content: string }) => {
      const response = await fetch(`/api/markets/${encodeURIComponent(slug)}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Failed to post comment");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["market-comments", slug] });
      setContent("");
    },
    onError: (error: any) => {
      toast({
        title: "Unable to post comment",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast({
        title: "Comment is empty",
        variant: "destructive",
      });
      return;
    }
    await postComment({ content: content.trim() });
  };

  return (
    <section className="w-full rounded-xl p-6 flex flex-col gap-6 bg-secondary/30 border border-muted-foreground/20">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Comments</h2>
        <span className="text-xs text-muted-foreground">{comments.length} total</span>
      </div>

      <div>
        <Textarea
          className="w-full rounded-lg p-3 text-sm bg-background border border-muted-foreground/20"
          rows={3}
          placeholder={user ? "Share your thoughts..." : "Sign in to comment"}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={!user || isPending}
        />
        <div className="flex justify-between mt-2 items-center">
          {!user && <p className="text-sm text-muted-foreground">Connect your wallet to join the discussion.</p>}
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!user || !content.trim() || isPending}
          >
            {isPending ? "Posting..." : "Post"}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {isLoading && <p className="text-sm text-muted-foreground">Loading comments...</p>}
        {isError && (
          <p className="text-sm text-destructive">Failed to load comments. Try again later.</p>
        )}
        {!isLoading && comments.length === 0 && (
          <div className="p-4 rounded-lg bg-background text-center border border-muted-foreground/10">
            <p className="text-sm text-muted-foreground">No comments yet. Be the first!</p>
          </div>
        )}

        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-3 p-4 rounded-lg bg-background border border-muted-foreground/10">
            <Avatar className="h-10 w-10">
              {comment.user.avatarUrl ? (
                <AvatarImage src={comment.user.avatarUrl} alt={comment.user.username} />
              ) : (
                <AvatarFallback>
                  {(comment.user.displayName || comment.user.username)
                    .slice(0, 2)
                    .toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex flex-col flex-1 gap-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  href={`/profile/${comment.user.username}`}
                  className="text-sm font-semibold hover:underline text-secondary-foreground"
                >
                  {comment.user.displayName || comment.user.username}
                </Link>
                <span className="text-xs text-muted-foreground">@{comment.user.username}</span>
                {comment.user.activePosition && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      comment.user.activePosition === "yes"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-red-500/10 text-red-400"
                    }`}
                  >
                    {comment.user.activePosition.toUpperCase()} bet
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                </span>
              </div>
              <p className="text-sm text-secondary-foreground">{comment.content}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
