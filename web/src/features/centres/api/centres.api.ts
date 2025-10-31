import { get } from '../../../shared/lib/http';
import type {
  ActivityOption, DistrictOption, FacilityTypeOption,
  WardFeatureCollection, CentresFeatureCollection,
  CentreDetail, CentrePrograms, CentreFacility
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