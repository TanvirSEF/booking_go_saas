export type CalendarFeedScope = 'business' | 'staff';

export interface CalendarFeedUrls {
  businessFeedUrl: string;
  webcalBusinessUrl: string;
  staffFeedUrl?: string;
  webcalStaffUrl?: string;
  businessToken?: string;
  staffToken?: string;
}

export interface CalendarFeedSummary {
  scope: CalendarFeedScope;
  entityName: string;
  totalEvents: number;
  upcomingEvents: number;
  lastUpdated: string;
}

export interface RotateFeedTokenResult {
  success: boolean;
  scope?: CalendarFeedScope;
  newToken?: string;
  newFeedUrl?: string;
  newWebcalUrl?: string;
  error?: string;
}

export interface ResolvedFeedContext {
  scope: CalendarFeedScope;
  businessId: string;
  businessName: string;
  companyId: string;
  staffId?: string;
  staffName?: string;
  staffEmail?: string;
}
