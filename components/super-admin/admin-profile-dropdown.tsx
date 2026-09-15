"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import {
  IconChevronDown,
  IconLogout,
  IconShieldLock,
  IconUser,
} from "@tabler/icons-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface AdminProfileDropdownProps {
  user?: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
  };
}

export function AdminProfileDropdown({ user }: AdminProfileDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="flex h-9 min-w-0 items-center gap-1.5 sm:gap-2 rounded-lg px-1.5 sm:px-2.5 text-xs font-semibold text-foreground hover:bg-accent cursor-pointer"
        >
          <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <IconUser size={14} />
          </div>
          <span className="truncate max-w-[80px] sm:max-w-[130px] md:max-w-none">
            {user?.name || "Super Admin"}
          </span>
          <IconChevronDown size={13} className="shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56 rounded-xl p-1.5 shadow-lg">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-1.5 p-1">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-foreground">
                {user?.name || "Super Admin"}
              </p>
              <Badge variant="secondary" className="gap-1 text-[10px] font-medium">
                <IconShieldLock size={12} />
                {user?.role || "Super Admin"}
              </Badge>
            </div>
            <p className="truncate text-[11px] text-muted-foreground">
              {user?.email || "superadmin@example.com"}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer rounded-lg text-xs">
          <Link href="/profile" className="flex items-center gap-2">
            <IconUser size={15} />
            <span>/profile</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="cursor-pointer rounded-lg text-xs text-destructive focus:bg-destructive/10 focus:text-destructive"
        >
          <IconLogout size={15} />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
