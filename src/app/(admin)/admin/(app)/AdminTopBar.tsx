"use client";

import React, { useState, useEffect } from "react";
import { signOut } from "next-auth/react";
import {
  MagnifyingGlass,
  Eye,
  EyeSlash,
  SignOut,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

interface AdminTopBarProps {
  userEmail?: string | null;
}

export function AdminTopBar({ userEmail }: AdminTopBarProps) {
  const [privacyMode, setPrivacyMode] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    // Read privacy mode from localStorage
    const saved = localStorage.getItem("pandian-privacy-mode");
    if (saved === "true") {
      setPrivacyMode(true);
      document.documentElement.classList.add("privacy-masked");
    }
  }, []);

  const togglePrivacyMode = () => {
    const next = !privacyMode;
    setPrivacyMode(next);
    localStorage.setItem("pandian-privacy-mode", String(next));
    if (next) {
      document.documentElement.classList.add("privacy-masked");
    } else {
      document.documentElement.classList.remove("privacy-masked");
    }
    // Dispatch custom window event so any listening UI can re-render if needed
    window.dispatchEvent(new Event("pandian-privacy-change"));
  };

  return (
    <header className="sticky top-0 z-30 bg-surface border-b border-border px-4 py-2.5 flex items-center justify-between gap-3 shadow-xs">
      {/* Global Search (Section 10) */}
      <div className="flex-1 max-w-md">
        <form action="/admin/search" method="GET" className="relative w-full">
          <input
            type="text"
            name="q"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search stores, products, bills, orders..."
            className="w-full h-10 pl-9 pr-3 rounded-md bg-page border border-border text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-leaf focus:bg-surface transition-all"
          />
          <MagnifyingGlass
            size={16}
            className="absolute left-3 top-3 text-muted pointer-events-none"
          />
        </form>
      </div>

      {/* Right controls: Privacy Mode + Logout */}
      <div className="flex items-center gap-2">
        {/* Privacy Mode Toggle (Section 10) */}
        <Button
          type="button"
          variant={privacyMode ? "turmeric" : "outline"}
          size="sm"
          onClick={togglePrivacyMode}
          title={privacyMode ? "Turn off privacy mode" : "Turn on privacy mode to mask wholesale costs"}
          className="flex items-center gap-1.5 text-xs h-9 min-h-[36px]"
        >
          {privacyMode ? (
            <>
              <EyeSlash size={16} weight="bold" />
              <span className="hidden sm:inline">Costs masked</span>
            </>
          ) : (
            <>
              <Eye size={16} />
              <span className="hidden sm:inline">Privacy mode</span>
            </>
          )}
        </Button>

        {/* Logout */}
        <Button
          type="button"
          variant="ghost"
          size="iconSm"
          onClick={() => signOut({ callbackUrl: "/admin/login" })}
          title={`Log out (${userEmail || "Owner"})`}
          className="text-muted hover:text-red hover:bg-red-light"
        >
          <SignOut size={18} />
          <span className="sr-only">Log out</span>
        </Button>
      </div>
    </header>
  );
}

