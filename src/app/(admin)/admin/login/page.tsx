"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { LockKey, EnvelopeSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { copy } from "@/lib/copy";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError("Invalid email or password. Please verify your credentials.");
      } else {
        router.push("/admin");
        router.refresh();
      }
    } catch {
      setError("An unexpected error occurred during sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4 bg-page">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            {copy.shop.name}
          </h1>
          <p className="text-xs text-muted font-tamil mt-0.5">பாண்டியன் ஸ்டோர் — உரிமையாளர் உள்நுழைவு</p>
          <p className="text-xs text-muted mt-1">Owner Administration Portal</p>
        </div>

        <Card className="border border-border shadow-xs">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg">Log in to your store</CardTitle>
            <CardDescription>
              Enter your email and password to manage purchases, stock, and customer orders.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div
                  role="alert"
                  className="p-3 text-xs rounded-md bg-red-light text-red border border-[#FAD2CF] font-medium"
                >
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink flex items-center gap-1.5">
                  <EnvelopeSimple size={14} className="text-muted" />
                  <span>Email address</span>
                </label>
                <Input
                  type="email"
                  required
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="owner@pandianstore.local"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink flex items-center gap-1.5">
                  <LockKey size={14} className="text-muted" />
                  <span>Password</span>
                </label>
                <Input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                />
              </div>

              <Button
                type="submit"
                variant="default"
                className="w-full mt-2 font-semibold"
                disabled={loading}
              >
                {loading ? "Checking credentials..." : "Log in to store"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted mt-6">
          Confidential & Protected · Pandian Store MVP 1.0
        </p>
      </div>
    </div>
  );
}
