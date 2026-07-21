import { get } from "../../../shared/lib/http";
import type { WeekdayName } from "../../../shared/lib/weekday";

import type {
  ActivityOption,
  CategoryOption,
  CentresFeatureCollection,
  WardFeatureCollection,
  CentreDetail,
  DistrictOption,
  DropInAgeFilter,
  FacilityTypeOption,
  ProgramAgeFilter,
  ProgramType,
  RegisteredProgramGroup,
  StartMonthOption,
} from "../../../shared/types";

function appendIfPresent(qs: URLSearchParams, key: string, val: unknown) {
  if (val === undefined || val === null) return;
  if (typeof val === "number") qs.append(key, String(val));
  else if (typeof val === "string" && val !== "") qs.append(key, val);
}

function appendActivityParams(qs: URLSearchParams, activity?: string, activities?: string[]) {
  if (activities && activities.length > 0) {
    for (const item of activities) appendIfPresent(qs, "activity", item);
    return;
  }
  appendIfPresent(qs, "activity", activity);
}


export type SearchProgramsParams = {
  category?: string;
  activity: string;
  activities?: string[];
  age?: ProgramAgeFilter;
  weekday?: WeekdayName;
  start_month?: string;
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
    weekday?: WeekdayName;
    district?: string;
  };
  programs: any[];
};


export type RegisteredProgramsResponse = {
  program_type: "registered";
  count: number;
  filters: {
    category?: string;
    activity?: string;
    age?: string;
    start_month?: string;
    district?: string;
  };
  programs: RegisteredProgramGroup[];
};

export async function searchProgramsAggregated(
  params: SearchProgramsParams
): Promise<SearchProgramsResponse> {
  const qs = new URLSearchParams();
  appendIfPresent(qs, "category", params.category);
  appendActivityParams(qs, params.activity, params.activities);
  appendIfPresent(qs, "age", params.age);
  appendIfPresent(qs, "district", params.district);
  appendIfPresent(qs, "time_of_day", params.time_of_day);
  appendIfPresent(qs, "limit", params.limit);
  appendIfPresent(qs, "weekday", params.weekday);
  return get<SearchProgramsResponse>(`/api/programs/search?${qs.toString()}`);
}

export async function searchRegisteredPrograms(
  params: SearchProgramsParams
): Promise<RegisteredProgramsResponse> {
  const qs = new URLSearchParams();
  appendIfPresent(qs, "category", params.category);
  appendActivityParams(qs, params.activity, params.activities);
  appendIfPresent(qs, "age", params.age);
  appendIfPresent(qs, "district", params.district);
  appendIfPresent(qs, "limit", params.limit);
  appendIfPresent(qs, "start_month", params.start_month);
  return get<RegisteredProgramsResponse>(`/api/registered/programs/search?${qs.toString()}`, {
    signal: params.signal,
  });
}

export async function getCentres(
  params: {
    category?: string;
    activity?: string;
    activities?: string[];
    district?: string;
    age?: DropInAgeFilter;
    facility_type?: string;
    weekday?: WeekdayName
  }
): Promise<CentresFeatureCollection> {
  const qs = new URLSearchParams();
  appendIfPresent(qs, "category", params.category);
  appendActivityParams(qs, params.activity, params.activities);
  appendIfPresent(qs, "district", params.district);
  appendIfPresent(qs, "age", params.age);
  appendIfPresent(qs, "facility_type", params.facility_type);
  appendIfPresent(qs, "weekday", params.weekday);
  
  return get<CentresFeatureCollection>(`/api/centres/geojson?${qs.toString()}`);
}

export async function getRegisteredCentres(
  params: {
    category?: string;
    activity?: string;
    activities?: string[];
    district?: string;
    age?: ProgramAgeFilter;
    start_month?: string;
  }
): Promise<CentresFeatureCollection> {
  const qs = new URLSearchParams();
  appendIfPresent(qs, "category", params.category);
  appendActivityParams(qs, params.activity, params.activities);
  appendIfPresent(qs, "district", params.district);
  appendIfPresent(qs, "age", params.age);
  appendIfPresent(qs, "start_month", params.start_month);

  return get<CentresFeatureCollection>(`/api/registered/centres/geojson?${qs.toString()}`);
}

export async function getWards(): Promise<WardFeatureCollection> {
  return get<WardFeatureCollection>(`/wards.geojson`);
}


export async function getCentreDetail(
  centreId: string | number,
  init?: RequestInit
): Promise<CentreDetail> {
  return get<CentreDetail>(`/api/centres/${centreId}`, init);
}

export type FilterOptionsResponse = {
  categories: CategoryOption[];
  activities: ActivityOption[];
  districts: DistrictOption[];
  startMonths?: StartMonthOption[];
  facilityTypes?: FacilityTypeOption[];
};

export async function getFilterOptions(programType: ProgramType): Promise<FilterOptionsResponse> {
  if (programType === "registered") {
    return get<FilterOptionsResponse>(`/api/registered/filter-options`);
  }

  const [filterOptions, districts, facilityTypes] = await Promise.all([
    get<{ categories: CategoryOption[]; activities: ActivityOption[] }>(`/api/filter-options`),
    get<DistrictOption[]>(`/api/districts`),
    get<FacilityTypeOption[]>(`/api/facility-types`),
  ]);
  
  return {
    categories: filterOptions.categories,
    activities: filterOptions.activities,
    districts,
    facilityTypes,
  };
}
