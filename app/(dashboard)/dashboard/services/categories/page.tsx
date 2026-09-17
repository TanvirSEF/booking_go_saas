import React from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Business } from '@/models/Business';
import { getCategories } from '@/actions/service';
import { CategoryDataTable } from '@/components/dashboard/services/category-data-table';
import { PageHeader } from '@/components/dashboard/page-header';
import { IconFolder } from '@tabler/icons-react';

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
      <PageHeader
        title="Service Categories"
        description={
          activeBusiness?.name
            ? `Organizing categories for ${activeBusiness.name}`
            : 'Group and structure your offerings for client bookings.'
        }
        icon={<IconFolder size={24} />}
        breadcrumbs={[
          { label: 'Services', href: '/dashboard/services/catalog' },
          { label: 'Categories' },
        ]}
      />

      {/* Main Content Area */}
      <main className="w-full mx-auto p-4 sm:p-6">
        <CategoryDataTable initialCategories={categories} />
      </main>
    </div>
  );
}
