import React from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/auth';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Business } from '@/models/Business';
import { getCategories } from '@/actions/service';
import { CategoryDataTable } from '@/components/dashboard/services/category-data-table';
import {
  IconFolder,
  IconChevronRight,
  IconHome,
} from '@tabler/icons-react';

export const metadata: Metadata = {
  title: 'Categories | Services | BookingGo Dashboard',
  description: 'Organize and manage your service categories for the booking wizard.',
};

export default async function CategoriesPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/dashboard/services/categories');
  }

  await connectToDatabase();

  const user = await User.findById(session.user.id).lean();
  if (!user) {
    redirect('/login');
  }

  const companyId =
    user.role === 'company'
      ? user._id
      : user.companyId || null;

  if (!companyId) {
    redirect('/dashboard');
  }

  const [activeBusiness, categoriesResult] = await Promise.all([
    user.activeBusinessId
      ? Business.findById(user.activeBusinessId).select('name slug').lean()
      : Business.findOne({ companyId }).select('name slug').lean(),
    getCategories(),
  ]);

  const categories = categoriesResult.success && categoriesResult.data ? categoriesResult.data : [];

  return (
    <div className="min-h-screen">
      {/* Top Header & Breadcrumbs */}
      <div>
        <div className="mx-auto px-4 sm:px-6">
          {/* Breadcrumb Navigation */}
          <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-3 font-medium">
            <Link
              href="/dashboard"
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <IconHome size={14} />
              <span>Dashboard</span>
            </Link>
            <IconChevronRight size={13} className="text-muted-foreground/60" />
            <Link
              href="/dashboard/services/catalog"
              className="hover:text-foreground transition-colors"
            >
              Services
            </Link>
            <IconChevronRight size={13} className="text-muted-foreground/60" />
            <span className="text-foreground font-semibold">Categories</span>
          </nav>

          {/* Page Title & Business Indicator */}
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
              <IconFolder size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Service Categories
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {activeBusiness?.name
                  ? `Organizing categories for ${activeBusiness.name}`
                  : 'Group and structure your offerings for client bookings.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="w-full mx-auto p-4 sm:p-6">
        <CategoryDataTable initialCategories={categories} />
      </main>
    </div>
  );
}
