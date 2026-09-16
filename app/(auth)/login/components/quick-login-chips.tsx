"use client";

import { ShieldCheck, Building2, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface QuickLoginChipsProps {
  onSelectRole: (email: string) => void;
}

export function QuickLoginChips({ onSelectRole }: QuickLoginChipsProps) {
  return (
    <div className="mt-5 flex flex-col items-center gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
      <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
        Demo Credentials:
      </span>
      <div className="flex flex-wrap justify-center gap-2">
        <Badge
          variant="outline"
          onClick={() => onSelectRole("superadmin@example.com")}
          className="cursor-pointer gap-1.5 rounded-lg border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 shadow-2xs hover:border-[#584ED2]/50 hover:bg-slate-50 dark:border-slate-700 dark:bg-card dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
        >
          <ShieldCheck className="size-3.5 text-[#584ED2]" />
          <span>Super Admin</span>
        </Badge>
        <Badge
          variant="outline"
          onClick={() => onSelectRole("company@example.com")}
          className="cursor-pointer gap-1.5 rounded-lg border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 shadow-2xs hover:border-blue-500/50 hover:bg-slate-50 dark:border-slate-700 dark:bg-card dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
        >
          <Building2 className="size-3.5 text-blue-500" />
          <span>Company</span>
        </Badge>
        <Badge
          variant="outline"
          onClick={() => onSelectRole("staff@example.com")}
          className="cursor-pointer gap-1.5 rounded-lg border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 shadow-2xs hover:border-emerald-500/50 hover:bg-slate-50 dark:border-slate-700 dark:bg-card dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
        >
          <UserCheck className="size-3.5 text-emerald-500" />
          <span>Staff</span>
        </Badge>
      </div>
    </div>
  );
}
