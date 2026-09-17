export type DayName =
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday'
  | 'Sunday';

export interface BreakHourDTO {
  start: string;
  end: string;
}

export interface BusinessHourDTO {
  dayName: DayName;
  isOpen: boolean;
  startTime: string;
  endTime: string;
  breakHours: BreakHourDTO[];
}

export interface BusinessHolidayDTO {
  date: string;
  description?: string;
}

export interface BusinessHoursResponse {
  success: boolean;
  data?: {
    businessHours: BusinessHourDTO[];
    holidays: BusinessHolidayDTO[];
  };
  error?: string;
}

export interface HolidayActionResponse {
  success: boolean;
  data?: BusinessHolidayDTO[];
  error?: string;
}
