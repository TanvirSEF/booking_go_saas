import React from 'react';
import Link from 'next/link';
import { IconChevronRight, IconHome } from '@tabler/icons-react';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  title: string;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  icon,
  breadcrumbs,
  actions,
  className,
  children,
}: PageHeaderProps) {
  const items: BreadcrumbItem[] =
    breadcrumbs && breadcrumbs.length > 0 && breadcrumbs[0].label.toLowerCase() === 'dashboard'
      ? breadcrumbs
      : [{ label: 'Dashboard', href: '/dashboard' }, ...(breadcrumbs || [])];

  return (
    <div className={cn('mx-auto px-4 sm:px-6', className)}>
      <nav
        aria-label="Breadcrumbs"
        className="flex items-center gap-2 text-xs text-muted-foreground mb-3 font-medium flex-wrap"
      >
        {items.map((item, index) => {
          const isFirst = index === 0;
          const isLast = index === items.length - 1;

          return (
            <React.Fragment key={`${item.label}-${index}`}>
              {index > 0 && (
                <IconChevronRight
                  size={13}
                  className="text-muted-foreground/60 shrink-0"
                />
              )}
              {isLast ? (
                <span className="text-foreground font-semibold truncate max-w-xs sm:max-w-md">
                  {item.label}
                </span>
              ) : item.href ? (
                <Link
                  href={item.href}
                  className="flex items-center gap-1 hover:text-foreground transition-colors truncate"
                >
                  {isFirst && <IconHome size={14} className="shrink-0" />}
                  <span>{item.label}</span>
                </Link>
              ) : (
                <span className="text-muted-foreground truncate">
                  {item.label}
                </span>
              )}
            </React.Fragment>
          );
        })}
      </nav>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {icon && (
            <div className="size-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-foreground truncate">
              {title}
            </h1>
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {description}
              </p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0">{actions}</div>
        )}
      </div>

      {children}
    </div>
  );
}
