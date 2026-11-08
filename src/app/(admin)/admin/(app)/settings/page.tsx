import React from "react";
import { getShopSettings } from "@/server/admin/settings";
import { SettingsForm } from "./SettingsForm";

export default async function AdminSettingsPage() {
  const settings = await getShopSettings();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
          Shop settings
        </h1>
        <p className="text-xs text-muted">
          Configure your shop details, delivery charges, operating hours, and login password.
        </p>
      </div>

      <SettingsForm initialSettings={settings} />
    </div>
  );
}
