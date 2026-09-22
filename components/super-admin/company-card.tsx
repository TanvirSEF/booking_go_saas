"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import {
  IconDotsVertical,
  IconPencil,
  IconTrash,
  IconTrendingUp,
  IconAdjustmentsHorizontal,
  IconUser,
  IconPower,
  IconShieldCheck,
  IconUserX,
  IconUserCheck,
  IconLoader2,
  IconKey,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CompanyItem } from "./company-dialog";
import { startImpersonationAction } from "@/actions/impersonation";

interface CompanyCardProps {
  company: CompanyItem;
  onEdit: (company: CompanyItem) => void;
  onDelete: (company: CompanyItem) => void;
  onResetPassword: (company: CompanyItem) => void;
  onToggleStatus: (companyId: string, currentStatus: boolean) => void;
  onSuspend?: (company: CompanyItem) => void;
  onReactivate?: (company: CompanyItem) => void;
  onViewSecurity?: (company: CompanyItem) => void;
}

export function CompanyCard({
  company,
  onEdit,
  onDelete,
  onResetPassword,
  onToggleStatus,
  onSuspend,
  onReactivate,
  onViewSecurity,
}: CompanyCardProps) {
  const [isImpersonating, setIsImpersonating] = useState(false);

  async function handleImpersonate() {
    if (company.isActive === false) {
      toast.error("Cannot impersonate a deactivated company.");
      return;
    }

    try {
      setIsImpersonating(true);
      toast.info(`Initiating impersonation session for ${company.name}...`);

      const res = await startImpersonationAction(company.id);
      if (res.success && res.ticket) {
        const authResult = await signIn("impersonate", {
          ticket: res.ticket,
          callbackUrl: res.redirectUrl || "/dashboard",
          redirect: false,
        });

        if (authResult?.error) {
          toast.error("Authentication failed during impersonation.");
          setIsImpersonating(false);
          return;
        }

        toast.success(`Logged in as ${company.name}`);
        const targetUrl = res.redirectUrl || "/dashboard";
        window.location.assign(targetUrl);
      } else {
        toast.error(res.message || res.error || "Failed to impersonate company.");
        setIsImpersonating(false);
      }
    } catch (err) {
      console.error("[handleImpersonate] Error:", err);
      toast.error("Failed to start impersonation.");
      setIsImpersonating(false);
    }
  }

  function handleBusinessLink() {
    if (company.businessSlug) {
      window.open(`/${company.businessSlug}`, "_blank");
    } else {
      toast.info("No public business link configured yet.");
    }
  }

  const isSuspended = company.isActive === false;
  const isLoginAllowed = company.isEnableLogin !== false;

  return (
    <div className="relative flex min-h-[260px] w-full flex-col justify-between rounded-2xl border border-border/40 bg-card p-5 shadow-xs transition-shadow hover:shadow-sm">
      {/* Top Header: Status Badges & 3-dots Menu */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Account Status Badge */}
          {isSuspended ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className="cursor-help border-destructive/30 bg-destructive/10 text-[10px] font-semibold text-destructive px-2 py-0.5"
                >
                  Suspended
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs">
                <p className="font-semibold">Account Suspended</p>
                {company.suspendedReason && (
                  <p className="mt-0.5 text-muted-foreground">
                    Reason: {company.suspendedReason}
                  </p>
                )}
                {company.suspendedAt && (
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    Date: {new Date(company.suspendedAt).toLocaleDateString()}
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          ) : (
            <Badge
              variant="outline"
              className="border-emerald-500/20 bg-emerald-500/10 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 px-2 py-0.5"
            >
              Active
            </Badge>
          )}

          {/* Login Access Badge */}
          <Badge
            variant="outline"
            className={
              isLoginAllowed
                ? "border-emerald-500/20 bg-emerald-500/5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 px-2 py-0.5"
                : "border-amber-500/20 bg-amber-500/10 text-[10px] font-semibold text-amber-600 dark:text-amber-400 px-2 py-0.5"
            }
          >
            {isLoginAllowed ? "Login Allowed" : "Login Disabled"}
          </Badge>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              className="size-7 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <IconDotsVertical size={16} />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 rounded-xl p-1.5 shadow-md">
            <DropdownMenuItem
              onClick={() => onEdit(company)}
              className="cursor-pointer gap-2.5 rounded-lg py-1.5 text-xs font-medium"
            >
              <IconPencil size={15} />
              <span>Edit Company</span>
            </DropdownMenuItem>

            {isSuspended ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <DropdownMenuItem
                      disabled
                      className="gap-2.5 rounded-lg py-1.5 text-xs font-medium opacity-50 cursor-not-allowed"
                    >
                      <IconKey size={15} className="text-primary" />
                      <span>Login As Company</span>
                    </DropdownMenuItem>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <span>Cannot impersonate a deactivated company.</span>
                </TooltipContent>
              </Tooltip>
            ) : (
              <DropdownMenuItem
                onClick={handleImpersonate}
                disabled={isImpersonating}
                className="cursor-pointer gap-2.5 rounded-lg py-1.5 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isImpersonating ? (
                  <IconLoader2 size={15} className="animate-spin text-primary" />
                ) : (
                  <IconKey size={15} className="text-primary" />
                )}
                <span>{isImpersonating ? "Logging In..." : "Login As Company"}</span>
              </DropdownMenuItem>
            )}

            <DropdownMenuItem
              onClick={handleBusinessLink}
              className="cursor-pointer gap-2.5 rounded-lg py-1.5 text-xs font-medium"
            >
              <IconTrendingUp size={15} />
              <span>Business Link</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => onResetPassword(company)}
              className="cursor-pointer gap-2.5 rounded-lg py-1.5 text-xs font-medium"
            >
              <IconAdjustmentsHorizontal size={15} />
              <span>Reset Password</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {onViewSecurity && (
              <DropdownMenuItem
                onClick={() => onViewSecurity(company)}
                className="cursor-pointer gap-2.5 rounded-lg py-1.5 text-xs font-medium"
              >
                <IconShieldCheck size={15} className="text-primary" />
                <span>Security Details</span>
              </DropdownMenuItem>
            )}

            <DropdownMenuItem
              onClick={() => onToggleStatus(company.id, isLoginAllowed)}
              className={
                "cursor-pointer gap-2.5 rounded-lg py-1.5 text-xs font-medium " +
                (isLoginAllowed
                  ? "text-amber-600 dark:text-amber-400 focus:bg-amber-500/10"
                  : "text-emerald-600 dark:text-emerald-400 focus:bg-emerald-500/10")
              }
            >
              <IconPower size={15} />
              <span>{isLoginAllowed ? "Disable Login" : "Enable Login"}</span>
            </DropdownMenuItem>

            {isSuspended ? (
              onReactivate && (
                <DropdownMenuItem
                  onClick={() => onReactivate(company)}
                  className="cursor-pointer gap-2.5 rounded-lg py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 focus:bg-emerald-500/10"
                >
                  <IconUserCheck size={15} />
                  <span>Reactivate Company</span>
                </DropdownMenuItem>
              )
            ) : (
              onSuspend && (
                <DropdownMenuItem
                  onClick={() => onSuspend(company)}
                  className="cursor-pointer gap-2.5 rounded-lg py-1.5 text-xs font-medium text-destructive focus:bg-destructive/10 focus:text-destructive"
                >
                  <IconUserX size={15} />
                  <span>Suspend Company</span>
                </DropdownMenuItem>
              )
            )}

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => onDelete(company)}
              className="cursor-pointer gap-2.5 rounded-lg py-1.5 text-xs font-medium text-destructive focus:bg-destructive/10 focus:text-destructive"
            >
              <IconTrash size={15} />
              <span>Delete</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Center: Avatar & Info */}
      <div className="my-2 flex flex-col items-center text-center">
        <div className="flex size-14 items-center justify-center rounded-xl border border-primary/20 bg-primary/5 text-primary shadow-2xs">
          <IconUser size={28} />
        </div>
        <h3 className="mt-2.5 text-base font-bold text-foreground line-clamp-1">
          {company.name}
        </h3>
        <p className="text-xs text-muted-foreground line-clamp-1">{company.email}</p>
      </div>

      {/* Plan & AdminHub Row */}
      <div className="flex items-center justify-between border-t border-border/40 pt-3">
        <span className="text-xs font-bold text-foreground">
          {company.planName || "Basic Plan"}
        </span>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="h-7 rounded-lg border-primary/40 px-3 text-[11px] font-semibold text-primary hover:bg-primary/5 hover:text-primary"
        >
          <Link href={`/dashboard?tenant=${company.id}`}>
            AdminHub
          </Link>
        </Button>
      </div>

      {/* Footer: Plan Expired */}
      <div className="mt-2 text-center text-[11px] text-muted-foreground">
        Plan Expired : {company.planExpiredDate || "10-10-26"}
      </div>
    </div>
  );
}
