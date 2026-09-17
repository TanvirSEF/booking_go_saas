"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  CalendarDays,
  User,
  LogOut,
  Menu,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface CustomerNavProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function CustomerNav({ user }: CustomerNavProps) {
  const pathname = usePathname();

  const navLinks = [
    { href: "/customer", label: "My Bookings", icon: CalendarDays },
    { href: "/customer/profile", label: "Profile & Security", icon: User },
  ];

  const getInitials = (name?: string | null, email?: string | null) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email?.charAt(0).toUpperCase() || "C";
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/customer" className="flex items-center gap-2 font-bold text-lg text-primary">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Sparkles className="w-5 h-5" />
            </div>
            <span>Customer Portal</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-9 w-9 border border-border">
                  <AvatarImage src={user?.image || ""} alt={user?.name || "Customer"} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {getInitials(user?.name, user?.email)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-semibold leading-none">{user?.name || "Customer"}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/customer" className="flex items-center gap-2 cursor-pointer">
                  <CalendarDays className="w-4 h-4 text-muted-foreground" />
                  <span>My Bookings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/customer/profile" className="flex items-center gap-2 cursor-pointer">
                  <ShieldCheck className="w-4 h-4 text-muted-foreground" />
                  <span>Profile & Security</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-red-600 dark:text-red-400 focus:text-red-600 cursor-pointer flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64">
                <SheetHeader className="mb-6">
                  <SheetTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <span>Customer Portal</span>
                  </SheetTitle>
                </SheetHeader>
                <div className="flex flex-col space-y-2">
                  {navLinks.map((link) => {
                    const Icon = link.icon;
                    const isActive = pathname === link.href;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {link.label}
                      </Link>
                    );
                  })}
                  <hr className="my-2 border-border" />
                  <Button
                    variant="ghost"
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="justify-start text-red-600 px-3 hover:bg-red-50 hover:text-red-600 w-full"
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    Log out
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
