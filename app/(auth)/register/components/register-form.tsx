"use client";

import { useState, useRef } from "react";
import { RecaptchaWidget, type RecaptchaWidgetRef } from "@/components/common/recaptcha-widget";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import {
  IconAlertCircle,
  IconBuildingStore,
  IconCheck,
  IconGift,
  IconLoader2,
  IconLock,
  IconMail,
  IconPhone,
  IconUser,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { registerCompanyAction } from "@/actions/auth";

export function RegisterForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNo, setMobileNo] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<RecaptchaWidgetRef>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    // Client-side validations
    if (!name.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!businessName.trim()) {
      setError("Please enter your business or company name.");
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please re-check.");
      return;
    }

    setIsLoading(true);

    try {
      // 1. Invoke atomic provisioning Server Action
      const token = await recaptchaRef.current?.execute("register");
      const activeToken = token || recaptchaToken || undefined;

      const result = await registerCompanyAction({
        name: name.trim(),
        businessName: businessName.trim(),
        email: email.toLowerCase().trim(),
        password,
        mobileNo: mobileNo.trim() || undefined,
        recaptchaToken: activeToken,
      });

      if (!result.success) {
        setError(result.error || "Registration failed. Please try again.");
        recaptchaRef.current?.reset();
        setRecaptchaToken(null);
        setIsLoading(false);
        return;
      }

      setSuccessMessage(
        result.message || "Account created successfully! Logging you in..."
      );
      toast.success("Welcome to BookingGo! Account registered successfully.");

      // 2. Auto Sign-in with credentials
      try {
        const signInResult = await signIn("credentials", {
          email: email.toLowerCase().trim(),
          password,
          redirect: false,
        });

        if (signInResult?.ok) {
          router.refresh();
          router.push("/dashboard");
        } else {
          // Fallback to login page with registered query flag
          router.push("/login?registered=true");
        }
      } catch {
        router.push("/login?registered=true");
      }
    } catch {
      setError("An unexpected error occurred during registration. Please try again.");
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col" suppressHydrationWarning>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
            <IconAlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400">
            <IconCheck className="size-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Full Name & Business Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label
              htmlFor="name"
              className="text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Full Name <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="name"
                type="text"
                placeholder="Sarah Connor"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-9.5 rounded-lg border-0 bg-[#eef4ff] px-3 text-xs text-slate-900 shadow-none placeholder:text-slate-400 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#584ED2] dark:bg-slate-900/60 dark:text-slate-100"
              />
              <IconUser className="size-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1">
            <Label
              htmlFor="businessName"
              className="text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Business Name <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="businessName"
                type="text"
                placeholder="Apex Salon & Spa"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                required
                className="h-9.5 rounded-lg border-0 bg-[#eef4ff] px-3 text-xs text-slate-900 shadow-none placeholder:text-slate-400 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#584ED2] dark:bg-slate-900/60 dark:text-slate-100"
              />
              <IconBuildingStore className="size-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Email & Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label
              htmlFor="email"
              className="text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Work Email <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="email"
                type="email"
                placeholder="owner@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-9.5 rounded-lg border-0 bg-[#eef4ff] px-3 text-xs text-slate-900 shadow-none placeholder:text-slate-400 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#584ED2] dark:bg-slate-900/60 dark:text-slate-100"
              />
              <IconMail className="size-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1">
            <Label
              htmlFor="mobileNo"
              className="text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Phone Number <span className="text-[10px] text-muted-foreground">(Optional)</span>
            </Label>
            <div className="relative">
              <Input
                id="mobileNo"
                type="tel"
                placeholder="+1 555-0199"
                value={mobileNo}
                onChange={(e) => setMobileNo(e.target.value)}
                className="h-9.5 rounded-lg border-0 bg-[#eef4ff] px-3 text-xs text-slate-900 shadow-none placeholder:text-slate-400 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#584ED2] dark:bg-slate-900/60 dark:text-slate-100"
              />
              <IconPhone className="size-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Password & Confirm Password */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label
              htmlFor="password"
              className="text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Password <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-9.5 rounded-lg border-0 bg-[#eef4ff] px-3 text-xs text-slate-900 shadow-none placeholder:text-slate-400 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#584ED2] dark:bg-slate-900/60 dark:text-slate-100"
              />
              <IconLock className="size-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1">
            <Label
              htmlFor="confirmPassword"
              className="text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Confirm Password <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="h-9.5 rounded-lg border-0 bg-[#eef4ff] px-3 text-xs text-slate-900 shadow-none placeholder:text-slate-400 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#584ED2] dark:bg-slate-900/60 dark:text-slate-100"
              />
              <IconLock className="size-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Micro-Callout Free Plan Banner */}
        <div className="flex items-start gap-2.5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
          <IconGift className="size-4 shrink-0 text-[#584ED2] mt-0.5" />
          <p className="text-[11px]">
            <strong className="text-[#584ED2] font-semibold">Free Plan Included:</strong>{" "}
            You will be automatically enrolled in our starter Free Plan with standard business hours, appointment scheduling, and customer CRM tools. No credit card required.
          </p>
        </div>

        {/* Google reCAPTCHA Protection */}
        <RecaptchaWidget
          ref={recaptchaRef}
          action="register"
          onChange={setRecaptchaToken}
          className="my-1"
        />

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isLoading}
          className="mt-1 h-10 w-full rounded-lg bg-[#584ED2] text-xs sm:text-sm font-semibold text-white shadow-xs transition-colors hover:bg-[#493ebd] cursor-pointer"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <IconLoader2 className="size-4 animate-spin" />
              <span>Creating your company account...</span>
            </div>
          ) : (
            "Create Account & Start Free"
          )}
        </Button>

        {/* Log In Link */}
        <div className="text-center text-xs text-slate-500 dark:text-slate-400 pt-1">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-[#584ED2] transition-colors hover:underline"
          >
            Log in
          </Link>
        </div>
      </form>
    </div>
  );
}
