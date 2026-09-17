"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconChevronRight,
  IconFolder,
  IconLayoutDashboard,
  IconMapPin,
  IconScissors,
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface CompanySidebarProps extends React.ComponentProps<typeof Sidebar> {
  businessName?: string;
}

export function CompanySidebar({ businessName, ...props }: CompanySidebarProps) {
  const pathname = usePathname();
  const isServicesRoute = pathname.startsWith("/dashboard/services");

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
                    "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground shadow-xs font-semibold"
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
                    "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground shadow-xs font-semibold"
                  )}
                >
                  <Link href="/dashboard/locations">
                    <IconMapPin size={18} />
                    <span>Locations</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Services with sub-routes: Categories & Service Catalog */}
              <Collapsible
                defaultOpen={isServicesRoute}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      className={cn(
                        "w-full justify-between rounded-xl font-medium transition-colors cursor-pointer",
                        isServicesRoute && "text-primary font-semibold hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <IconScissors size={18} className="hover:text-sidebar-accent-foreground" />
                        <span>Services</span>
                      </div>
                      <IconChevronRight
                        size={16}
                        className="transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
                      />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub className="my-1 ml-4 border-l border-sidebar-border pl-2">
                      {/* Categories sub-route */}
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          asChild
                          isActive={pathname.startsWith("/dashboard/services/categories")}
                          className={cn(
                            "rounded-lg text-xs font-medium transition-colors",
                            pathname.startsWith("/dashboard/services/categories") &&
                            "bg-primary text-primary-foreground font-semibold hover:bg-primary hover:text-primary-foreground shadow-xs"
                          )}
                        >
                          <Link href="/dashboard/services/categories">
                            <IconFolder size={14} />
                            <span>Categories</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>

                      {/* Service Catalog sub-route */}
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          asChild
                          isActive={
                            pathname === "/dashboard/services" ||
                            pathname.startsWith("/dashboard/services/catalog")
                          }
                          className={cn(
                            "rounded-lg text-xs font-medium transition-colors",
                            (pathname === "/dashboard/services" ||
                              pathname.startsWith("/dashboard/services/catalog")) &&
                            "bg-primary text-primary-foreground font-semibold hover:bg-primary hover:text-primary-foreground shadow-xs"
                          )}
                        >
                          <Link href="/dashboard/services/catalog">
                            <IconScissors size={14} />
                            <span>Service Catalog</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
