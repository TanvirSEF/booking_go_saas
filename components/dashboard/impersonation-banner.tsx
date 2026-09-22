"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { IconAlertTriangle, IconDoorExit, IconLoader2, IconUserCheck } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { exitImpersonationAction } from "@/actions/impersonation";

interface ImpersonationBannerProps {
  isImpersonating?: boolean;
  originalAdminName?: string | null;
  currentCompanyName?: string | null;
}

export function ImpersonationBanner({
  isImpersonating,
  originalAdminName,
  currentCompanyName,
}: ImpersonationBannerProps) {
  const [isExiting, setIsExiting] = useState(false);

  if (!isImpersonating) {
    return null;
  }

  const handleExit = async () => {
    try {
      setIsExiting(true);
      toast.info("Restoring Super Admin session...");

      const res = await exitImpersonationAction();
      if (res.success && res.ticket) {
        const authResult = await signIn("impersonate", {
          ticket: res.ticket,
          callbackUrl: res.redirectUrl || "/super-admin/companies",
          redirect: false,
        });

        if (authResult?.error) {
          toast.error("Failed to restore Super Admin session. Please log in again.");
          setIsExiting(false);
          return;
        }

        toast.success("Successfully returned to Super Admin.");
        const targetUrl = res.redirectUrl || "/super-admin/companies";
        window.location.assign(targetUrl);
      } else {
        toast.error(res.message || res.error || "Failed to exit impersonation.");
        setIsExiting(false);
      }
    } catch (err) {
      console.error("[ImpersonationBanner] Exit error:", err);
      toast.error("Failed to exit impersonation. Please try again.");
      setIsExiting(false);
    }
  };

  return (
    <aside
      aria-label="Impersonation notice"
      className="sticky top-0 z-50 flex w-full flex-wrap items-center justify-between gap-3 border-b border-amber-500/30 bg-amber-500/15 px-4 py-2.5 text-amber-900 shadow-sm backdrop-blur-md dark:border-amber-400/25 dark:bg-amber-950/40 dark:text-amber-200"
    >
      <div className="flex min-w-0 items-center gap-2.5 text-xs sm:text-sm">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-700 dark:bg-amber-400/20 dark:text-amber-300">
          <IconAlertTriangle className="size-4" />
        </span>
        <div className="flex flex-wrap items-center gap-1.5 leading-snug">
          <span className="font-semibold uppercase tracking-wider text-[11px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-200 font-mono">
            Impersonating
          </span>
          <span className="text-amber-800/90 dark:text-amber-200/90">
            You are viewing company
          </span>
          <strong className="font-semibold text-amber-950 dark:text-amber-50">
            {currentCompanyName || "Company Tenant"}
          </strong>
          <span className="text-amber-800/90 dark:text-amber-200/90">
            as Super Admin
          </span>
          <span className="inline-flex items-center gap-1 font-semibold text-amber-950 dark:text-amber-50">
            <IconUserCheck className="size-3.5 inline" />
            ({originalAdminName || "Super Admin"})
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button
          size="sm"
          variant="destructive"
          onClick={handleExit}
          disabled={isExiting}
          className="h-8 gap-1.5 rounded-lg px-3 text-xs font-semibold shadow-sm cursor-pointer"
        >
          {isExiting ? (
            <IconLoader2 className="size-3.5 animate-spin" />
          ) : (
            <IconDoorExit className="size-3.5" />
          )}
          <span>Exit Impersonation</span>
        </Button>
      </div>
    </aside>
  );
}
