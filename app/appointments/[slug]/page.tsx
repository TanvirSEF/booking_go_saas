import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { connectToDatabase } from '@/lib/db';
import { Business } from '@/models/Business';
import { Location } from '@/models/Location';
import { Category } from '@/models/Category';
import { Service } from '@/models/Service';
import { Staff } from '@/models/Staff';
import { CustomField } from '@/models/CustomField';
import { BookingWizard } from '@/components/wizard/booking-wizard';
import type {
  ClientBusiness,
  ClientLocation,
  ClientCategory,
  ClientService,
  ClientStaff,
  ClientCustomField,
  WizardCatalog,
} from '@/types/wizard';

interface AppointmentPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: AppointmentPageProps): Promise<Metadata> {
  const { slug } = await params;
  await connectToDatabase();

  const business = await Business.findOne({ slug }).select('name').lean();
  if (!business) {
    return {
      title: 'Business Not Found | BookingGo SaaS',
    };
  }

  return {
    title: `Book Appointment - ${business.name} | BookingGo`,
    description: `Book your next service with ${business.name} online quickly and easily.`,
  };
}

export default async function AppointmentBookingPage({
  params,
}: AppointmentPageProps) {
  const { slug } = await params;
  await connectToDatabase();

  // 1. Fetch Business by slug
  const businessDoc = await Business.findOne({ slug }).lean();
  if (!businessDoc) {
    notFound();
  }

  const businessId = businessDoc._id;

  // 2. Fetch all related catalog entities in parallel
  const [locationsDocs, categoriesDocs, servicesDocs, staffDocs, customFieldsDocs] =
    await Promise.all([
      Location.find({ businessId, isActive: true }).sort({ name: 1 }).lean(),
      Category.find({ businessId }).sort({ name: 1 }).lean(),
      Service.find({ businessId, isActive: true }).sort({ name: 1 }).lean(),
      Staff.find({ businessId, isActive: true }).sort({ name: 1 }).lean(),
      CustomField.find({ businessId }).lean(),
    ]);

  // 3. Serialize to client-safe plain JSON objects
  const business: ClientBusiness = {
    id: String(businessDoc._id),
    name: businessDoc.name,
    slug: businessDoc.slug,
    currency: businessDoc.currency || 'USD',
    currencySymbol: businessDoc.currencySymbol || '$',
    themeColor: businessDoc.themeColor || 'color1-Formlayout1',
    layout: businessDoc.layout || 'Formlayout1',
    logoDark: businessDoc.logoDark,
    logoLight: businessDoc.logoLight,
    appointmentPrefix: businessDoc.appointmentPrefix,
    maximumSlot: businessDoc.maximumSlot || 1,
    businessHours: (businessDoc.businessHours || []).map((bh) => ({
      dayName: bh.dayName,
      isOpen: bh.isOpen,
      startTime: bh.startTime,
      endTime: bh.endTime,
      breakHours: (bh.breakHours || []).map((br) => ({
        start: br.start,
        end: br.end,
      })),
    })),
    holidays: (businessDoc.holidays || []).map((h) => ({
      date: h.date,
      description: h.description,
    })),
  };

  const locations: ClientLocation[] = locationsDocs.map((loc) => ({
    id: String(loc._id),
    name: loc.name,
    address: loc.address,
    phone: loc.phone,
    description: loc.description,
  }));

  const categories: ClientCategory[] = categoriesDocs.map((cat) => ({
    id: String(cat._id),
    name: cat.name,
    description: cat.description,
  }));

  const services: ClientService[] = servicesDocs.map((srv) => ({
    id: String(srv._id),
    categoryId: String(srv.categoryId),
    name: srv.name,
    durationMinutes: srv.durationMinutes,
    price: srv.price,
    isFree: srv.isFree || false,
    image: srv.image,
    description: srv.description,
  }));

  const staff: ClientStaff[] = staffDocs.map((stf) => ({
    id: String(stf._id),
    name: stf.name,
    locationIds: (stf.locationIds || []).map((id) => String(id)),
    serviceIds: (stf.serviceIds || []).map((id) => String(id)),
    colorCode: stf.colorCode || '#3b82f6',
    description: stf.description,
  }));

  const customFields: ClientCustomField[] = customFieldsDocs.map((cf) => ({
    id: String(cf._id),
    label: cf.label,
    type: cf.type,
    options: cf.options,
    placeholder: cf.placeholder,
    isRequired: cf.isRequired,
  }));

  const catalog: WizardCatalog = {
    locations,
    categories,
    services,
    staff,
    customFields,
  };

  return <BookingWizard business={business} catalog={catalog} />;
}
