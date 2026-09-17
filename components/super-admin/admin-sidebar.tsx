"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconLayoutDashboard,
  IconUsers,
  IconTrophy,
  IconMail,
  IconBell,
  IconBox,
  IconSettings,
  IconGridDots,
  IconChevronRight,
  IconSparkles,
  IconTicket,
  IconReceipt,
} from "@tabler/icons-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function AdminSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();

  const isSubscriptionRoute =
    pathname.startsWith("/super-admin/plans") ||
    pathname.startsWith("/super-admin/coupons") ||
    pathname.startsWith("/super-admin/orders");

  return (
    <Sidebar {...props}>
      {/* Brand Header without search-form or version-switcher */}
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <Link
          href="/super-admin"
          className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
        >
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
            <IconSparkles size={18} />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-sidebar-foreground">
              Booking<span className="text-primary">Go</span>
            </span>
            <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
              Super Admin
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="gap-1 p-2">
        {/* Main Platform Group */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            Platform
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/super-admin"}
                  className={cn(
                    "rounded-xl font-medium",
                    pathname === "/super-admin" &&
                    "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                  )}
                >
                  <Link href="/super-admin">
                    <IconLayoutDashboard size={18} />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith("/super-admin/companies")}
                  className={cn(
                    "rounded-xl font-medium",
                    pathname.startsWith("/super-admin/companies") &&
                    "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                  )}
                >
                  <Link href="/super-admin/companies">
                    <IconUsers size={18} />
                    <span>Subscribers</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Subscription Collapsible Group following sidebar-02 pattern */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            Billing
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <Collapsible
                defaultOpen={isSubscriptionRoute}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      className={cn(
                        "w-full justify-between rounded-xl font-medium",
                        isSubscriptionRoute && "text-primary font-semibold"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <IconTrophy size={18} />
                        <span>Subscription</span>
                      </div>
                      <IconChevronRight
                        size={16}
                        className="transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
                      />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub className="my-1 ml-4 border-l border-sidebar-border pl-2">
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          asChild
                          isActive={pathname === "/super-admin/plans"}
                          className={cn(
                            "rounded-lg text-xs",
                            pathname === "/super-admin/plans" &&
                            "bg-primary text-primary-foreground font-semibold hover:bg-primary hover:text-primary-foreground"
                          )}
                        >
                          <Link href="/super-admin/plans">
                            <IconTrophy size={14} />
                            <span>Subscription Setting</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>

                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          asChild
                          isActive={pathname.startsWith("/super-admin/coupons")}
                          className={cn(
                            "rounded-lg text-xs",
                            pathname.startsWith("/super-admin/coupons") &&
                            "bg-primary text-primary-foreground font-semibold hover:bg-primary hover:text-primary-foreground"
                          )}
                        >
                          <Link href="/super-admin/coupons">
                            <IconTicket size={14} />
                            <span>Coupon</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>

                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          asChild
                          isActive={pathname === "/super-admin/orders"}
                          className={cn(
                            "rounded-lg text-xs",
                            pathname === "/super-admin/orders" &&
                            "bg-primary text-primary-foreground font-semibold hover:bg-primary hover:text-primary-foreground"
                          )}
                        >
                          <Link href="/super-admin/orders">
                            <IconReceipt size={14} />
                            <span>Orders & Transactions</span>
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

        {/* Templates Group */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            Communication
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith("/super-admin/email-templates")}
                  className="rounded-xl font-medium"
                >
                  <Link href="/super-admin/email-templates">
                    <IconMail size={18} />
                    <span>Email Template</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith("/super-admin/notification-templates")}
                  className="rounded-xl font-medium"
                >
                  <Link href="/super-admin/notification-templates">
                    <IconBell size={18} />
                    <span>Notification Template</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* System & Add-ons */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            System
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith("/super-admin/cms")}
                  className="rounded-xl font-medium"
                >
                  <Link href="/super-admin/cms">
                    <IconBox size={18} />
                    <span>CMS</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith("/super-admin/settings")}
                  className={cn(
                    "rounded-xl font-medium",
                    pathname.startsWith("/super-admin/settings") &&
                    "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                  )}
                >
                  <Link href="/super-admin/settings">
                    <IconSettings size={18} />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith("/super-admin/addons")}
                  className="rounded-xl font-medium justify-between"
                >
                  <Link href="/super-admin/addons">
                    <div className="flex items-center gap-2">
                      <IconGridDots size={18} />
                      <span>Add-on Manager</span>
                    </div>
                    <Badge
                      variant="outline"
                      className="border-primary/40 px-1 py-0 text-[9px] font-bold text-primary uppercase"
                    >
                      Premium
                    </Badge>
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
