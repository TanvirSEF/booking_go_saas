"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  IconDotsVertical,
  IconPencil,
  IconTrash,
  IconSwitchHorizontal,
  IconTrendingUp,
  IconAdjustmentsHorizontal,
  IconUser,
  IconPower,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CompanyItem } from "./company-dialog";

interface CompanyCardProps {
  company: CompanyItem;
  onEdit: (company: CompanyItem) => void;
  onDelete: (company: CompanyItem) => void;
  onResetPassword: (company: CompanyItem) => void;
  onToggleStatus: (companyId: string, currentStatus: boolean) => void;
}

export function CompanyCard({
  company,
  onEdit,
  onDelete,
  onResetPassword,
  onToggleStatus,
}: CompanyCardProps) {
  const router = useRouter();

  function handleImpersonate() {
    toast.info(`Switching session to tenant ${company.name}...`);
    router.push(`/dashboard?tenant=${company.id}`);
  }

  function handleBusinessLink() {
    if (company.businessSlug) {
      window.open(`/${company.businessSlug}`, "_blank");
    } else {
      toast.info("No public business link configured yet.");
    }
  }

  return (
    <div className="relative flex min-h-[250px] w-full flex-col justify-between rounded-2xl border border-border/40 bg-card p-5 shadow-xs transition-shadow hover:shadow-sm">
      {/* Top Header: Badge & 3-dots Menu */}
      <div className="flex items-center justify-between">
        <Badge className="rounded-md bg-primary px-2.5 py-0.5 text-[11px] font-semibold text-primary-foreground">
          Company
        </Badge>

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
          <DropdownMenuContent align="end" className="w-48 rounded-xl p-1.5 shadow-md">
            <DropdownMenuItem
              onClick={() => onEdit(company)}
              className="cursor-pointer gap-2.5 rounded-lg py-1.5 text-xs font-medium"
            >
              <IconPencil size={15} />
              <span>Edit</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => onDelete(company)}
              className="cursor-pointer gap-2.5 rounded-lg py-1.5 text-xs font-medium text-destructive focus:bg-destructive/10 focus:text-destructive"
            >
              <IconTrash size={15} />
              <span>Delete</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={handleImpersonate}
              className="cursor-pointer gap-2.5 rounded-lg py-1.5 text-xs font-medium"
            >
              <IconSwitchHorizontal size={15} />
              <span>Login As Company</span>
            </DropdownMenuItem>

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

            <DropdownMenuItem
              onClick={() => onToggleStatus(company.id, company.isActive)}
              className={`cursor-pointer gap-2.5 rounded-lg py-1.5 text-xs font-medium ${
                company.isActive
                  ? "text-destructive focus:bg-destructive/10 focus:text-destructive"
                  : "text-emerald-600 dark:text-emerald-400 focus:bg-emerald-500/10"
              }`}
            >
              <IconPower size={15} />
              <span>{company.isActive ? "Login Disable" : "Login Enable"}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Center: Avatar & Info */}
      <div className="my-2 flex flex-col items-center text-center">
        <div className="flex size-14 items-center justify-center rounded-xl border border-primary/20 bg-primary/5 text-primary shadow-2xs">
          <IconUser size={28} />
        </div>
        <h3 className="mt-2.5 text-base font-bold text-foreground">
          {company.name}
        </h3>
        <p className="text-xs text-muted-foreground">{company.email}</p>
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
