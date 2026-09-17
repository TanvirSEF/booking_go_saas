export const STAFF_DEFAULT_COLORS: string[] = [
  '#CEEDC1', '#FFEDD2', '#B4E4CD', '#C1E6F9', '#FFF5C1',
  '#C3DEFB', '#F9D2FF', '#B6EDEF', '#FFCDB2', '#C1CBFF',
  '#FFD8D8', '#C9D6DE', '#D6C9F2', '#DAD4B5', '#CDE8E5',
];

export interface StaffLocationSummary {
  _id: string;
  name: string;
}

export interface StaffServiceSummary {
  _id: string;
  name: string;
  price?: number;
  duration?: number;
}

export interface StaffMemberDTO {
  _id: string;
  companyId: string;
  businessId: string;
  userId?: string;
  name: string;
  email?: string;
  phone?: string;
  description: string;
  colorCode: string;
  isActive: boolean;
  locationIds: string[];
  locations: StaffLocationSummary[];
  serviceIds: string[];
  services: StaffServiceSummary[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateStaffInput {
  name: string;
  email?: string;
  phone?: string;
  locationIds: string[];
  serviceIds: string[];
  description?: string;
  colorCode?: string;
  isActive?: boolean;
  password?: string;
}

export interface UpdateStaffInput {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  locationIds?: string[];
  serviceIds?: string[];
  description?: string;
  colorCode?: string;
  isActive?: boolean;
}

export interface StaffPlanQuota {
  current: number;
  max: number;
  allowed: boolean;
}

export interface StaffListResponse {
  success: boolean;
  data?: StaffMemberDTO[];
  quota?: StaffPlanQuota;
  error?: string;
}

export interface StaffActionResponse {
  success: boolean;
  data?: StaffMemberDTO;
  error?: string;
}
