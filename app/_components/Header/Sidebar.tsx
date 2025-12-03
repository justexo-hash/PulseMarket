"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useMediaQuery } from "app/(markets)/_hooks/useMediaQuery";
import { Home, User, Expand, Minimize, ChartArea, Plus, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";

export default function Sidebar() {
  const isDesktop = useMediaQuery("(min-width: 1280px)");
  const [expanded, setExpanded] = useState(false);
  const { user } = useAuth();

  if (!isDesktop) return null;
  const isAdmin = !!user?.isAdmin;

  return (
    <motion.nav
      animate={{ width: expanded ? 192 : 64 }}
      transition={{ duration: 0.01, ease: "easeIn" }}
      className={`
        sticky top-0 max-h-screen pt-[1.5rem] px-[1rem] border-r border-border
        transition-all duration-300 ease-in-out flex flex-col items-center
        ${expanded ? "w-48" : "w-auto"}
        group
      `}
    >
        <Link href="/">
      <img src="/logo-white.png" className="w-8 h-8" alt="" />
        </Link>
      <Button
        variant="sidebar"
        size="lg"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-center p-2 rounded-md hover:bg-muted transition"
      >
        <span className="text-xs">{!expanded ? <Expand /> : <Minimize />}</span>
      </Button>
      <div className="pt-[3rem]">
        <div className="flex flex-col items-center gap-3">
          <Link href="/" className="">
            <Button
              variant="sidebar"
              size="lg"
              className="flex items-center justify-center p-2 rounded-md hover:bg-muted transition"
            >
              <Home className="!w-8 !h-6" />
              {expanded && (
                <span
                  className={`
            text-sm transition-opacity duration-300
            `}
                >
                  Home
                </span>
              )}
            </Button>
          </Link>
          {user && (
            <Link href={`/profile/${user.username}`} className="">
              <Button
                variant="sidebar"
                size="lg"
                className="flex items-center justify-center p-2 rounded-md hover:bg-muted transition"
              >
                <User className="!w-8 !h-6" />
                {expanded && (
                  <span
                    className={`
                    text-sm transition-opacity duration-300
                    `}
                  >
                    Profile
                  </span>
                )}
              </Button>
            </Link>
          )}
          <Link href="/activity" className="">
            <Button
              variant="sidebar"
              size="lg"
              className="flex items-center justify-center p-2 rounded-md hover:bg-muted transition"
            >
              <ChartArea className="!w-8 !h-6" />
              {expanded && (
                <span
                  className={`
            text-sm transition-opacity duration-300
            `}
                >
                  Activity
                </span>
              )}
            </Button>
          </Link>
          <Link href="/blog" className="">
            <Button
              variant="sidebar"
              size="lg"
              className="flex items-center justify-center p-2 rounded-md hover:bg-muted transition"
            >
              <MessageCircle className="!w-8 !h-6" />
              {expanded && (
                <span
                  className={`
            text-sm transition-opacity duration-300
            `}
                >
                  Blog
                </span>
              )}
            </Button>
          </Link>
          {user && (
            <Link href="/create">
            <Button className="flex items-center justify-center rounded-md hover:bg-muted transition">
              <Plus />
            </Button>
            </Link>
          )}
        </div>
      </div>
    </motion.nav>
  );
}
