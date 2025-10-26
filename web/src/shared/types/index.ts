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
  
  export interface ProgramDropin {
    course_title: string; day_of_week?: string; start_time?: string; end_time?: string;
    age_min?: number; age_max?: number;
  }
  export interface ProgramRegistered {
    course_title: string; days_of_week?: string; program_category?: string;
    min_age?: number; max_age?: number;
  }
  export interface CentrePrograms { dropin: ProgramDropin[]; registered: ProgramRegistered[] }
  export interface CentreFacility { facility_type: string }
  
  export type AgeFilter = '' | 'young' | 'teen' | 'adult' | 'senior';
  