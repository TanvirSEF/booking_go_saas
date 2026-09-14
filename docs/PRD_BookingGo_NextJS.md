# Exhaustive Product Requirement Document (PRD) & Technical Specification
## Project: BookingGo SaaS Full-Stack Migration (Next.js + MongoDB)
**Target Architecture:** Full-Stack Next.js 14/15 (App Router, Server Actions, Route Handlers) + TypeScript + MongoDB (Mongoose)  
**Target Delivery:** 48–72h Core Sprint + 48h Hardening & Polish  
**Engineering Team:** 4 Developers

---

## 1. Product Architectural Blueprint

### 1.1 Architectural Paradigm
BookingGo is a **Multi-Tenant SaaS Appointment & Scheduling Engine**.
- **Tenant Isolation:** A tenant is represented by a `User` (role: `company`). A company can own multiple `Businesses` (branches/brands), each with its own slug (e.g., `/appointments/downtown-salon`).
- **Data Scoping:** Every business entity (Location, Category, Service, Staff, Appointment, Holiday, BusinessHour) carries both `businessId` and `companyId` (`createdBy`) to ensure strict multi-tenant isolation.
- **Single-Codebase Full-Stack:** Server Components + Server Actions handle 80% of data mutations and SSR. Route Handlers (`app/api/...`) handle external webhooks (Stripe/PayPal), slot calculation APIs, and potential mobile client integration.

```
                    ┌─────────────────────────────────────────────────────────┐
                    │               NEXT.JS APP ROUTER (TypeScript)           │
                    └───────────┬─────────────────────────────────┬───────────┘
                                │                                 │
           ┌────────────────────▼──────────────────┐   ┌──────────▼──────────────────┐
           │          FRONTEND EXPERIENCE          │   │      BACKEND / API LAYER    │
           │  • Public Booking Wizard (SSR + CSR)  │   │  • Server Actions (Mutations│
           │  • Super Admin Console                │   │  • Route Handlers (/api/..) │
           │  • Company Management Portal          │   │  • Slot Engine (Algorithms) │
           │  • Staff Schedule Portal              │   │  • Webhooks (Stripe/PayPal) │
           └────────────────────┬──────────────────┘   └──────────┬──────────────────┘
                                │                                 │
                                └────────────────┬────────────────┘
                                                 │
                               ┌─────────────────▼─────────────────┐
                               │       MONGOOSE ODM / MONGODB      │
                               │  Multi-Tenant Collections + Index │
                               └───────────────────────────────────┘
```

---

## 2. Complete MongoDB Schema Specifications (All 39 Models Mapped)

Below is the complete database dictionary. All collections use standard MongoDB `_id` (`ObjectId`) and automatic timestamps (`createdAt`, `updatedAt`).

### 2.1 Collection: `users`
Represents platform administrators, business owners, staff members, and customers.
```typescript
export interface IUser {
  _id: ObjectId;
  name: string;
  email: string; // unique index, lowercase
  password?: string; // bcrypt hash (null if guest/social)
  mobileNo?: string;
  role: 'super admin' | 'company' | 'staff' | 'customer';
  companyId?: ObjectId; // ref: users (for staff & customers belonging to a company)
  activeBusinessId?: ObjectId; // ref: businesses (current active business for company)
  avatar?: string;
  lang: string; // default: 'en'
  darkMode: boolean; // default: false
  isActive: boolean; // default: true
  emailVerifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### 2.2 Collection: `businesses` (Includes BusinessHours & Holidays)
Replaces 3 MySQL tables (`businesses`, `business_hours`, `business_holidays`) into a high-performance single document.
```typescript
export interface IBreakHour {
  start: string; // "13:00"
  end: string;   // "14:00"
}

export interface IBusinessHour {
  dayName: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  isOpen: boolean;
  startTime: string; // "09:00"
  endTime: string;   // "18:00"
  breakHours: IBreakHour[]; // Multiple break windows
}

export interface IBusinessHoliday {
  date: string; // "YYYY-MM-DD"
  description?: string;
}

export interface IBusiness {
  _id: ObjectId;
  companyId: ObjectId; // ref: users
  name: string;
  slug: string; // unique index, e.g. "barber-shop"
  formType: 'form-layout' | 'theme'; // Layout type
  layout: 'Formlayout1' | 'Formlayout2';
  themeColor: string; // e.g. "color1-Formlayout1"
  logoDark?: string;
  logoLight?: string;
  currency: string; // "USD"
  currencySymbol: string; // "$"
  appointmentPrefix: string; // "#APP000"
  maximumSlot: number; // Max capacity per slot (default: 1)
  appointmentReminderHours: number; // Hours before appointment to send reminder (default: 24)
  domain?: string; // Custom domain mapping
  businessHours: IBusinessHour[];
  holidays: IBusinessHoliday[];
  settings: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
```

### 2.3 Collections: `locations` & `categories`
```typescript
export interface ILocation {
  _id: ObjectId;
  companyId: ObjectId;
  businessId: ObjectId;
  name: string;
  address?: string;
  description?: string;
  isActive: boolean;
}

export interface ICategory {
  _id: ObjectId;
  companyId: ObjectId;
  businessId: ObjectId;
  name: string;
  description?: string;
}
```

### 2.4 Collection: `services`
```typescript
export interface IService {
  _id: ObjectId;
  companyId: ObjectId;
  businessId: ObjectId;
  categoryId: ObjectId; // ref: categories
  name: string;
  durationMinutes: number; // e.g., 30, 45, 60
  price: number;
  isFree: boolean; // default: false
  image?: string;
  description?: string;
  onlineMeetingType?: 'none' | 'zoom' | 'google_meet';
  onlineMeetingUrl?: string;
  isActive: boolean;
}
```

### 2.5 Collection: `staff`
```typescript
export interface IStaff {
  _id: ObjectId;
  userId: ObjectId; // ref: users (linked staff login credentials)
  companyId: ObjectId;
  businessId: ObjectId;
  name: string;
  locationIds: ObjectId[]; // ref: locations
  serviceIds: ObjectId[];  // ref: services
  colorCode: string; // Hex color for calendar, e.g. "#B4E4CD"
  description?: string;
  isActive: boolean;
}
```

### 2.6 Collection: `customers`
```typescript
export interface ICustomer {
  _id: ObjectId;
  userId?: ObjectId; // ref: users (if registered user)
  companyId: ObjectId;
  businessId: ObjectId;
  name: string;
  email: string;
  contact: string;
  gender?: 'male' | 'female' | 'other';
  dob?: string;
  description?: string;
}
```

### 2.7 Collection: `appointments` (Core Transaction)
```typescript
export interface IAppointment {
  _id: ObjectId;
  appointmentNumber: string; // e.g. "#APP00014"
  companyId: ObjectId;
  businessId: ObjectId;
  customerId?: ObjectId; // ref: customers (null if pure guest)
  customerType: 'new-user' | 'existing-user' | 'guest-user';
  name: string; // Guest or customer name
  email: string;
  contact: string;
  locationId: ObjectId; // ref: locations
  serviceId: ObjectId;  // ref: services
  staffId: ObjectId;    // ref: staff
  date: string; // "DD-MM-YYYY" (standardized)
  time: string; // "09:30-10:00" or "09:30"
  durationMinutes: number;
  notes?: string;
  appointmentStatus: string; // "Pending" | "Confirmed" | "Completed" | "Cancelled" or customStatus
  statusColor?: string;
  paymentType: 'Manually' | 'Stripe' | 'PayPal' | 'BankTransfer' | 'Free';
  paymentStatus: 'unpaid' | 'paid' | 'refunded';
  attachment?: string;
  customFields?: Record<string, any>; // Dynamic key-values from CustomField
  createdAt: Date;
  updatedAt: Date;
}
```

### 2.8 Collection: `appointment_payments`
```typescript
export interface IAppointmentPayment {
  _id: ObjectId;
  appointmentId: ObjectId; // ref: appointments
  companyId: ObjectId;
  businessId: ObjectId;
  paymentType: string;
  amount: number;
  paymentDate: Date;
  txnId?: string;
  receiptUrl?: string;
}
```

### 2.9 Collections: `custom_fields` & `custom_statuses`
```typescript
export interface ICustomField {
  _id: ObjectId;
  companyId: ObjectId;
  businessId: ObjectId;
  name: string;
  type: 'text' | 'number' | 'email' | 'date' | 'select' | 'textarea';
  options?: string[]; // For 'select' dropdown options
  isRequired: boolean;
}

export interface ICustomStatus {
  _id: ObjectId;
  companyId: ObjectId;
  businessId: ObjectId;
  title: string;
  statusColor: string; // e.g. "#28a745"
}
```

### 2.10 Collections: `plans`, `orders`, `coupons`, `bank_transfers` (SaaS Monetization)
```typescript
export interface IPlan {
  _id: ObjectId;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  maxBusinesses: number;
  maxLocations: number;
  maxServices: number;
  maxStaff: number;
  storageLimitMb: number;
  isEnabled: boolean;
  trialDays: number; // default: 0
  description?: string;
}

export interface ICoupon {
  _id: ObjectId;
  name: string;
  code: string; // unique index, uppercase
  discountType: 'percentage' | 'flat';
  discount: number;
  limit: number;
  usedCount: number;
  minimumSpend?: number;
  maximumSpend?: number;
  expiryDate?: Date;
  isActive: boolean;
}

export interface IOrder {
  _id: ObjectId;
  orderNumber: string;
  companyId: ObjectId; // ref: users (company)
  planId: ObjectId;
  planName: string;
  billingCycle: 'monthly' | 'yearly';
  amount: number;
  discountAmount: number;
  couponCode?: string;
  currency: string;
  paymentType: 'Stripe' | 'PayPal' | 'BankTransfer' | 'Manual';
  paymentStatus: 'succeeded' | 'pending' | 'failed';
  txnId?: string;
  receiptUrl?: string;
  createdAt: Date;
}

export interface IBankTransferPayment {
  _id: ObjectId;
  orderId: ObjectId; // ref: orders
  companyId: ObjectId;
  amount: number;
  currency: string;
  receiptImage: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  notes?: string;
  createdAt: Date;
}
```

### 2.11 Collections: `email_templates` & `notification_templates`
```typescript
export interface IEmailTemplate {
  _id: ObjectId;
  slug: string; // e.g., "new_appointment", "appointment_status_change"
  name: string;
  fromName: string;
  subject: Record<string, string>; // { "en": "New Appointment Booked", "es": "..." }
  content: Record<string, string>; // HTML template supporting variables: {customer_name}, {appointment_date}, {service_name}, etc.
}
```

### 2.12 Collections: `blogs`, `testimonials`, `contact_us`, `subscribes` (Marketing & CMS)
```typescript
export interface IBlog {
  _id: ObjectId;
  companyId: ObjectId;
  businessId: ObjectId;
  title: string;
  slug: string;
  content: string;
  image?: string;
  isPublished: boolean;
  createdAt: Date;
}

export interface ITestimonial {
  _id: ObjectId;
  companyId: ObjectId;
  businessId: ObjectId;
  name: string;
  title?: string;
  rating: number; // 1 to 5
  description: string;
  image?: string;
}

export interface IContactUs {
  _id: ObjectId;
  companyId: ObjectId;
  businessId: ObjectId;
  name: string;
  email: string;
  contact?: string;
  subject: string;
  description: string;
  createdAt: Date;
}

export interface ISubscribe {
  _id: ObjectId;
  companyId: ObjectId;
  businessId: ObjectId;
  email: string;
  createdAt: Date;
}
```

### 2.13 Collection: `settings` (Platform & Tenant Key-Value Store)
```typescript
export interface ISetting {
  _id: ObjectId;
  ownerId: ObjectId; // 0 for Super Admin, companyId for Tenant
  businessId?: ObjectId;
  key: string;
  value: string;
}
```

---

## 3. Exhaustive Business Logic & Calculation Algorithms

### 3.1 Time Slot Calculation Algorithm (`lib/booking-engine.ts`)
This algorithm determines available time slots on any given date for a specific service and optional staff selection.

```typescript
export interface SlotQuery {
  businessId: string;
  serviceId: string;
  staffId?: string; // Optional: user may choose "Any Staff"
  locationId: string;
  dateStr: string; // "DD-MM-YYYY"
}

export interface TimeSlot {
  start: string; // "09:30"
  end: string;   // "10:00"
  serviceId: string;
  availableStaffIds: string[];
}

export async function calculateAvailableSlots(query: SlotQuery): Promise<TimeSlot[]> {
  const { businessId, serviceId, staffId, locationId, dateStr } = query;

  // 1. Fetch Business, Service & Staff records in parallel
  const [business, service, eligibleStaff] = await Promise.all([
    Business.findById(businessId).lean(),
    Service.findById(serviceId).lean(),
    Staff.find({
      businessId,
      locationIds: locationId,
      serviceIds: serviceId,
      isActive: true,
      ...(staffId ? { _id: staffId } : {})
    }).lean()
  ]);

  if (!business || !service || eligibleStaff.length === 0) return [];

  // 2. Holiday Verification (Check if date is in business holidays)
  const isHoliday = business.holidays.some(h => h.date === dateStr);
  if (isHoliday) return [];

  // 3. Day of Week Verification
  const parsedDate = parseDate(dateStr); // dayjs or date-fns
  const dayName = parsedDate.format('dddd'); // "Monday"
  const daySchedule = business.businessHours.find(b => b.dayName === dayName);

  if (!daySchedule || !daySchedule.isOpen) return [];

  // 4. Fetch All Active Appointments for that Date & Business
  const activeAppointments = await Appointment.find({
    businessId,
    date: dateStr,
    appointmentStatus: { $ne: 'Cancelled' }
  }).select('time staffId durationMinutes').lean();

  // 5. Generate Candidate Intervals
  const duration = service.durationMinutes;
  const startMoment = parseTime(daySchedule.startTime); // e.g. 09:00
  const endMoment = parseTime(daySchedule.endTime);     // e.g. 18:00
  const breaks = daySchedule.breakHours || [];
  const maxSlotCapacity = business.maximumSlot || 1;

  // If date is today, eliminate slots past current time
  const isToday = parsedDate.isSame(dayjs(), 'day');
  const nowTime = dayjs().format('HH:mm');

  const slots: TimeSlot[] = [];
  let current = startMoment;

  while (current.add(duration, 'minute').isSameOrBefore(endMoment)) {
    const slotStart = current.format('HH:mm');
    const slotEnd = current.add(duration, 'minute').format('HH:mm');

    // Check if slot falls within any break window
    const insideBreak = breaks.some(b => 
      (slotStart >= b.start && slotStart < b.end) || 
      (slotEnd > b.start && slotEnd <= b.end)
    );

    if (!insideBreak && (!isToday || slotStart > nowTime)) {
      // Find staff available during this slot window
      const availableStaff = eligibleStaff.filter(staffMember => {
        // Count overlapping appointments for this staff
        const conflicts = activeAppointments.filter(app => 
          String(app.staffId) === String(staffMember._id) && 
          isTimeOverlapping(slotStart, slotEnd, app.time)
        );
        return conflicts.length < maxSlotCapacity;
      });

      if (availableStaff.length > 0) {
        slots.push({
          start: slotStart,
          end: slotEnd,
          serviceId,
          availableStaffIds: availableStaff.map(s => String(s._id))
        });
      }
    }

    current = current.add(duration, 'minute'); // or slotInterval (e.g. 15m / 30m)
  }

  return slots;
}
```

### 3.2 Appointment Submission Logic (`actions/appointment.ts`)
1. **Concurrency Lock / Race Protection:**
   - When a booking is submitted, query active appointments for `(staffId, date, time)`.
   - If `bookedCount >= maximumSlot`, reject with `409 Conflict: "This slot was just booked by another customer."`
2. **User Identity Handling:**
   - **`new-user`:** Validate password -> Create `User` (role: `customer`) -> Create `Customer` profile -> Link `Appointment.customerId = customer._id`.
   - **`existing-user`:** Query `User` by email -> Compare bcrypt password -> If valid, retrieve `Customer` -> Link `Appointment.customerId = customer._id`.
   - **`guest-user`:** Store `name`, `email`, `contact` directly on `Appointment` without creating user record.
3. **Sequential Appointment Numbering:**
   - Format: `business.appointmentPrefix + sprintf("%05d", count + 1)`.
4. **Auto Notification Trigger:**
   - Load `new_appointment` email template -> Replace `{customer_name}`, `{service_name}`, `{appointment_date}`, `{appointment_time}` -> Send via Nodemailer to customer & company.

### 3.3 SaaS Plan & Subscription Enforcement Middleware
- Every time a company creates a resource (Staff, Service, Location, Business), verify against their active `Plan`:
  ```typescript
  export async function verifyPlanLimit(companyId: string, resource: 'staff' | 'service' | 'location' | 'business') {
    const user = await User.findById(companyId);
    const activeOrder = await Order.findOne({ companyId, paymentStatus: 'succeeded' }).sort({ createdAt: -1 });
    const plan = activeOrder ? await Plan.findById(activeOrder.planId) : await Plan.findOne({ name: 'Free' });

    if (resource === 'staff') {
      const count = await Staff.countDocuments({ companyId });
      if (count >= plan.maxStaff) throw new Error(`Staff limit of ${plan.maxStaff} reached on your plan.`);
    }
    // Repeat for service, location, business
  }
  ```

---

## 4. Work Distribution Matrix for 4 Developers

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   DEV 1: ARCHITECTURE & BACKEND CORE                            │
│  • Next.js + TypeScript + MongoDB bootstrap                                                     │
│  • Mongoose models for User, Business, Location, Category, Service, Staff, Appointment          │
│  • NextAuth.js v5 (Credentials, Sessions, RBAC middleware)                                      │
│  • Core Slot Calculation Engine (`lib/booking-engine.ts`)                                       │
│  • Server Actions: Booking submission with atomic slot lock & custom fields                     │
└───────────────────────────────────────────────┬─────────────────────────────────────────────────┘
                                                │
                 ┌──────────────────────────────┴──────────────────────────────┐
                 │                                                             │
┌────────────────▼──────────────────────────────┐            ┌─────────────────▼──────────────────────────────┐
│       DEV 2: PUBLIC EXPERIENCE & WIZARD       │            │       DEV 3: COMPANY & STAFF DASHBOARD         │
│  • Tailwind CSS & shadcn/ui Component Library │            │  • Company Dashboard KPIs & Analytics          │
│  • Public Booking Wizard (/appointments/[slug])│           │  • Interactive FullCalendar View & Status Modal│
│    Step 1: Location & Category                │            │  • CRUD for Services, Categories & Locations   │
│    Step 2: Service & Staff Selection          │            │  • Staff Management & Service Assignment       │
│    Step 3: Date Picker & Real-Time Slots      │            │  • Business Hours & Break Time Settings        │
│    Step 4: Customer Details & Custom Fields   │            │  • Business Holidays Manager                   │
│    Step 5: Checkout (Cash, Stripe, PayPal)    │            │  • Customer CRM Table & Appointment History    │
│  • Public Appointment Tracking Page           │            │  • Custom Statuses & Custom Fields Builder     │
│  • Theme Switcher (Car Service / Photography) │            │                                                │
└────────────────┬──────────────────────────────┘            └─────────────────┬──────────────────────────────┘
                 │                                                             │
                 └──────────────────────────────┬──────────────────────────────┘
                                                │
┌───────────────────────────────────────────────▼─────────────────────────────────────────────────┐
│                             DEV 4: SUPER ADMIN, BILLING & INTEGRATIONS                          │
│  • Super Admin Console: Companies, Users, Global Analytics                                      │
│  • SaaS Subscription Plans CRUD & Feature Limit Controls                                        │
│  • Stripe Checkout & Webhook Handlers (/api/webhooks/stripe)                                    │
│  • PayPal Checkout Integration                                                                  │
│  • Manual Bank Transfer Payment Flow with Receipt Upload                                        │
│  • Nodemailer Notification System (Template Variable Replacement Engine)                        │
│  • Global Settings: Brand Logo, Currencies, Timezones, SEO Meta, Cookie Consent                 │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### Detailed Deliverable Breakdown by Developer

#### 👨‍💻 Developer 1: Architecture & Backend Core
1. **`lib/db.ts`**: MongoDB connection caching singleton for Serverless/Node.
2. **`models/*.ts`**: 13 Mongoose models complete with TypeScript interfaces, indexes, and pre-save hooks.
3. **`lib/auth.ts` & `middleware.ts`**: NextAuth.js v5 setup, JWT session callbacks, route guarding for `/admin/*`, `/dashboard/*`, `/staff/*`.
4. **`lib/booking-engine.ts`**: Complete slot calculation engine handling breaks, holidays, staff qualification, and current-day cutoffs.
5. **`actions/booking.ts`**: Server Actions for booking validation, user creation, atomic slot check, and appointment creation.

#### 👨‍💻 Developer 2: Public Experience & Wizard
1. **Design System**: Global layout, Tailwind theme config, `shadcn/ui` components (Dialog, Popover, Select, Calendar, Tabs, Toast).
2. **`app/appointments/[slug]/page.tsx`**:
   - Step 1: Location dropdown & Category filters.
   - Step 2: Service card list (duration, price badge, image) + Staff selector ("Any Staff" or specific).
   - Step 3: Calendar date selection (closed days/holidays disabled) + Reactive slot buttons grid.
   - Step 4: User info form (Toggle: "New Account", "Login", "Continue as Guest") + Custom Fields dynamically rendered.
   - Step 5: Order summary & payment submission.
3. **`app/find-appointment/[slug]/page.tsx`**: Search appointment by ID and phone/email, displaying live status, rescheduling, and cancel request.
4. **Theme Variants**: Theme selector supporting Car Service style layout and Photography style layout.

#### 👨‍💻 Developer 3: Company & Staff Dashboard
1. **`app/(dashboard)/dashboard/page.tsx`**: Overview cards (Total Appointments, Revenue, Staff Count), ApexCharts appointment volume chart.
2. **`app/(dashboard)/appointments/calendar/page.tsx`**: FullCalendar with month/week/day views, color-coded by staff, drag-and-drop reschedule, modal on click.
3. **`app/(dashboard)/appointments/page.tsx`**: Data table with status filter, search, date-range picker, and export to CSV/Excel.
4. **`app/(dashboard)/services/page.tsx`**: Service CRUD modal, category assignment, price, duration slider.
5. **`app/(dashboard)/staff/page.tsx`**: Staff creation, user account linking, multiple location & service tagging, color-picker.
6. **`app/(dashboard)/business/hours/page.tsx`**: Weekly business hours manager with toggles, start/end time pickers, and dynamic break time intervals.
7. **`app/(dashboard)/business/holidays/page.tsx`**: Add/remove holiday dates with reasons.
8. **`app/(dashboard)/custom-fields/page.tsx` & `custom-status/page.tsx`**: Manage tenant-specific appointment fields and color-coded statuses.

#### 👨‍💻 Developer 4: Super Admin, Billing & Integrations
1. **`app/(admin)/admin/dashboard/page.tsx`**: Global platform metrics (Total MRR, Companies, Active Subscriptions).
2. **`app/(admin)/admin/plans/page.tsx`**: SaaS plan manager (monthly/yearly pricing, staff limits, storage limits).
3. **`actions/billing.ts` & `app/api/webhooks/stripe/route.ts`**:
   - Stripe Checkout Session creation for SaaS plans.
   - Stripe Webhook handler: listen for `checkout.session.completed` and `invoice.payment_succeeded` -> update `Order` -> activate tenant subscription.
4. **`app/(dashboard)/plans/page.tsx`**: Tenant-facing plan upgrade screen with coupon code application logic.
5. **`lib/mailer.ts`**: Nodemailer wrapper supporting custom SMTP, loading templates from `email_templates` collection, and substituting `{variables}`.
6. **`app/(admin)/admin/settings/page.tsx`**: Global system settings (platform logo, brand color, default currency, SEO meta).

---

## 5. 72-Hour Sprint Execution Timeline

```
PHASE 1: FOUNDATION (Hours 00 - 16)
├── Dev 1: Next.js init + Mongoose Schemas + NextAuth RBAC + DB seed script
├── Dev 2: shadcn/ui installation + Theme layout + Booking Wizard shell & mock data
├── Dev 3: Dashboard layout + Sidebar + Mock Calendar component
└── Dev 4: Plan Mongoose Schema + Stripe developer sandbox setup + Mailer stub

PHASE 2: CORE IMPLEMENTATION (Hours 16 - 40)
├── Dev 1: Booking Engine algorithm (`calculateAvailableSlots`) + Server Actions
├── Dev 2: Wire Booking Wizard to Dev 1 Slot Engine + Date/Time reactive picker
├── Dev 3: Services & Staff CRUD + Business Hours / Break Hours manager
└── Dev 4: Super Admin Plans CRUD + Stripe Checkout Session creation

PHASE 3: INTEGRATION & INTERCONNECTIVITY (Hours 40 - 60)
├── Dev 1: Multi-tenant scoping guards + Concurrency lock on booking
├── Dev 2: Booking form submission with guest/user creation + Payment selection
├── Dev 3: FullCalendar live feed from DB + Status update modal + Customer CRM
└── Dev 4: Stripe Webhook handler + Order creation + Nodemailer booking confirmations

PHASE 4: POLISH, SECURITY & VERIFICATION (Hours 60 - 72)
├── Dev 1: Indexes on MongoDB (slug, email, businessId, date) + Zod audit
├── Dev 2: Appointment tracking page + Mobile responsive testing
├── Dev 3: CSV/Excel appointment export + Custom fields rendering
└── Dev 4: Super Admin company list + Global settings manager + Final deployment
```

---

## 6. Definition of Done & Quality Checklist

1. **End-to-End Booking Flow:** A guest can visit `/appointments/test-business`, select Location, Service, Staff, pick an available slot, enter details, and book without errors.
2. **Collision Prevention:** Two concurrent users attempting to book the same staff slot cannot both succeed if capacity is 1.
3. **Business Rule Adherence:**
   - Closed days and holiday dates are strictly disabled on the calendar picker.
   - Time slots respect break hours and current-day time cutoffs.
4. **Multi-Tenancy Security:** Company A cannot view or manipulate Company B's appointments, staff, services, or revenue.
5. **Code Standards:** 100% TypeScript compliance, no untyped `any` in schemas or server actions, Zod validation on every form.
