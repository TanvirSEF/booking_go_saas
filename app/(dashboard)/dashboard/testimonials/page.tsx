import React from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/guards';
import { ACCESS, ROLES } from '@/lib/roles';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Business } from '@/models/Business';
import { getCompanyTestimonialsAction } from '@/actions/testimonial';
import { PageHeader } from '@/components/dashboard/page-header';
import { TestimonialCardGrid } from '@/components/dashboard/testimonials/testimonial-card-grid';
import { IconStar } from '@tabler/icons-react';

export const metadata: Metadata = {
  title: 'Customer Reviews & Testimonials | BookingGo Dashboard',
  description: 'Manage customer reviews, ratings, storefront visibility, and display ordering for your booking site.',
};

export default async function CompanyTestimonialsPage() {
  const session = await requireRole(ACCESS.company, '/dashboard/testimonials');

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

  const activeBusiness = user.activeBusinessId
    ? await Business.findOne({ _id: user.activeBusinessId, companyId }).select('_id name slug').lean()
    : await Business.findOne({ companyId }).select('_id name slug').lean();

  if (!activeBusiness) {
    redirect('/dashboard');
  }

  const res = await getCompanyTestimonialsAction();
  const testimonials = res.success && res.data ? res.data : [];

  return (
    <div className="min-h-screen pb-16 space-y-6">
      <PageHeader
        title="Customer Reviews & Testimonials"
        description={`Manage customer reviews, ratings, and social proof displayed for ${activeBusiness.name}.`}
        icon={<IconStar size={22} />}
        breadcrumbs={[{ label: 'Testimonials' }]}
      />

      <main className="mx-auto px-4 sm:px-6">
        <TestimonialCardGrid
          initialTestimonials={testimonials}
          businessSlug={activeBusiness.slug}
        />
      </main>
    </div>
  );
}
