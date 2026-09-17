import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { connectToDatabase } from '@/lib/db';
import {
  Business,
  Location,
  Category,
  Service,
  Staff,
  CustomField,
} from '@/models';
import { BookingWizard } from '@/components/wizard/booking-wizard';
import { verifyAppointmentStripePaymentAction } from '@/actions/appointment-payment';
import type {
  ClientBusiness,
  ClientLocation,
  ClientCategory,
  ClientService,
  ClientStaff,
  ClientCustomField,
  WizardCatalog,
} from '@/types/wizard';
import type { ConfirmedBookingDetails } from '@/components/wizard/booking-confirmation-dialog';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    layout?: string;
    embed?: string;
    transparent?: string;
    payment?: string;
    session_id?: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  await connectToDatabase();
  const business = await Business.findOne({ slug }).lean();

  if (!business) {
    return {
      title: 'Appointment Booking',
    };
  }

  return {
    title: `Book Appointment | ${business.name}`,
    description: `Book your service online with ${business.name}. Fast, easy, and secure scheduling.`,
  };
}

export default async function AppointmentBookingPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const { layout, payment, session_id } = await searchParams;
  await connectToDatabase();

  let initialConfirmationDetails: ConfirmedBookingDetails | null = null;
  if (payment === 'success' && session_id) {
    const verifyRes = await verifyAppointmentStripePaymentAction(session_id);
    if (verifyRes.success && verifyRes.appointmentNumber) {
      initialConfirmationDetails = {
        appointmentNumber: verifyRes.appointmentNumber,
        businessSlug: slug,
        businessName: '',
        serviceName: '',
        staffName: '',
        locationName: '',
        date: '',
        time: '',
        customerName: '',
        customerEmail: '',
        price: verifyRes.amount || 0,
        currencySymbol: '$',
      };
    }
  }

  const businessDoc = await Business.findOne({ slug }).lean();
  if (!businessDoc) {
    notFound();
  }

  const businessId = businessDoc._id;

  const [locationsDocs, categoriesDocs, servicesDocs, staffDocs, customFieldsDocs] =
    await Promise.all([
      Location.find({ businessId }).lean(),
      Category.find({ businessId }).lean(),
      Service.find({ businessId }).lean(),
      Staff.find({ businessId }).lean(),
      CustomField.find({ businessId, status: { $ne: 'inactive' } }).sort({ sortOrder: 1 }).lean(),
    ]);

  const clientBusiness: ClientBusiness = {
    id: String(businessDoc._id),
    name: businessDoc.name,
    slug: businessDoc.slug,
    currency: businessDoc.currency || 'USD',
    currencySymbol: businessDoc.currencySymbol || '$',
    themeColor: businessDoc.themeColor || '#4F46E5',
    layout: (layout as string) || businessDoc.layout || 'Formlayout1',
    logoDark: businessDoc.logoDark,
    logoLight: businessDoc.logoLight,
    appointmentPrefix: businessDoc.appointmentPrefix,
    maximumSlot: businessDoc.maximumSlot || 1,
    businessHours: (businessDoc.businessHours || []).map((bh: {
      dayName: string;
      isOpen: boolean;
      startTime: string;
      endTime: string;
      breakHours?: { start: string; end: string }[];
    }) => ({
      dayName: bh.dayName as ClientBusiness['businessHours'] extends (infer U)[] | undefined ? (U extends { dayName: infer D } ? D : never) : never,
      isOpen: bh.isOpen,
      startTime: bh.startTime,
      endTime: bh.endTime,
      breakHours: bh.breakHours || [],
    })),
    holidays: (businessDoc.holidays || []).map((h: { date: string; description?: string }) => ({
      date: h.date,
      description: h.description,
    })),
  };

  const clientLocations: ClientLocation[] = locationsDocs.map((loc) => ({
    id: String(loc._id),
    name: loc.name,
    address: loc.address,
    phone: loc.phone,
    description: loc.description,
  }));

  const clientCategories: ClientCategory[] = categoriesDocs.map((cat) => ({
    id: String(cat._id),
    name: cat.name,
    description: cat.description,
  }));

  const clientServices: ClientService[] = servicesDocs.map((svc) => ({
    id: String(svc._id),
    categoryId: String(svc.categoryId),
    name: svc.name,
    durationMinutes: svc.durationMinutes || 30,
    price: svc.price || 0,
    isFree: svc.isFree ?? false,
    image: svc.image,
    description: svc.description,
  }));

  const clientStaff: ClientStaff[] = staffDocs.map((st) => ({
    id: String(st._id),
    name: st.name,
    locationIds: (st.locationIds || []).map(String),
    serviceIds: (st.serviceIds || []).map(String),
    colorCode: st.colorCode || '#4F46E5',
    description: st.description,
  }));

  const clientCustomFields: ClientCustomField[] = customFieldsDocs.map((cf) => ({
    id: String(cf._id),
    label: cf.label,
    type: cf.type,
    options: cf.options || [],
    placeholder: cf.placeholder,
    isRequired: cf.isRequired ?? false,
  }));

  const catalog: WizardCatalog = {
    locations: clientLocations,
    categories: clientCategories,
    services: clientServices,
    staff: clientStaff,
    customFields: clientCustomFields,
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-zinc-950">
      <BookingWizard
        business={clientBusiness}
        catalog={catalog}
        layoutOverride={layout}
        initialConfirmationDetails={initialConfirmationDetails}
      />
    </div>
  );
}
