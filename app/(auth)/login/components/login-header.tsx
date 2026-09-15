"use client";

import Link from "next/link";
import { Globe, ChevronDown, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function LoginHeader() {
  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between rounded-2xl border border-slate-100 bg-white/95 px-5 py-2.5 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-card/95">
      {/* Left: Creator / Developer Brand */}
      <div className="flex items-center gap-2.5">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-[#584ED2] to-indigo-400 text-white shadow-2xs">
          <User className="size-4.5" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">
            @sydul1431
          </span>
          <span className="text-[9px] font-semibold tracking-wider text-slate-400 dark:text-slate-500 uppercase mt-0.5">
            PROGRAMMER
          </span>
        </div>
      </div>

      {/* Right: About Us & Language Selector */}
      <div className="flex items-center gap-4">
        <Link
          href="/about"
          className="text-xs font-medium text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
        >
          About Us
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="flex h-8 items-center gap-1.5 rounded-lg border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-card dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Globe className="size-3.5 text-slate-500" />
              <span>EN</span>
              <ChevronDown className="size-3 text-slate-400" />
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
      </div>
    </header>
  );
}
