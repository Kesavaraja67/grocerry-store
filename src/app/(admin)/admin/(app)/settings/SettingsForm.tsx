"use client";

import React, { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import {
  Storefront,
  Lock,
  SignOut,
  Check,
  WarningCircle,
  Translate,
} from "@phosphor-icons/react";
import { updateShopSettings, changeOwnerPassword } from "@/server/admin/settings";
import { useLang, type LanguageMode } from "@/context/LanguageContext";
import { copy } from "@/lib/copy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface SettingsFormProps {
  initialSettings: {
    shopName: string;
    tagline: string | null;
    phone: string;
    whatsapp: string | null;
    addressLine: string;
    area: string;
    city: string;
    pincode: string;
    hoursText: string;
    deliveryEnabled: boolean;
    pickupEnabled: boolean;
    deliveryNote: string | null;
    minOrderAmount: number;
    deliveryFee: number;
    freeDeliveryAbove: number | null;
    acceptingOrders: boolean;
    roundingMode: "NONE" | "NEAREST_HALF" | "NEAREST_1" | "UP_1";
  };
}

export function SettingsForm({ initialSettings }: SettingsFormProps) {
  const { mode, setMode } = useLang();

  const [form, setForm] = useState({
    shopName: initialSettings.shopName,
    phone: initialSettings.phone,
    whatsapp: initialSettings.whatsapp || "",
    addressLine: initialSettings.addressLine,
    area: initialSettings.area || "Town",
    city: initialSettings.city || "Madurai",
    pincode: initialSettings.pincode || "625001",
    hoursText: initialSettings.hoursText,
    deliveryEnabled: initialSettings.deliveryEnabled,
    pickupEnabled: initialSettings.pickupEnabled,
    minOrderAmount: initialSettings.minOrderAmount || 0,
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Password modal
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      await updateShopSettings({
        shopName: form.shopName,
        tagline: initialSettings.tagline,
        phone: form.phone,
        whatsapp: form.whatsapp || null,
        addressLine: form.addressLine,
        area: form.area,
        city: form.city,
        pincode: form.pincode,
        hoursText: form.hoursText,
        deliveryEnabled: form.deliveryEnabled,
        pickupEnabled: form.pickupEnabled,
        deliveryNote: initialSettings.deliveryNote,
        minOrderAmount: Number(form.minOrderAmount),
        deliveryFee: Number(initialSettings.deliveryFee),
        freeDeliveryAbove: initialSettings.freeDeliveryAbove,
        acceptingOrders: initialSettings.acceptingOrders,
        roundingMode: initialSettings.roundingMode,
      });
      setMessage({ type: "success", text: copy.admin.settings.settingsSaved.en });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : copy.errors.generic;
      setMessage({ type: "error", text: msg });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters long.");
      return;
    }

    setChangingPassword(true);
    try {
      await changeOwnerPassword(currentPassword, newPassword);
      setPasswordSuccess(true);
      setTimeout(() => {
        setPasswordModalOpen(false);
        setPasswordSuccess(false);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to change password.";
      setPasswordError(msg);
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
      {message && (
        <div
          className={`p-3.5 rounded-xl text-sm flex items-center gap-2.5 ${
            message.type === "success"
              ? "bg-leaf-light text-leaf border border-[#D5E3DA]"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.type === "success" ? <Check size={18} /> : <WarningCircle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* 1. Language Mode */}
      <section className="bg-surface border border-border rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-ink">
          <Translate size={20} weight="bold" className="text-leaf" />
          <h2 className="font-bold text-sm font-heading">
            {copy.admin.settings.languageSection.en}
          </h2>
          <span className="text-xs text-muted font-tamil">
            ({copy.admin.settings.languageSection.ta})
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { key: "both", labelEn: "Both", labelTa: "இரண்டும்" },
              { key: "ta", labelEn: "Tamil", labelTa: "தமிழ் மட்டும்" },
              { key: "en", labelEn: "English", labelTa: "English only" },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setMode(item.key as LanguageMode)}
              className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl border text-xs font-semibold min-h-[44px] transition-all ${
                mode === item.key
                  ? "bg-leaf text-white border-leaf shadow-xs"
                  : "bg-page text-ink border-border hover:bg-leaf-light"
              }`}
            >
              <span>{item.labelEn}</span>
              <span className={`text-[10px] font-tamil ${mode === item.key ? "text-white/80" : "text-muted"}`}>
                {item.labelTa}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* 2. Shop Details */}
      <section className="bg-surface border border-border rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <h2 className="font-bold text-sm text-ink font-heading border-b border-border/70 pb-2.5">
          {copy.admin.settings.shopSection.en}
        </h2>

        <div>
          <label className="block text-xs font-bold text-ink mb-1.5">
            {copy.admin.settings.shopName.en}
          </label>
          <Input
            value={form.shopName}
            onChange={(e) => setForm({ ...form, shopName: e.target.value })}
            className="h-11 bg-page"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-ink mb-1.5">
              {copy.admin.settings.phone.en}
            </label>
            <Input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="h-11 bg-page font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-ink mb-1.5">
              {copy.admin.settings.whatsapp.en}
            </label>
            <Input
              type="tel"
              value={form.whatsapp}
              onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
              placeholder="e.g. 9840012345"
              className="h-11 bg-page font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-ink mb-1.5">
            {copy.admin.settings.address.en}
          </label>
          <Input
            value={form.addressLine}
            onChange={(e) => setForm({ ...form, addressLine: e.target.value })}
            className="h-11 bg-page"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-ink mb-1.5">
            {copy.admin.settings.hours.en}
          </label>
          <Input
            value={form.hoursText}
            onChange={(e) => setForm({ ...form, hoursText: e.target.value })}
            placeholder="e.g. 7:00 AM – 9:30 PM"
            className="h-11 bg-page"
            required
          />
        </div>
      </section>

      {/* 3. Ordering Settings */}
      <section className="bg-surface border border-border rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <h2 className="font-bold text-sm text-ink font-heading border-b border-border/70 pb-2.5">
          {copy.admin.settings.orderingSection.en}
        </h2>

        <div className="space-y-3">
          <label className="flex items-center justify-between p-3 rounded-xl bg-page border border-border cursor-pointer min-h-[48px]">
            <div>
              <p className="text-sm font-semibold text-ink">
                {copy.admin.settings.deliveryOn.en}
              </p>
              <p className="text-xs text-muted">Allow customers to request home delivery</p>
            </div>
            <input
              type="checkbox"
              checked={form.deliveryEnabled}
              onChange={(e) => setForm({ ...form, deliveryEnabled: e.target.checked })}
              className="h-5 w-5 rounded border-border text-leaf focus:ring-leaf cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl bg-page border border-border cursor-pointer min-h-[48px]">
            <div>
              <p className="text-sm font-semibold text-ink">
                {copy.admin.settings.pickupOn.en}
              </p>
              <p className="text-xs text-muted">Allow customers to pack and pick up at the shop</p>
            </div>
            <input
              type="checkbox"
              checked={form.pickupEnabled}
              onChange={(e) => setForm({ ...form, pickupEnabled: e.target.checked })}
              className="h-5 w-5 rounded border-border text-leaf focus:ring-leaf cursor-pointer"
            />
          </label>
        </div>

        <div>
          <label className="block text-xs font-bold text-ink mb-1.5">
            {copy.admin.settings.minimumOrder.en} (₹)
          </label>
          <Input
            type="number"
            min="0"
            value={form.minOrderAmount}
            onChange={(e) => setForm({ ...form, minOrderAmount: Number(e.target.value) })}
            className="h-11 bg-page font-mono"
          />
        </div>
      </section>

      {/* Save Button */}
      <Button
        type="submit"
        variant="default"
        disabled={saving}
        className="w-full h-12 text-sm font-bold shadow-xs min-h-[48px]"
      >
        {saving ? "Saving..." : copy.admin.settings.saveSettings.en}
      </Button>

      {/* 4. Quick Actions: View Store, Change Password, Log Out */}
      <div className="pt-2 space-y-2.5 border-t border-border">
        <Link
          href="/"
          className="flex items-center justify-center gap-2 w-full p-3.5 rounded-xl border-2 border-border bg-surface hover:bg-leaf-light hover:border-leaf/30 text-sm font-bold text-ink transition-colors min-h-[48px]"
        >
          <Storefront size={18} weight="bold" className="text-leaf" />
          <span>{copy.admin.settings.viewStore.en}</span>
        </Link>

        <div className="grid grid-cols-2 gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={() => setPasswordModalOpen(true)}
            className="h-12 text-xs font-bold gap-2 min-h-[48px]"
          >
            <Lock size={16} />
            <span>{copy.admin.settings.changePassword.en}</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={async () => {
              await signOut({ redirect: false });
              window.location.assign("/admin/login");
            }}
            className="h-12 text-xs font-bold text-red hover:bg-red-50 hover:text-red-700 gap-2 min-h-[48px]"
          >
            <SignOut size={16} />
            <span>{copy.admin.settings.logout.en}</span>
          </Button>
        </div>
      </div>

      {/* Change Password Dialog */}
      <Dialog open={passwordModalOpen} onOpenChange={setPasswordModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{copy.admin.settings.changePassword.en}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handlePasswordSubmit} className="space-y-4 py-2">
            {passwordError && (
              <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
                {passwordError}
              </p>
            )}
            {passwordSuccess && (
              <p className="text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                Password changed successfully!
              </p>
            )}

            <div>
              <label className="block text-xs font-bold text-ink mb-1.5">
                {copy.admin.settings.currentPassword.en}
              </label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="h-11"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1.5">
                {copy.admin.settings.newPassword.en}
              </label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                className="h-11"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1.5">
                Confirm new password
              </label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="h-11"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPasswordModalOpen(false)}
                className="h-11"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="default"
                disabled={changingPassword}
                className="h-11 font-bold"
              >
                {changingPassword ? "Updating..." : "Update password"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </form>
  );
}
