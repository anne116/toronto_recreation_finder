import { get } from '../../../shared/lib/http';
import type {
  ActivityOption, DistrictOption, FacilityTypeOption,
  WardFeatureCollection, CentresFeatureCollection,
  CentreDetail, CentrePrograms, CentreFacility,
  DropInProgram
} from '../../../shared/types/index.ts';
import { mapRegisteredCsvRow } from '../../../shared/lib/registered.adapter';
import type { RegisteredCsvRow, RegisteredProgram } from '../../../shared/types';

export const getWards = () => get<WardFeatureCollection>('/api/wards/geojson');

export async function getFilterOptions() {
  const [activities, districts, facilityTypes] = await Promise.all([
    get<ActivityOption[]>('/api/activities?limit=100'),
    get<DistrictOption[]>('/api/districts'),
    get<FacilityTypeOption[]>('/api/facility-types'),
  ]);
  return { activities, districts, facilityTypes };
}

export function getCentres(params: {
  activity?: string; district?: string; weekday?: string; facility_type?: string;
}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v && qs.append(k, v));
  return get<CentresFeatureCollection>(`/api/centres/geojson?${qs.toString()}`);
}

export const getCentreDetail     = (id: string|number) => get<CentreDetail>(`/api/centres/${id}`);
export const getCentrePrograms   = (id: string|number) => get<CentrePrograms>(`/api/centres/${id}/programs`);
export const getCentreFacilities = (id: string|number) => get<CentreFacility[]>(`/api/centres/${id}/facilities`);


export async function getCentreRegisteredPrograms(
  id: string | number
): Promise<RegisteredProgram[]> {
  // 1) Try a dedicated endpoint if it exists
  try {
    const res = await get<any>(`/api/centres/${id}/registered`);
    const rows: RegisteredCsvRow[] = Array.isArray(res)
      ? res
      : (res.rows ?? res.programs ?? res.registered ?? []);
    if (rows?.length) return rows.map(mapRegisteredCsvRow);
  } catch {
    // ignore and fall through
  }

  // 2) Fallback: pull from /programs payload
  const payload = await get<any>(`/api/centres/${id}/programs`);
  const rows: RegisteredCsvRow[] = Array.isArray(payload)
    ? payload
    : (payload.registered ?? payload.rows ?? payload.programs ?? []);
  return (rows ?? []).map(mapRegisteredCsvRow);
}




export interface AggregatedSearchParams {
  activity?: string;
  age?: string;  // 'young' | 'teen' | 'adult' | 'senior'
  weekday?: string;
  district?: string;
  program_type?: 'dropin' | 'registered';
}

export interface AggregatedProgramResult extends DropInProgram {
  // Additional fields from JOIN with locations
  location_name?: string;
  asset_name?: string;
  address?: string;
  district?: string;
  lon?: number;
  lat?: number;
}

export interface AggregatedSearchResponse {
  program_type: 'dropin' | 'registered';
  total: number;
  filters: {
    activity?: string;
    age?: string;
    weekday?: number;
    district?: string;
  };
  programs: AggregatedProgramResult[];
}

/**
 * Search for programs across ALL centres.
 * This returns programs from multiple centres that match the criteria.
 * 
 * Use this for the weekly calendar grid that shows all available sessions.
 */
export async function searchProgramsAggregated(
  params: AggregatedSearchParams
): Promise<AggregatedSearchResponse> {
  const qs = new URLSearchParams();
  
  if (params.activity) qs.append('activity', params.activity);
  if (params.age) qs.append('age', params.age);
  if (params.weekday) qs.append('weekday', params.weekday);
  if (params.district) qs.append('district', params.district);
  if (params.program_type) qs.append('program_type', params.program_type);
  
  return get<AggregatedSearchResponse>(`/api/programs/search?${qs.toString()}`);
}

/**
 * Get quick stats about search results.
 * Useful for showing "Found X programs at Y centres" messages.
 */
export async function getProgramSearchStats(
  params: Omit<AggregatedSearchParams, 'program_type'>
) {
  const qs = new URLSearchParams();
  
  if (params.activity) qs.append('activity', params.activity);
  if (params.age) qs.append('age', params.age);
  if (params.weekday) qs.append('weekday', params.weekday);
  if (params.district) qs.append('district', params.district);
  
  return get<{
    dropin: { programs: number; centres: number };
    registered: { programs: number; centres: number };
    total: { programs: number; centres: number };
  }>(`/api/programs/search/stats?${qs.toString()}`);
}