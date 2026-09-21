"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconLayoutDashboard,
  IconUsers,
  IconTrophy,
  IconSettings,
  IconChevronRight,
  IconSparkles,
  IconTicket,
  IconReceipt,
  IconShieldLock,
  IconBuildingBank,
  IconWorld,
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
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface SidebarSubItem {
  title: string;
  url: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}

export interface SidebarMenuItemData {
  title: string;
  url?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  items?: SidebarSubItem[];
  badge?: string;
}

export interface SidebarGroupData {
  group: string;
  items: SidebarMenuItemData[];
}

export const adminNavigationData: SidebarGroupData[] = [
  {
    group: "Platform",
    items: [
      {
        title: "Dashboard",
        url: "/super-admin",
        icon: IconLayoutDashboard,
      },
      {
        title: "Subscribers",
        url: "/super-admin/companies",
        icon: IconUsers,
      },
    ],
  },
  {
    group: "Billing",
    items: [
      {
        title: "Subscription",
        icon: IconTrophy,
        items: [
          {
            title: "Subscription Setting",
            url: "/super-admin/plans",
            icon: IconTrophy,
          },
          {
            title: "Coupon",
            url: "/super-admin/coupons",
            icon: IconTicket,
          },
        ],
      },
      {
        title: "Orders & Transactions",
        icon: IconReceipt,
        items: [
          {
            title: "Bank Transfers",
            url: "/super-admin/bank-transfers",
            icon: IconBuildingBank,
          },
          {
            title: "Orders & Transactions",
            url: "/super-admin/orders",
            icon: IconReceipt,
          },

        ],
      },
    ],
  },
  // {
  //   group: "Communication",
  //   items: [
  //     {
  //       title: "Email Template",
  //       url: "/super-admin/email-templates",
  //       icon: IconMail,
  //     },
  //     {
  //       title: "Notification Template",
  //       url: "/super-admin/notification-templates",
  //       icon: IconBell,
  //     },
  //   ],
  // },
  {
    group: "System",
    items: [
      // {
      //   title: "CMS",
      //   url: "/super-admin/cms",
      //   icon: IconBox,
      // },
      {
        title: "Languages",
        url: "/super-admin/languages",
        icon: IconWorld,
      },
      {
        title: "Settings",
        url: "/super-admin/settings",
        icon: IconSettings,
      },
      {
        title: "Security & Logins",
        url: "/super-admin/security/logins",
        icon: IconShieldLock,
      },
      // {
      //   title: "Add-on Manager",
      //   url: "/super-admin/addons",
      //   icon: IconGridDots,
      //   badge: "Premium",
      // },
    ],
  },
];

export function AdminSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" {...props}>
      {/* Brand Header */}
      <SidebarHeader className="border-b border-sidebar-border p-3 group-data-[collapsible=icon]:p-1.5 group-data-[collapsible=icon]:items-center">
        <Link
          href="/super-admin"
          className="flex items-center gap-2.5 transition-opacity hover:opacity-90 overflow-hidden group-data-[collapsible=icon]:size-9 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
        >
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs shrink-0">
            <IconSparkles size={18} />
          </div>
          <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-bold tracking-tight text-sidebar-foreground truncate">
              Booking<span className="text-primary">Go</span>
            </span>
            <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
              Super Admin
            </span>
          </div>
        </Link>
      </SidebarHeader>

      {/* Navigation Content based on Data Object */}
      <SidebarContent className="gap-1 p-2 group-data-[collapsible=icon]:p-1.5 group-data-[collapsible=icon]:gap-1">
        {adminNavigationData.map((section) => (
          <SidebarGroup
            key={section.group}
            className="p-1 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:items-center"
          >
            <SidebarGroupLabel className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase group-data-[collapsible=icon]:hidden">
              {section.group}
            </SidebarGroupLabel>
            <SidebarGroupContent className="w-full">
              <SidebarMenu className="gap-1.5 group-data-[collapsible=icon]:gap-1.5 group-data-[collapsible=icon]:items-center">
                {section.items.map((item) => {
                  const Icon = item.icon;

                  // Sub-menu items (Collapsible)
                  if (item.items && item.items.length > 0) {
                    const isChildActive = item.items.some(
                      (sub) =>
                        pathname === sub.url ||
                        (sub.url !== "/super-admin" && pathname.startsWith(sub.url))
                    );

                    return (
                      <Collapsible
                        key={item.title}
                        defaultOpen={isChildActive}
                        className="group/collapsible"
                      >
                        <SidebarMenuItem className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton
                              tooltip={item.title}
                              className={cn(
                                "w-full justify-between rounded-xl font-medium transition-colors cursor-pointer group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:!p-0",
                                isChildActive &&
                                "text-primary font-semibold hover:text-sidebar-accent-foreground"
                              )}
                            >
                              <div className="flex items-center gap-2 group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:justify-center">
                                <Icon size={18} className="shrink-0" />
                                <span className="group-data-[collapsible=icon]:hidden">
                                  {item.title}
                                </span>
                              </div>
                              <IconChevronRight
                                size={16}
                                className="transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden"
                              />
                            </SidebarMenuButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <SidebarMenuSub className="my-1 ml-4 border-l border-sidebar-border pl-2 group-data-[collapsible=icon]:hidden">
                              {item.items.map((subItem) => {
                                const SubIcon = subItem.icon;
                                const isSubActive =
                                  pathname === subItem.url ||
                                  (subItem.url !== "/super-admin" &&
                                    pathname.startsWith(subItem.url));

                                return (
                                  <SidebarMenuSubItem key={subItem.title}>
                                    <SidebarMenuSubButton
                                      asChild
                                      isActive={isSubActive}
                                      className={cn(
                                        "rounded-lg text-xs font-medium transition-colors",
                                        isSubActive &&
                                        "bg-primary text-primary-foreground font-semibold hover:bg-primary hover:text-primary-foreground shadow-xs"
                                      )}
                                    >
                                      <Link href={subItem.url}>
                                        {SubIcon && <SubIcon size={14} />}
                                        <span>{subItem.title}</span>
                                      </Link>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                );
                              })}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </SidebarMenuItem>
                      </Collapsible>
                    );
                  }

                  // Single Link item
                  const isActive =
                    item.url === "/super-admin"
                      ? pathname === "/super-admin"
                      : item.url
                        ? pathname.startsWith(item.url)
                        : false;

                  return (
                    <SidebarMenuItem
                      key={item.title}
                      className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center"
                    >
                      <SidebarMenuButton
                        asChild
                        tooltip={item.title}
                        isActive={isActive}
                        className={cn(
                          "rounded-xl font-medium transition-colors group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:!p-0",
                          isActive &&
                          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground shadow-xs font-semibold"
                        )}
                      >
                        <Link
                          href={item.url || "#"}
                          className="group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0"
                        >
                          <Icon size={18} className="shrink-0" />
                          <span className="group-data-[collapsible=icon]:hidden">
                            {item.title}
                          </span>
                          {item.badge && (
                            <Badge
                              variant="outline"
                              className={cn(
                                "ml-auto border-primary/40 px-1 py-0 text-[9px] font-bold uppercase group-data-[collapsible=icon]:hidden",
                                isActive
                                  ? "border-primary-foreground/40 text-primary-foreground"
                                  : "text-primary"
                              )}
                            >
                              {item.badge}
                            </Badge>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* <SidebarRail /> */}
    </Sidebar>
  );
}
