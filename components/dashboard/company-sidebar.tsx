"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconLayoutDashboard,
  IconMapPin,
  IconSparkles,
} from "@tabler/icons-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

interface CompanySidebarProps extends React.ComponentProps<typeof Sidebar> {
  businessName?: string;
}

export function CompanySidebar({ businessName, ...props }: CompanySidebarProps) {
  const pathname = usePathname();

  return (
    <Sidebar {...props}>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
        >
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
            <IconSparkles size={18} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold tracking-tight text-sidebar-foreground truncate">
              {businessName || "BookingGo"}
            </span>
            <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
              Company Portal
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="gap-1 p-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            Overview
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/dashboard"}
                  className={cn(
                    "rounded-xl font-medium transition-colors",
                    pathname === "/dashboard" &&
                      "bg-emerald-600 text-white hover:bg-emerald-600 hover:text-white dark:bg-emerald-500 dark:hover:bg-emerald-500 shadow-xs font-semibold"
                  )}
                >
                  <Link href="/dashboard">
                    <IconLayoutDashboard size={18} />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            Business Management
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith("/dashboard/locations")}
                  className={cn(
                    "rounded-xl font-medium transition-colors",
                    pathname.startsWith("/dashboard/locations") &&
                      "bg-emerald-600 text-white hover:bg-emerald-600 hover:text-white dark:bg-emerald-500 dark:hover:bg-emerald-500 shadow-xs font-semibold"
                  )}
                >
                  <Link href="/dashboard/locations">
                    <IconMapPin size={18} />
                    <span>Locations</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
