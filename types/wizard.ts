export type WizardStep = 1 | 2 | 3 | 4 | 5;

export type CustomerType = 'guest-user' | 'new-user' | 'existing-user';

export interface TimeSlotSelection {
  start: string;
  end: string;
}

export interface CustomerDetails {
  name: string;
  email: string;
  contact: string;
  customerType: CustomerType;
  password?: string;
  gender?: 'male' | 'female' | 'other' | '';
  dob?: string;
  notes?: string;
  customFields?: Record<string, unknown>;
}

export interface AppliedCoupon {
  code: string;
  name?: string;
  discountType: 'percentage' | 'flat';
  discountValue: number;
  discountAmount: number;
  finalPrice: number;
}

export interface WizardState {
  currentStep: WizardStep;
  selectedLocationId: string;
  selectedCategoryId: string;
  selectedServiceId: string;
  selectedStaffId: string;
  selectedDate: string; // 'DD-MM-YYYY'
  selectedTimeSlot: TimeSlotSelection | null;
  customer: CustomerDetails;
  paymentType: 'Manually' | 'Stripe' | 'PayPal' | 'BankTransfer' | 'Free';
  appliedCoupon?: AppliedCoupon | null;
}

export interface ClientBusinessHour {
  dayName: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  isOpen: boolean;
  startTime: string;
  endTime: string;
  breakHours: { start: string; end: string }[];
}

export interface ClientHoliday {
  date: string;
  description?: string;
}

export type WizardLayout = 'Formlayout1' | 'Formlayout2' | string;

export interface ClientBusiness {
  id: string;
  name: string;
  slug: string;
  currency: string;
  currencySymbol: string;
  themeColor: string;
  layout: WizardLayout;
  logoDark?: string;
  logoLight?: string;
  appointmentPrefix?: string;
  maximumSlot?: number;
  businessHours?: ClientBusinessHour[];
  holidays?: ClientHoliday[];
}

export interface ClientLocation {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  description?: string;
}

export interface ClientCategory {
  id: string;
  name: string;
  description?: string;
}

export interface ClientService {
  id: string;
  categoryId: string;
  name: string;
  durationMinutes: number;
  price: number;
  isFree: boolean;
  image?: string;
  description?: string;
}

export interface ClientStaff {
  id: string;
  name: string;
  locationIds: string[];
  serviceIds: string[];
  colorCode: string;
  description?: string;
}

export interface ClientCustomField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'date' | 'select' | 'textarea' | 'radio' | 'checkbox';
  options?: string[];
  placeholder?: string;
  isRequired: boolean;
}

export interface WizardCatalog {
  locations: ClientLocation[];
  categories: ClientCategory[];
  services: ClientService[];
  staff: ClientStaff[];
  customFields: ClientCustomField[];
}

export interface WizardContextType {
  state: WizardState;
  business: ClientBusiness;
  catalog: WizardCatalog;
  canGoNext: boolean;
  isSubmitting: boolean;
  setStep: (step: WizardStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  updateLocation: (locationId: string) => void;
  updateCategory: (categoryId: string) => void;
  updateService: (serviceId: string) => void;
  updateStaff: (staffId: string) => void;
  updateDate: (date: string) => void;
  updateTimeSlot: (slot: TimeSlotSelection | null) => void;
  updateCustomer: (info: Partial<CustomerDetails>) => void;
  updatePaymentType: (paymentType: WizardState['paymentType']) => void;
  setAppliedCoupon: (coupon: AppliedCoupon | null) => void;
  setIsSubmitting: (submitting: boolean) => void;
  resetWizard: () => void;
}
