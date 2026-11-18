"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { MicButton } from "./MicButton";
import { copy } from "@/lib/copy";

export function HomeSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/admin/items?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <input
        type="text"
        name="q"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={copy.admin.home.searchPlaceholder.en}
        className="w-full h-14 pl-12 pr-12 rounded-2xl bg-surface border-2 border-border text-base text-ink placeholder:text-muted focus:outline-none focus:border-leaf focus:ring-4 focus:ring-leaf-light transition-all shadow-xs"
      />
      <MagnifyingGlass
        size={22}
        className="absolute left-4 top-4 text-muted pointer-events-none"
      />
      <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
        <MicButton
          onResult={(text) => {
            setQuery(text);
            router.push(`/admin/items?q=${encodeURIComponent(text.trim())}`);
          }}
        />
      </div>
    </form>
  );
}

