"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconCalendar,
  IconCalendarEvent,
  IconCalendarOff,
  IconChevronRight,
  IconClock,
  IconFolder,
  IconForms,
  IconLayoutDashboard,
  IconMapPin,
  IconScissors,
  IconSettings,
  IconSparkles,
  IconAdjustmentsHorizontal,
  IconArticle,
  IconMail,
  IconUsers,
  IconUsersGroup,
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
}

export interface SidebarGroupData {
  group: string;
  items: SidebarMenuItemData[];
}

// Structured Navigation Data Configuration (sidebar-07 pattern)
export const companyNavigationData: SidebarGroupData[] = [
  {
    group: "Overview",
    items: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: IconLayoutDashboard,
      },
    ],
  },
  {
    group: "Appointments",
    items: [
      {
        title: "All Bookings",
        url: "/dashboard/appointments",
        icon: IconCalendarEvent,
      },
      {
        title: "Calendar View",
        url: "/dashboard/appointments/calendar",
        icon: IconCalendar,
      },
    ],
  },
  {
    group: "Business Management",
    items: [
      {
        title: "Branch Locations",
        url: "/dashboard/locations",
        icon: IconMapPin,
      },
      {
        title: "Services",
        icon: IconScissors,
        items: [
          {
            title: "Service Catalog",
            url: "/dashboard/services/catalog",
            icon: IconScissors,
          },
          {
            title: "Categories",
            url: "/dashboard/services/categories",
            icon: IconFolder,
          },
        ],
      },
      {
        title: "Staff Members",
        url: "/dashboard/staff",
        icon: IconUsers,
      },
      {
        title: "Customers",
        url: "/dashboard/customers",
        icon: IconUsersGroup,
      },
      {
        title: "Customer Inquiries",
        url: "/dashboard/contacts",
        icon: IconMail,
      },
    ],
  },
  {
    group: "Availability & Operations",
    items: [
      {
        title: "Business Hours & Breaks",
        url: "/dashboard/business/hours",
        icon: IconClock,
      },
      {
        title: "Holidays & Off-Days",
        url: "/dashboard/business/holidays",
        icon: IconCalendarOff,
      },
      {
        title: "Custom Fields",
        url: "/dashboard/custom-fields",
        icon: IconForms,
      },
      {
        title: "Custom Statuses",
        url: "/dashboard/custom-status",
        icon: IconAdjustmentsHorizontal,
      },
    ],
  },
  {
    group: "Marketing & Growth",
    items: [
      {
        title: "Blog Articles",
        url: "/dashboard/blog",
        icon: IconArticle,
      },
      {
        title: "Subscribers",
        url: "/dashboard/subscribers",
        icon: IconMail,
      },
    ],
  },
  {
    group: "Settings",
    items: [
      {
        title: "Company Settings",
        url: "/dashboard/settings",
        icon: IconSettings,
      },
    ],
  },
];

interface CompanySidebarProps extends React.ComponentProps<typeof Sidebar> {
  businessName?: string;
}

export function CompanySidebar({ businessName, ...props }: CompanySidebarProps) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" {...props}>
      {/* Brand Header */}
      <SidebarHeader className="border-b border-sidebar-border p-3 group-data-[collapsible=icon]:p-1.5 group-data-[collapsible=icon]:items-center">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 transition-opacity hover:opacity-90 overflow-hidden group-data-[collapsible=icon]:size-9 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
        >
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs shrink-0">
            <IconSparkles size={18} />
          </div>
          <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-bold tracking-tight text-sidebar-foreground truncate">
              {businessName || "BookingGo"}
            </span>
            <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
              Company Portal
            </span>
          </div>
        </Link>
      </SidebarHeader>

      {/* Navigation Content based on Data Object */}
      <SidebarContent className="gap-1 p-2 group-data-[collapsible=icon]:p-1.5 group-data-[collapsible=icon]:gap-1">
        {companyNavigationData.map((section) => (
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
                        (sub.url !== "/dashboard" && pathname.startsWith(sub.url))
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
                                  (subItem.url !== "/dashboard" &&
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
                    item.url === "/dashboard"
                      ? pathname === "/dashboard"
                      : item.url === "/dashboard/appointments"
                        ? pathname === "/dashboard/appointments"
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

      <SidebarRail />
    </Sidebar>
  );
}
