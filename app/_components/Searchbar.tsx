"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useMarketSearchContext } from "app/(markets)/_context/MarketSearchContext";

type SearchMode = "markets" | "users";

interface ProfileSearchResult {
  id: number;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
}

export function MarketSearchBar() {
  const { searchQuery, setSearchQuery, categories, markets } =
    useMarketSearchContext();

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<SearchMode>("markets");
  const [userResults, setUserResults] = useState<ProfileSearchResult[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const trimmedQuery = searchQuery.trim();

  useEffect(() => {
    if (mode !== "users" || trimmedQuery.length === 0) {
      abortRef.current?.abort();
      abortRef.current = null;
      setUserResults([]);
      setUsersLoading(false);
      setUserError(null);
      return;
    }

    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;

    const fetchUsers = async () => {
      setUsersLoading(true);
      setUserError(null);
      try {
        const response = await fetch(
          `/api/profiles/search?q=${encodeURIComponent(trimmedQuery)}&limit=6`,
          { signal: controller.signal }
        );
        if (!response.ok) {
          throw new Error("Failed to search users");
        }
        const data = await response.json();
        setUserResults(data.users ?? []);
      } catch (error: any) {
        if (error?.name === "AbortError") {
          return;
        }
        setUserError(error?.message ?? "Failed to search users");
        setUserResults([]);
      } finally {
        setUsersLoading(false);
      }
    };

    void fetchUsers();

    return () => controller.abort();
  }, [mode, trimmedQuery]);

  const filteredResults = trimmedQuery.length
    ? markets.filter((m) =>
        m.question.toLowerCase().includes(trimmedQuery.toLowerCase())
      )
    : [];

  return (
    <div ref={wrapperRef} className="relative md:min-w-[400px]">
      {/* SEARCHBAR (STATIC, ALWAYS VISIBLE) */}
      <div className="relative w-full" onClick={() => setOpen(true)}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-secondary outline-none pointer-events-none" />
        <Input
          type="text"
          placeholder="Search markets or users..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setOpen(true);
          }}
          className={
            "pl-9 text-muted-secondary w-full cursor-pointer border-muted-foreground/20 outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none " +
            (open
              ? "rounded-t-md rounded-b-none text-muted-secondary border-muted-foreground/20 border "
              : "rounded-md text-muted-secondary ")
          }
        />
      </div>

      {/* DROPDOWN (ABSOLUTE, POLYMARKET STYLE) */}
      {open && (
        <div
          className="
          absolute left-0 top-full z-50 
          w-full md:min-w-[400px]
         bg-background rounded-t-none rounded-lg overflow-hidden shadow-md 
          border border-muted-foreground/20 border-t-0
        "
        >
          {/* LIVE RESULTS SECTION */}
          {trimmedQuery.length > 0 && (
            <div className="flex flex-col gap-2 border-b border-muted-foreground/20">
              <div className="flex items-center justify-between px-3 py-2">
                <p className="text-xs font-medium text-muted-foreground uppercase">
                  Search
                </p>
                <div className="inline-flex rounded-full bg-muted/30 p-1 text-xs font-semibold">
                  {(["markets", "users"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setMode(option)}
                      className={cn(
                        "px-3 py-1 rounded-full transition",
                        mode === option
                          ? "bg-background text-secondary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-secondary-foreground"
                      )}
                    >
                      {option === "markets" ? "Markets" : "Users"}
                    </button>
                  ))}
                </div>
              </div>

              {mode === "markets" ? (
                filteredResults.length > 0 ? (
                  <div className="flex flex-col gap-2 p-4 border-t border-muted-foreground/10">
                    {filteredResults.map((m) => (
                      <Link
                        key={m.id}
                        href={`/markets/${m.id}`}
                        onClick={() => setOpen(false)}
                        className="
                        w-full flex items-center gap-3 px-4 py-2 
                        hover:bg-muted/20 border border-transparent font-medium text-secondary-foreground rounded-lg transition
                      "
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={m.image || "/placeholder.png"}
                          alt={m.question}
                          className="w-10 h-10 rounded-sm object-cover"
                          onError={(e) => {
                            e.currentTarget.src = "/placeholder.png";
                          }}
                        />

                        <div className="flex flex-col flex-1 text-sm font-medium">
                          <span>{m.question}</span>
                        </div>

                        <span className="text-lg font-semibold text-secondary-foreground ">
                          {Math.round(m.probability)}%
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm font-medium text-muted-foreground italic px-4 pb-4">
                    No market results for “{searchQuery}”
                  </p>
                )
              ) : (
                <div className="flex flex-col gap-2 p-4 border-t border-muted-foreground/10">
                  {usersLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Searching users...
                    </div>
                  ) : userError ? (
                    <p className="text-sm text-destructive">{userError}</p>
                  ) : userResults.length > 0 ? (
                    userResults.map((user) => (
                      <Link
                        key={user.id}
                        href={`/profile/${user.username}`}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted/20 transition"
                      >
                        <Avatar className="h-9 w-9 border border-muted-foreground/20">
                          {user.avatarUrl ? (
                            <AvatarImage src={user.avatarUrl} alt={user.username} />
                          ) : (
                            <AvatarFallback>
                              {(user.displayName || user.username).slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-secondary-foreground">
                            {user.displayName || user.username}
                          </p>
                          <p className="text-xs text-muted-foreground">@{user.username}</p>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      No user results for “{searchQuery}”
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TOPICS SECTION */}
          {trimmedQuery.length === 0 && (
            <div className="flex flex-col gap-2 p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase">
                Topics
              </p>

              <div className="flex flex-wrap gap-3">
                {categories.map((cat) => (
                  <Link
                    key={cat}
                    href={`/market/${encodeURIComponent(cat)}`}
                    onClick={() => setOpen(false)}
                  >
                    <Badge variant="ghost">
                    <span className="capitalize text-base font-medium">{cat}</span>
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
          )}
          {/* BROWSE SECTION */}
          {trimmedQuery.length === 0 && (
            <div className="flex flex-col gap-2 p-4 border-b border-muted-foreground/20  pointer-events-none select-none">
              <p className="text-xs font-medium text-muted-foreground uppercase">
                Browse{" "}
                <span className="text-chart-3 animate-pulse">(soon)</span>
              </p>
              <div className="flex gap-2 flex-wrap opacity-15">
                {[
                  { name: "New", href: "/search?_sort=newest" },
                  { name: "Trending", href: "/search" },
                  { name: "Popular", href: "/search?_sort=volume" },
                  { name: "Liquid", href: "/search?_sort=liquidity" },
                  { name: "Ending Soon", href: "/search?_sort=ending_soon" },
                  { name: "Competitive", href: "/search?_sort=competitive" },
                ].map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    aria-disabled="true"
                  >
                     <Badge variant="ghost">

                    <span className="text-base font-medium">{item.name}</span>
                     </Badge>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
