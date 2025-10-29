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
  day_of_week?: string | null;   
  start_time?: string | null; 
  end_time?: string | null; 
  age_min?: number | null;   
  age_max?: number | null;
}
export interface ProgramRegistered {
  course_title: string; days_of_week?: string; program_category?: string;
  min_age?: number; max_age?: number;
}
export interface CentrePrograms { dropin: DropInProgram[]; registered: ProgramRegistered[] }
export interface CentreFacility { facility_type: string }

export type AgeFilter = '' | 'young' | 'teen' | 'adult' | 'senior';

// New, richer shape for the registered SPA; extends the old one additively
export interface RegisteredProgram extends ProgramRegistered {
  // Prefer normalized, per-occurrence fields:
  day_of_week?: string | null;   // single day (normalized)
  start_time?: string | null;    // "HH:MM:SS"
  end_time?: string | null;      // "HH:MM:SS"

  // Location / facility identity (IDs) and display names
  location_id?: string | number | null;
  facility_id?: string | number | null;
  location_name?: string | null;
  facility_name?: string | null;

  // Stronger identifiers when available
  occurrence_id?: string | number | null;
  course_instance_id?: string | number | null;
  course_id?: string | number | null;
  course_code?: string | number | null;
  program_id?: string | number | null;

  // Alternate naming (some sources use these); keep optional for adapter tolerance
  weekday?: string | null;
  start?: string | null;
  end?: string | null;

  // Unified age fields (mirror drop-in naming)
  age_min?: number | null;
  age_max?: number | null;

  // Optional activity/sport bucket
  activity?: string | null;
  sport?: string | null;

  // --- Add these normalized fields used by the UI ---
  section?: string | null;
  activity_title?: string | null;
  from_to?: string | null;            // "Oct-09-2025 to Dec-18-2025"
  activity_url?: string | null;
  status_info?: string | null;
}

// Raw row exactly as in the CSV (keys with spaces)
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
