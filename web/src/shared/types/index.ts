import type { WeekdayName } from "../lib/weekday";

export type ProgramType = "dropin" | "registered";

export interface WardFeatureCollection {
    type: 'FeatureCollection';
    features: Array<{
      type: 'Feature';
      properties: Record<string, unknown>;
      geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown };
    }>;
  }
  
export interface CentresFeatureCollection {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    properties: {
      id: string | number;
      name?: string;
      total_programs?: number;
      [k: string]: unknown;
    };
    geometry: { type: 'Point'; coordinates: [number, number] };
  }>;
}

export interface ActivityOption { activity: string; count: number }
export interface DistrictOption { district: string; location_count: number }
export interface FacilityTypeOption { facility_type: string; count: number }
export interface CategoryOption {
  name: string;
  description: string;
  activities: string[];
}

export interface CentreDetail {
  id: string | number; name: string;
  address?: string; district?: string; intersection?: string;
  ttc_information?: string; phone?: string; accessibility?: string;
  amenities?: string; description?: string; facility_type?: string; url?: string;
}

export interface DropInProgram {
  id: string | number;
  centre_id?: string | number;
  course_title: string;
  activity?: string | null;      
  day_of_week?: WeekdayName | null;
  start_time?: string | null;
  end_time?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  date_range?: string | null;
  age_min?: number | null;   
  age_max?: number | null;
}
export interface ProgramRegistered {
  course_title: string; days_of_week?: string; program_category?: string;
  min_age?: number; max_age?: number;
}
export interface CentrePrograms { dropin: DropInProgram[]; registered: ProgramRegistered[] }
export interface CentreFacility { facility_type: string }

export interface RegisteredProgramPeriod {
  id: string;
  course_id?: string | number | null;
  days_of_week: WeekdayName[];
  start_date?: string | null;
  end_date?: string | null;
  date_range?: string | null;
  start_month?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  activity_url?: string | null;
}

export interface RegisteredProgramGroup {
  id: string;
  location_id: string | number;
  location_name: string;
  district?: string | null;
  category: string;
  course_title: string;
  age_min?: number | null;
  age_max?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  date_range?: string | null;
  start_month?: string | null;
  days_of_week: WeekdayName[];
  start_time?: string | null;
  end_time?: string | null;
  periods: RegisteredProgramPeriod[];
}

export interface StartMonthOption {
  value: string;
  label: string;
  month_number: number;
}

export type DropInAgeFilter =
  | 'children'
  | 'teens'
  | 'young_adults'
  | 'adults'
  | 'seniors';

export type RegisteredAgeFilter =
  | 'infants_toddlers'
  | 'preschool_early_childhood'
  | 'children'
  | 'teens'
  | 'young_adults'
  | 'adults'
  | 'seniors';

export type ProgramAgeFilter = DropInAgeFilter | RegisteredAgeFilter;

export type AgeFilter = DropInAgeFilter;

export interface RegisteredProgram extends ProgramRegistered {

  day_of_week?: WeekdayName | null;
  start_time?: string | null;
  end_time?: string | null;

  location_id?: string | number | null;
  facility_id?: string | number | null;
  location_name?: string | null;
  facility_name?: string | null;

  occurrence_id?: string | number | null;
  course_instance_id?: string | number | null;
  course_id?: string | number | null;
  course_code?: string | number | null;
  program_id?: string | number | null;

  weekday?: WeekdayName | null;
  start?: string | null;
  end?: string | null;

  age_min?: number | null;
  age_max?: number | null;

  activity?: string | null;
  sport?: string | null;

  section?: string | null;
  activity_title?: string | null;
  from_to?: string | null;
  activity_url?: string | null;
  status_info?: string | null;
}


export type RegisteredCsvRow = {
  _id: string;
  Course_ID: string;
  "Location ID": string;
  Section: string;
  "Activity Title": string;
  "Course Title": string;
  "Days of The Week": string;
  "From To": string;
  "Start Hour": string;
  "Start Min": string;
  "End Hour": string;
  "End Min": string;
  "Activity URL": string;
  "Min Age": string | null;
  "Max Age": string | null;
  "Program Category": string;
  "Registration Date": string;
  "Status / Information": string;
};
