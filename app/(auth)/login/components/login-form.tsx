"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QuickLoginChips } from "./quick-login-chips";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "";

  const [email, setEmail] = useState("superadmin@example.com");
  const [password, setPassword] = useState("1234");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
        setIsLoading(false);
        return;
      }

      if (callbackUrl) {
        router.push(callbackUrl);
      } else {
        router.refresh();
        router.push("/super-admin");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  }

  function handleSelectRole(roleEmail: string) {
    setEmail(roleEmail);
    setPassword("1234");
    setError("");
  }

  return (
    <div className="flex flex-col" suppressHydrationWarning>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Email Field */}
        <div className="space-y-1.5">
          <Label
            htmlFor="email"
            className="text-xs font-medium text-slate-700 dark:text-slate-300"
          >
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="superadmin@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-10 rounded-lg border-0 bg-[#eef4ff] px-3.5 text-sm text-slate-900 shadow-none transition-all placeholder:text-slate-400 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#584ED2] dark:bg-slate-900/60 dark:text-slate-100"
          />
        </div>

        {/* Password Field */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label
              htmlFor="password"
              className="text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Password
            </Label>
            <Link
              href="/forgot-password"
              className="text-xs font-normal text-[#584ED2] transition-colors hover:underline"
            >
              Forgot Your Password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="h-10 rounded-lg border-0 bg-[#eef4ff] px-3.5 text-sm text-slate-900 shadow-none transition-all placeholder:text-slate-400 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#584ED2] dark:bg-slate-900/60 dark:text-slate-100"
          />
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isLoading}
          className="mt-1 h-10 w-full rounded-lg bg-[#584ED2] text-sm font-medium text-white shadow-xs transition-colors hover:bg-[#493ebd] cursor-pointer"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              <span>Logging in...</span>
            </div>
          ) : (
            "Login"
          )}
        </Button>

        {/* Register Link */}
        <div className="text-center text-xs text-slate-500 dark:text-slate-400">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-medium text-[#584ED2] transition-colors hover:underline"
          >
            Register
          </Link>
        </div>
      </form>

      {/* Quick Demo Credentials */}
      <QuickLoginChips onSelectRole={handleSelectRole} />
    </div>
  );
}
