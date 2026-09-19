"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import {
  IconChevronDown,
  IconLogout,
  IconUser,
  IconWorld,
  IconShieldLock,
  IconSparkles,
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";

interface AdminTopbarProps {
  user?: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
    image?: string | null;
  };
}

export function AdminTopbar({ user }: AdminTopbarProps) {
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 flex h-20 w-full items-center justify-between border-b border-border/40 bg-background/80 px-6 backdrop-blur-md">
      {/* Brand / Logo */}
      <div className="flex items-center gap-3">
        <Link href="/super-admin" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
          <Avatar className="size-10 rounded-full border border-border bg-primary/10 text-primary">
            <AvatarFallback className="font-bold text-primary">
              <IconSparkles size={18} />
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-foreground">
              Booking<span className="text-primary">Go</span>
            </span>
            <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
              Super Admin
            </span>
          </div>
        </Link>
      </div>

      {/* Center / User Dropdown */}
      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="flex h-11 items-center gap-2.5 rounded-2xl border-border bg-card px-4 py-2 text-sm font-medium shadow-2xs hover:bg-accent hover:text-accent-foreground"
            >
              <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <IconUser size={16} />
              </div>
              <span>{user?.name || "Super Admin"}</span>
              <IconChevronDown size={14} className="text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 rounded-2xl p-2 shadow-lg">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-1.5 p-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">
                    {user?.name || "Super Admin"}
                  </p>
                  <Badge variant="secondary" className="gap-1 text-[10px] font-medium">
                    <IconShieldLock size={12} />
                    {user?.role || "Super Admin"}
                  </Badge>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {user?.email || "superadmin@example.com"}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="cursor-pointer rounded-xl">
              <Link href="/super-admin/profile" className="flex items-center gap-2">
                <IconUser size={16} />
                <span>Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="cursor-pointer rounded-xl text-destructive focus:bg-destructive/10 focus:text-destructive"
            >
              <IconLogout size={16} />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Right Actions: Language & Theme Toggle */}
      <div className="flex items-center gap-3">
        {/* Language selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="flex h-10 items-center gap-2 rounded-xl border-border bg-card px-3 text-xs font-medium shadow-2xs hover:bg-accent"
            >
              <IconWorld size={16} className="text-muted-foreground" />
              <span>EN</span>
              <IconChevronDown size={12} className="text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-32 rounded-xl p-1 shadow-md">
            <DropdownMenuItem className="cursor-pointer rounded-lg text-xs font-medium">
              English (EN)
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer rounded-lg text-xs font-medium">
              Spanish (ES)
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer rounded-lg text-xs font-medium">
              French (FR)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Animated Theme Toggler */}
        <AnimatedThemeToggler
          theme={theme === "dark" ? "dark" : "light"}
          onThemeChange={(newTheme) => setTheme(newTheme)}
          className="flex size-10 items-center justify-center rounded-xl border border-border bg-card shadow-2xs hover:bg-accent text-foreground transition-colors cursor-pointer"
        />
      </div>
    </header>
  );
}
