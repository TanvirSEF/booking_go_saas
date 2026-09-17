import React from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Business } from '@/models/Business';
import { getCustomFieldsAction } from '@/actions/custom-field';
import { PageHeader } from '@/components/dashboard/page-header';
import { CustomFieldBuilder } from '@/components/dashboard/custom-fields/custom-field-builder';
import { IconForms } from '@tabler/icons-react';

export const metadata: Metadata = {
  title: 'Custom Intake Fields | BookingGo Dashboard',
  description: 'Design dynamic customer questionnaire and intake fields for online appointment bookings.',
};

export default async function CustomFieldsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/dashboard/custom-fields');
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

  // Fetch active business context & fields concurrently
  const [activeBusiness, fieldsRes] = await Promise.all([
    user.activeBusinessId
      ? Business.findById(user.activeBusinessId).select('name slug').lean()
      : Business.findOne({ companyId }).select('name slug').lean(),
    getCustomFieldsAction(),
  ]);

  const initialFields =
    fieldsRes.success && fieldsRes.data
      ? JSON.parse(JSON.stringify(fieldsRes.data))
      : [];

  return (
    <div className="min-h-screen pb-16">
      {/* Top Header & Breadcrumbs */}
      <PageHeader
        title="Custom Intake Fields"
        description={
          activeBusiness?.name
            ? `Configure online booking questionnaire for ${activeBusiness.name}.`
            : 'Customize intake form questions presented to customers during appointment booking.'
        }
        icon={<IconForms size={22} />}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Custom Fields' },
        ]}
      />

      {/* Main Content Area */}
      <main className="mx-auto px-4 sm:px-6 pt-6">
        <CustomFieldBuilder initialFields={initialFields} />
      </main>
    </div>
  );
}
