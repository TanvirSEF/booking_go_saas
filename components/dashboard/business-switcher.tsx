"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IconBuildingStore,
  IconCheck,
  IconChevronDown,
  IconPlus,
  IconSettings,
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
import { toast } from "sonner";
import { CreateBusinessDialog } from "@/components/dashboard/business/create-business-dialog";
import {
  getCompanyBusinessesAction,
  switchActiveBusinessAction,
} from "@/actions/business";
import type { BusinessDTO } from "@/types/business";

interface BusinessSwitcherProps {
  activeBusinessName?: string;
  activeBusinessSlug?: string;
}

export function BusinessSwitcher({
  activeBusinessName,
}: BusinessSwitcherProps) {
  const router = useRouter();
  const [businesses, setBusinesses] = React.useState<BusinessDTO[]>([]);
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [isLoaded, setIsLoaded] = React.useState(false);

  const fetchBranches = React.useCallback(async () => {
    try {
      const res = await getCompanyBusinessesAction();
      if (res.success && res.data) {
        setBusinesses(res.data);
        setIsLoaded(true);
      }
    } catch {
      // Silent error
    }
  }, []);

  const handleDropdownOpenChange = (open: boolean) => {
    if (open && !isLoaded) {
      fetchBranches();
    }
  };

  const handleSwitch = async (b: BusinessDTO) => {
    if (b.name === activeBusinessName) return;

    try {
      const res = await switchActiveBusinessAction(b.id);
      if (res.success) {
        toast.success(`Switched active branch to ${b.name}`);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to switch active branch");
      }
    } catch {
      toast.error("Failed to switch active branch");
    }
  };

  return (
    <>
      <DropdownMenu onOpenChange={handleDropdownOpenChange}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="flex h-8 sm:h-9 items-center gap-1.5 rounded-lg border-border/80 bg-muted/40 px-2 sm:px-2.5 text-xs font-semibold text-foreground shadow-2xs hover:bg-muted cursor-pointer"
          >
            <IconBuildingStore size={15} className="text-primary shrink-0" />
            <span className="truncate max-w-[110px] sm:max-w-[160px]">
              {activeBusinessName || "My Business"}
            </span>
            <IconChevronDown size={13} className="text-muted-foreground shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56 rounded-xl p-1 shadow-lg text-xs">
          <DropdownMenuLabel className="font-semibold text-[11px] text-muted-foreground uppercase tracking-wider px-2 py-1">
            Switch Business Branch
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {businesses.map((b) => {
            const isSelected = b.name === activeBusinessName;

            return (
              <DropdownMenuItem
                key={b.id}
                onClick={() => handleSwitch(b)}
                className="cursor-pointer justify-between rounded-lg font-medium"
              >
                <div className="flex items-center gap-2 truncate">
                  <IconBuildingStore size={14} className={isSelected ? "text-primary" : "text-muted-foreground"} />
                  <span className="truncate">{b.name}</span>
                </div>
                {isSelected && <IconCheck size={14} className="text-primary shrink-0" />}
              </DropdownMenuItem>
            );
          })}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => setIsCreateOpen(true)}
            className="cursor-pointer gap-2 font-semibold text-primary rounded-lg"
          >
            <IconPlus size={14} />
            <span>Add New Branch</span>
          </DropdownMenuItem>

          <DropdownMenuItem asChild className="cursor-pointer gap-2 rounded-lg">
            <Link href="/dashboard/business">
              <IconSettings size={14} />
              <span>Manage All Branches</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateBusinessDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreated={() => {
          fetchBranches();
          router.refresh();
        }}
      />
    </>
  );
}
