"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import {
  IconChevronDown,
  IconLogout,
  IconUser,
} from "@tabler/icons-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { BusinessSwitcher } from "@/components/dashboard/business-switcher";
import { LanguageSwitcher } from "@/components/language-switcher";

interface CompanyHeaderProps {
  user?: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
  };
  businessName?: string;
  businessSlug?: string;
}

export function CompanyHeader({ user, businessName, businessSlug }: CompanyHeaderProps) {
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full max-w-full shrink-0 items-center justify-between border-b border-border/40 bg-background/80 px-2.5 sm:px-4 backdrop-blur-md">
      {/* Left: SidebarTrigger + Separator + Business Selector / Name */}
      <div className="flex min-w-0 items-center gap-1 sm:gap-2">
        <SidebarTrigger className="-ml-1 shrink-0" />
        <Separator orientation="vertical" className="mr-1 sm:mr-2 h-4 shrink-0" />
        
        <BusinessSwitcher activeBusinessName={businessName} activeBusinessSlug={businessSlug} />

        {businessSlug && (
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex text-xs text-muted-foreground hover:text-primary">
            <Link href={`/appointments/${businessSlug}`} target="_blank">
              View Public Page
            </Link>
          </Button>
        )}
      </div>

      {/* Right: Language selector + Theme toggler + Profile */}
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
        <LanguageSwitcher />

        <NotificationBell />

        <AnimatedThemeToggler
          theme={theme === "dark" ? "dark" : "light"}
          onThemeChange={(newTheme) => setTheme(newTheme)}
          className="flex size-8 sm:size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card shadow-2xs hover:bg-accent text-foreground transition-colors cursor-pointer"
        />

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
                {user?.name || "Company Admin"}
              </span>
              <IconChevronDown size={13} className="shrink-0 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl p-1.5 shadow-lg">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-1.5 p-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-foreground">
                    {user?.name || "Company Admin"}
                  </p>
                  <Badge variant="secondary" className="gap-1 text-[10px] font-medium capitalize">
                    {user?.role || "Company"}
                  </Badge>
                </div>
                <p className="truncate text-[11px] text-muted-foreground">
                  {user?.email || "company@example.com"}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="cursor-pointer rounded-lg text-xs">
              <Link href="/dashboard/profile" className="flex items-center gap-2">
                <IconUser size={15} />
                <span>Profile</span>
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
      </div>
    </header>
  );
}
