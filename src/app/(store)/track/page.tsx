import React, { Suspense } from "react";
import { TrackOrderView } from "./TrackOrderView";

export const metadata = {
  title: "Track Order Status — Pandian Store",
  description: "Check preparation, packing and delivery status of your grocery order.",
};

export default function TrackPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-ink-muted">Loading tracking...</div>}>
      <TrackOrderView />
    </Suspense>
  );
}

