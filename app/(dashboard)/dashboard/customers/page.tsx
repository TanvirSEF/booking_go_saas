import React from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/guards';
import { ACCESS, ROLES } from '@/lib/roles';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Business } from '@/models/Business';
import { getCompanyCustomersAction } from '@/actions/customer-crm';
import { PageHeader } from '@/components/dashboard/page-header';
import { CustomerDataTable } from '@/components/dashboard/customers/customer-data-table';
import { IconUsers } from '@tabler/icons-react';

export const metadata: Metadata = {
  title: 'Customer Directory & CRM | BookingGo Dashboard',
  description: 'Manage customers, track appointment visit history, and monitor lifetime spend metrics.',
};

interface CustomersPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const session = await requireRole(ACCESS.company, '/dashboard/customers');

  await connectToDatabase();

  const user = await User.findById(session.user.id).lean();
  if (!user) {
    redirect('/login');
  }

  const companyId =
    user.role === ROLES.COMPANY
      ? user._id
      : user.companyId || null;

  if (!companyId) {
    redirect('/dashboard');
  }

  const resolvedParams = await searchParams;
  const page = Math.max(1, parseInt(String(resolvedParams.page || '1'), 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(String(resolvedParams.limit || '10'), 10) || 10));
  const search = typeof resolvedParams.search === 'string' ? resolvedParams.search : undefined;

  // Fetch active business context & initial customer records concurrently
  const [activeBusiness, customersRes] = await Promise.all([
    user.activeBusinessId
      ? Business.findOne({ _id: user.activeBusinessId, companyId }).select('name slug').lean()
      : Business.findOne({ companyId }).select('name slug').lean(),
    getCompanyCustomersAction({ page, limit, search }),
  ]);

  const initialCustomers =
    customersRes.success && customersRes.data?.customers
      ? JSON.parse(JSON.stringify(customersRes.data.customers))
      : [];

  const totalRecords =
    customersRes.success && customersRes.data?.total
      ? customersRes.data.total
      : 0;

  return (
    <div className="min-h-screen pb-16">
      {/* Top Header & Breadcrumbs */}
      <PageHeader
        title="Customers"
        description={
          activeBusiness?.name
            ? `Customer directory and lifetime booking history for ${activeBusiness.name}.`
            : 'Manage customer records, track total visits, and monitor lifetime client spend.'
        }
        icon={<IconUsers size={22} />}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Customers' },
        ]}
      />

      {/* Main Content Area */}
      <main className="mx-auto px-4 sm:px-6 pt-6">
        <CustomerDataTable
          initialCustomers={initialCustomers}
          totalRecords={totalRecords}
          page={page}
          limit={limit}
          search={search || ''}
        />
      </main>
    </div>
  );
}
