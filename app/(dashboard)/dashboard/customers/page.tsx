import React from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
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

export default async function CustomersPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/dashboard/customers');
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

  // Fetch active business context & initial customer records concurrently
  const [activeBusiness, customersRes] = await Promise.all([
    user.activeBusinessId
      ? Business.findById(user.activeBusinessId).select('name slug').lean()
      : Business.findOne({ companyId }).select('name slug').lean(),
    getCompanyCustomersAction({ page: 1, limit: 15 }),
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
          initialPage={1}
          pageSize={15}
        />
      </main>
    </div>
  );
}
