"use client";

import React, { useState, useTransition } from "react";
import { toggleAcceptingOrders } from "@/server/admin/settings";
import { useLang } from "@/context/LanguageContext";
import { copy } from "@/lib/copy";

interface TakingOrdersToggleProps {
  initialAccepting: boolean;
}

export function TakingOrdersToggle({ initialAccepting }: TakingOrdersToggleProps) {
  const [accepting, setAccepting] = useState(initialAccepting);
  const [isPending, startTransition] = useTransition();
  const { mode } = useLang();

  const handleToggle = () => {
    const next = !accepting;
    setAccepting(next);
    startTransition(async () => {
      try {
        const res = await toggleAcceptingOrders(next);
        if (res?.acceptingOrders !== undefined) {
          setAccepting(res.acceptingOrders);
        }
      } catch (err) {
        // revert on failure
        setAccepting(!next);
      }
    });
  };

  const labelEn = accepting ? copy.admin.home.takingOrders.en : copy.admin.home.pausedOrders.en;
  const labelTa = accepting ? copy.admin.home.takingOrders.ta : copy.admin.home.pausedOrders.ta;

  return (
    <div className="flex items-center justify-between p-3.5 bg-surface border border-border rounded-xl shadow-xs">
      <div className="flex items-center gap-3">
        <span className="relative flex h-3 w-3">
          {accepting && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          )}
          <span
            className={`relative inline-flex rounded-full h-3 w-3 ${
              accepting ? "bg-emerald-500" : "bg-amber-500"
            }`}
          />
        </span>
        <div>
          <p className="text-sm font-bold text-ink">
            {mode === "ta" ? labelTa : labelEn}
          </p>
          {mode === "both" && (
            <p className="text-xs text-muted font-tamil leading-tight">{labelTa}</p>
          )}
        </div>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={accepting}
        disabled={isPending}
        onClick={handleToggle}
        aria-label="Toggle accepting online orders"
        className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-leaf focus:ring-offset-2 ${
          accepting ? "bg-leaf" : "bg-stone-300"
        } ${isPending ? "opacity-50 cursor-wait" : ""}`}
      >
        <span
          className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
            accepting ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

