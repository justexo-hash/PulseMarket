"use client";

import { useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useMarketSearchContext } from "../_context/MarketSearchContext";

export function MarketSearchBar() {
  const { searchQuery, setSearchQuery, categories, markets } =
    useMarketSearchContext();

  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

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

  const filteredResults = searchQuery.trim().length
    ? markets.filter((m) =>
        m.question.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <div ref={wrapperRef} className="relative md:min-w-[600px]">
      {/* SEARCHBAR (STATIC, ALWAYS VISIBLE) */}
      <div className="relative w-full" onClick={() => setOpen(true)}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary  outline-none pointer-events-none" />
        <Input
          type="text"
          placeholder="Search markets..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setOpen(true);
          }}
          className={
            "pl-9 text-primary  w-full  bg-secondary cursor-pointer outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none " +
            (open
              ? "bg-background rounded-t-md rounded-b-none border border-muted-foreground/20"
              : "rounded-md")
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
          {searchQuery.trim().length > 0 && (
            <div className="flex flex-col gap-2 py-2 border-b">
              <p className="text-xs font-medium px-3 text-muted-foreground uppercase">
                Results
              </p>

              {filteredResults.length > 0 ? (
                <div className="fflex flex-col gap-2 p-4 border-b border-muted-foreground/20">
                  {filteredResults.map((m) => (
                    <Link
                      key={m.id}
                      href={`/markets/${m.id}`}
                      onClick={() => setOpen(false)}
                      className="
                      w-full flex items-center gap-3 px-4 py-2 
                      hover:bg-background border border-transparent font-medium text-primary 
                    
                      "
                    >
                      <img
                        src={m.image || "/placeholder.png"}
                        alt={m.question}
                        className="w-10 h-10 rounded-sm object-cover"
                        onError={(e) => {
                          e.currentTarget.src = "/placeholder.png";
                        }}
                      />

                      <div className="flex flex-col flex-1">
                        <span>{m.question}</span>
                      </div>

                      <span className="text-md font-medium text-primary ">
                        {Math.round(m.probability)}%
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic pl-3">
                  No results for “{searchQuery}”
                </p>
              )}
            </div>
          )}

          {/* TOPICS SECTION */}
          {searchQuery.trim().length === 0 && (
            <div className="flex flex-col gap-2 p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase">
                Topics
              </p>

              <div className="grid grid-cols-1 gap-2">
                {categories.map((cat) => (
                  <Link
                    key={cat}
                    href={`/category/${encodeURIComponent(cat)}`}
                    onClick={() => setOpen(false)}
                    className="
                      w-full flex items-center gap-3 px-4 py-2 
                      hover:bg-background border border-transparent
                    "
                  >
                    <span className="capitalize">{cat}</span>
                    <span className="text-muted-foreground text-xs">
                      View →
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
          {/* BROWSE SECTION */}
          {searchQuery.trim().length === 0 && (
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
                    className="
                      w-full flex items-center gap-3 px-4 py-2 
                      border border-transparent
                    "
                  >
                    <span className="font-medium">{item.name}</span>
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
