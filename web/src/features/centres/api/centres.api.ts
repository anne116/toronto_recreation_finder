import { get } from "../../../shared/lib/http";

import type {
  CentresFeatureCollection,
  WardFeatureCollection,
  CentreDetail,
  CentrePrograms,
  CentreFacility,
  CategoryOption,
} from "../../../shared/types";

function appendIfPresent(qs: URLSearchParams, key: string, val: unknown) {
  if (val === undefined || val === null) return;
  if (typeof val === "number") qs.append(key, String(val));        // preserves 0 (Monday)
  else if (typeof val === "string" && val !== "") qs.append(key, val);
}


export type SearchProgramsParams = {
  category?: string;
  activity: string;
  age?: "young" | "teen" | "adult" | "senior";
  weekday?: number;
  district?: string;
  time_of_day?: "morning" | "afternoon" | "evening" | "weekend";
  limit?: number;
  signal?: AbortSignal;
};

export type SearchProgramsResponse = {
  program_type: "dropin";
  count: number;
  filters: {
    category?: string;
    activity?: string;
    age?: string;
    weekday?: number;
    district?: string;
  };
  programs: any[];
};

export async function searchProgramsAggregated(
  params: SearchProgramsParams
): Promise<SearchProgramsResponse> {
  const qs = new URLSearchParams();
  appendIfPresent(qs, "category", params.category);
  appendIfPresent(qs, "activity", params.activity);
  appendIfPresent(qs, "age", params.age);
  appendIfPresent(qs, "district", params.district);
  appendIfPresent(qs, "time_of_day", params.time_of_day);
  appendIfPresent(qs, "limit", params.limit);
  appendIfPresent(qs, "weekday", params.weekday);
  return get<SearchProgramsResponse>(`/api/programs/search?${qs.toString()}`);
}

export async function searchProgramsSearchStats(params: {
  activity?: string;
  age?: "young" | "teen" | "adult" | "senior";
  weekday?: number;
  district?: string;
  time_of_day?: "morning" | "afternoon" | "evening" | "weekend";
}) {
  const qs = new URLSearchParams();
  appendIfPresent(qs, "activity", params.activity);
  appendIfPresent(qs, "age", params.age);
  appendIfPresent(qs, "district", params.district);
  appendIfPresent(qs, "time_of_day", params.time_of_day);
  appendIfPresent(qs, "weekday", params.weekday);
  
  return get(`/api/programs/search/stats?${qs.toString()}`);
}


export async function getCentres(
  params: { 
    category?: string;
    activity?: string; 
    district?: string; 
    age?: "young" | "teen" | "adult" | "senior";
    facility_type?: string; 
    weekday?: number 
  }
): Promise<CentresFeatureCollection> {
  const qs = new URLSearchParams();
  appendIfPresent(qs, "category", params.category);
  appendIfPresent(qs, "activity", params.activity);
  appendIfPresent(qs, "district", params.district);
  appendIfPresent(qs, "age", params.age);
  appendIfPresent(qs, "facility_type", params.facility_type);
  appendIfPresent(qs, "weekday", params.weekday);
  
  return get<CentresFeatureCollection>(`/api/centres/geojson?${qs.toString()}`);
}

export async function getWards(): Promise<WardFeatureCollection> {
  return get<WardFeatureCollection>(`/api/wards/geojson`);
}


export async function getCentreDetail(
  centreId: string | number,
  init?: RequestInit
): Promise<CentreDetail> {
  return get<CentreDetail>(`/api/centres/${centreId}`, init);
}

export async function getCentrePrograms(
  centreId: string | number,
  opts?: { age?: "young" | "teen" | "adult" | "senior" }
): Promise<CentrePrograms> {
  const qs = new URLSearchParams();
  appendIfPresent(qs, "age", opts?.age);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  
  return get<CentrePrograms>(`/api/centres/${centreId}/programs${suffix}`);
}

export async function getCentreFacilities(
  centreId: string | number,
  init?: RequestInit
): Promise<CentreFacility[]> {
  return get<CentreFacility[]>(`/api/centres/${centreId}/facilities`, init);
}


export type ActivityOption = { 
  activity: string; 
  count: number; 
  locations?: number 
};

export type DistrictOption = { 
  district: string; 
  location_count: number 
};

export type FacilityTypeOption = { 
  facility_type: string; 
  count: number 
};

export type FilterOptionsResponse = {
  categories: CategoryOption[];
  activities: ActivityOption[];
  districts: DistrictOption[];
  facilityTypes: FacilityTypeOption[];
};

export async function getFilterOptions(): Promise<FilterOptionsResponse> {
  const [categoriesPayload, activities, districts, facilityTypes] = await Promise.all([
    get<{ categories: CategoryOption[] }>(`/api/categories`),
    get<ActivityOption[]>(`/api/activities?program_type=dropin&limit=200`),
    get<DistrictOption[]>(`/api/districts`),
    get<FacilityTypeOption[]>(`/api/facility-types`),
  ]);
  
  return {
    categories: categoriesPayload.categories,
    activities,
    districts,
    facilityTypes,
  };
}
