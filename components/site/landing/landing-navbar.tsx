import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { ICustomPageItem } from "@/types/landing-page";

interface LandingNavbarProps {
  customPages?: ICustomPageItem[];
  brandTitle?: string;
  brandLogo?: string;
}

export function LandingNavbar({
  customPages = [],
  brandTitle = "BookingGo",
  brandLogo,
}: LandingNavbarProps) {
  const headerPages = customPages.filter((p) => p.header);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2">
          {brandLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brandLogo} alt={brandTitle} className="h-8 w-auto object-contain" />
          ) : (
            <div className="flex items-center gap-2">
              <span className="size-8 rounded-lg bg-primary text-primary-foreground font-bold flex items-center justify-center text-base shadow-xs">
                B
              </span>
              <span className="font-bold text-lg tracking-tight text-foreground">
                {brandTitle}
              </span>
            </div>
          )}
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-muted-foreground">
          <a href="#features" className="hover:text-foreground transition-colors">
            Features
          </a>
          <a href="#highlight" className="hover:text-foreground transition-colors">
            Dedicated Modules
          </a>
          <a href="#screenshots" className="hover:text-foreground transition-colors">
            Interface
          </a>
          <a href="#built-tech" className="hover:text-foreground transition-colors">
            Technology
          </a>
          <a href="#reviews" className="hover:text-foreground transition-colors">
            Reviews
          </a>
          <a href="#faq" className="hover:text-foreground transition-colors">
            FAQ
          </a>

          {/* Dynamic Custom Pages with header: true */}
          {headerPages.map((page) => (
            <Link
              key={page.id}
              href={page.templateType === "url" ? (page.pageUrl || "#") : `/pages/${page.slug}`}
              className="hover:text-foreground transition-colors"
            >
              {page.name}
            </Link>
          ))}
        </nav>

        {/* CTA Buttons */}
        <div className="flex items-center gap-2.5">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="h-8 text-xs font-semibold">
              Sign In
            </Button>
          </Link>
          <Link href="/register">
            <Button size="sm" className="h-8 text-xs font-semibold shadow-xs">
              Get Started
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
