"use client";

import { useTheme } from "next-themes";
import { IconChevronDown, IconWorld } from "@tabler/icons-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { AdminProfileDropdown } from "./admin-profile-dropdown";

interface AdminHeaderProps {
  user?: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
  };
}

export function AdminHeader({ user }: AdminHeaderProps) {
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full max-w-full shrink-0 items-center justify-between border-b border-border/40 bg-background/80 px-2.5 sm:px-4 backdrop-blur-md">
      {/* Left: SidebarTrigger + Separator + Admin Profile Dropdown (replacing breadcrumbs) */}
      <div className="flex min-w-0 items-center gap-1 sm:gap-2">
        <SidebarTrigger className="-ml-1 shrink-0" />
        <Separator orientation="vertical" className="mr-1 sm:mr-2 h-4 shrink-0" />
        <AdminProfileDropdown user={user} />
      </div>

      {/* Right: Language selector + Animated Theme Toggler */}
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="flex h-9 shrink-0 items-center gap-1 sm:gap-1.5 rounded-lg border-border bg-card px-2 sm:px-2.5 text-xs font-medium shadow-2xs hover:bg-accent"
            >
              <IconWorld size={14} className="text-muted-foreground" />
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

        <AnimatedThemeToggler
          theme={theme === "dark" ? "dark" : "light"}
          onThemeChange={(newTheme) => setTheme(newTheme)}
          className="flex size-8 sm:size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card shadow-2xs hover:bg-accent text-foreground transition-colors cursor-pointer"
        />
      </div>
    </header>
  );
}
