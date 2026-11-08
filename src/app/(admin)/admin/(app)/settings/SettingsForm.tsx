"use client";

import React, { useState } from "react";
import { updateShopSettings, changeOwnerPassword } from "@/server/admin/settings";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

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
  const [form, setForm] = useState({
    shopName: initialSettings.shopName,
    tagline: initialSettings.tagline || "",
    phone: initialSettings.phone,
    whatsapp: initialSettings.whatsapp || "",
    addressLine: initialSettings.addressLine,
    area: initialSettings.area,
    city: initialSettings.city,
    pincode: initialSettings.pincode,
    hoursText: initialSettings.hoursText,
    deliveryEnabled: initialSettings.deliveryEnabled,
    pickupEnabled: initialSettings.pickupEnabled,
    deliveryNote: initialSettings.deliveryNote || "",
    minOrderAmount: initialSettings.minOrderAmount,
    deliveryFee: initialSettings.deliveryFee,
    freeDeliveryAbove: initialSettings.freeDeliveryAbove ?? "",
    acceptingOrders: initialSettings.acceptingOrders,
    roundingMode: initialSettings.roundingMode,
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Password change state
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
        ...form,
        minOrderAmount: Number(form.minOrderAmount),
        deliveryFee: Number(form.deliveryFee),
        freeDeliveryAbove: form.freeDeliveryAbove !== "" ? Number(form.freeDeliveryAbove) : null,
      });
      setMessage({ type: "success", text: "Settings saved successfully." });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save settings.";
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {message && (
        <div
          role="alert"
          className={`p-3.5 rounded-md text-xs font-semibold border ${
            message.type === "success"
              ? "bg-leaf-light text-leaf border-[#D5E3DA]"
              : "bg-red-light text-red border-[#FAD2CF]"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* 1. Shop Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Shop profile</CardTitle>
          <CardDescription>
            These details appear on your storefront header, footer, and printable order slips.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">Shop name *</label>
              <Input
                required
                value={form.shopName}
                onChange={(e) => setForm({ ...form, shopName: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">Tagline</label>
              <Input
                value={form.tagline}
                onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                placeholder="Fresh groceries for your family"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">Phone number *</label>
              <Input
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">WhatsApp number</label>
              <Input
                value={form.whatsapp}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                placeholder="+91 90000 00000"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink">Street address *</label>
            <Input
              required
              value={form.addressLine}
              onChange={(e) => setForm({ ...form, addressLine: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">Area / Locality *</label>
              <Input
                required
                value={form.area}
                onChange={(e) => setForm({ ...form, area: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">City *</label>
              <Input
                required
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">Pincode *</label>
              <Input
                required
                maxLength={6}
                value={form.pincode}
                onChange={(e) => setForm({ ...form, pincode: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink">Opening hours text *</label>
            <Input
              required
              value={form.hoursText}
              onChange={(e) => setForm({ ...form, hoursText: e.target.value })}
              placeholder="Monday – Sunday: 7:00 AM – 9:30 PM"
            />
          </div>
        </CardContent>
      </Card>

      {/* 2. Order Acceptance & Fulfilment */}
      <Card>
        <CardHeader>
          <CardTitle>Orders & Fulfilment</CardTitle>
          <CardDescription>
            Control customer order requests and delivery parameters.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-3 p-3 bg-page rounded-md border border-border">
            <Checkbox
              id="acceptingOrders"
              checked={form.acceptingOrders}
              onCheckedChange={(checked) => setForm({ ...form, acceptingOrders: !!checked })}
            />
            <label htmlFor="acceptingOrders" className="text-sm font-semibold text-ink cursor-pointer">
              Accept customer order requests on storefront
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center space-x-3 p-3 bg-surface rounded-md border border-border">
              <Checkbox
                id="deliveryEnabled"
                checked={form.deliveryEnabled}
                onCheckedChange={(checked) => setForm({ ...form, deliveryEnabled: !!checked })}
              />
              <label htmlFor="deliveryEnabled" className="text-sm font-medium text-ink cursor-pointer">
                Enable Home Delivery
              </label>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-surface rounded-md border border-border">
              <Checkbox
                id="pickupEnabled"
                checked={form.pickupEnabled}
                onCheckedChange={(checked) => setForm({ ...form, pickupEnabled: !!checked })}
              />
              <label htmlFor="pickupEnabled" className="text-sm font-medium text-ink cursor-pointer">
                Enable Shop Pickup
              </label>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink">Delivery note</label>
            <Input
              value={form.deliveryNote}
              onChange={(e) => setForm({ ...form, deliveryNote: e.target.value })}
              placeholder="We deliver within 3 km of the shop."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">Minimum order (₹)</label>
              <Input
                type="number"
                min={0}
                value={form.minOrderAmount}
                onChange={(e) => setForm({ ...form, minOrderAmount: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">Delivery fee (₹)</label>
              <Input
                type="number"
                min={0}
                value={form.deliveryFee}
                onChange={(e) => setForm({ ...form, deliveryFee: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">Free delivery above (₹)</label>
              <Input
                type="number"
                min={0}
                value={form.freeDeliveryAbove}
                onChange={(e) => setForm({ ...form, freeDeliveryAbove: e.target.value })}
                placeholder="Optional threshold"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Pricing & Rounding Rule */}
      <Card>
        <CardHeader>
          <CardTitle>Pricing engine rounding</CardTitle>
          <CardDescription>
            Choose how suggested prices are rounded when calculating markup from wholesale cost.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5 max-w-sm">
            <label className="text-xs font-semibold text-ink">Price rounding mode</label>
            <Select
              value={form.roundingMode}
              onValueChange={(val: "NONE" | "NEAREST_HALF" | "NEAREST_1" | "UP_1") =>
                setForm({ ...form, roundingMode: val })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UP_1">Round up to next whole rupee (e.g. ₹61.20 → ₹62.00)</SelectItem>
                <SelectItem value="NEAREST_1">Round to nearest whole rupee (e.g. ₹61.40 → ₹61.00)</SelectItem>
                <SelectItem value="NEAREST_HALF">Round to nearest 50 paise (e.g. ₹61.20 → ₹61.50)</SelectItem>
                <SelectItem value="NONE">Exact 2 decimals (no whole rupee rounding)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 4. Security & Account */}
      <Card>
        <CardHeader>
          <CardTitle>Owner security</CardTitle>
          <CardDescription>
            Update your owner login password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="outline"
            onClick={() => setPasswordModalOpen(true)}
          >
            Change owner password
          </Button>
        </CardContent>
      </Card>

      {/* Sticky Save Bar */}
      <div className="sticky bottom-0 bg-surface/95 backdrop-blur-xs p-4 -mx-4 -mb-4 sm:mx-0 sm:mb-0 border-t sm:border border-border sm:rounded-lg flex items-center justify-between shadow-xs">
        <span className="text-xs text-muted">All changes update storefront immediately.</span>
        <Button type="submit" variant="turmeric" disabled={saving} className="font-semibold px-6">
          {saving ? "Saving..." : "Save settings"}
        </Button>
      </div>

      {/* Change Password Dialog */}
      <Dialog open={passwordModalOpen} onOpenChange={setPasswordModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change owner password</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePasswordSubmit} className="space-y-4 py-2">
            {passwordError && (
              <div className="p-2.5 rounded bg-red-light text-red text-xs font-medium border border-[#FAD2CF]">
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="p-2.5 rounded bg-leaf-light text-leaf text-xs font-medium border border-[#D5E3DA]">
                Password updated successfully!
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink">Current password *</label>
              <Input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink">New password (min 8 characters) *</label>
              <Input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink">Confirm new password *</label>
              <Input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPasswordModalOpen(false)}
                disabled={changingPassword}
              >
                Cancel
              </Button>
              <Button type="submit" variant="default" disabled={changingPassword}>
                {changingPassword ? "Updating..." : "Update password"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </form>
  );
}
