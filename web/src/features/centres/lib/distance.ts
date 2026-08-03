import { haversineDistanceKm } from '../../../shared/lib/geo';
import type { CentresFeatureCollection } from '../../../shared/types';

export type LocationCoordinates = { lat: number; lon: number };

export function buildLocationCoordinatesMap(
  centres: CentresFeatureCollection | null | undefined
): Map<string, LocationCoordinates> {
  const map = new Map<string, LocationCoordinates>();
  if (!centres?.features) return map;

  for (const feature of centres.features) {
    const [lon, lat] = feature.geometry.coordinates;
    if (typeof lon === 'number' && typeof lat === 'number') {
      map.set(String(feature.properties.id), { lat, lon });
    }
  }
  return map;
}

export function attachDistanceKm<T extends { location_id: string | number }>(
  items: T[],
  coordinatesById: Map<string, LocationCoordinates>,
  userLocation: LocationCoordinates | null
): (T & { distanceKm?: number })[] {
  if (!userLocation) return items;

  return items.map((item) => {
    const coords = coordinatesById.get(String(item.location_id));
    return coords
      ? { ...item, distanceKm: haversineDistanceKm(userLocation, coords) }
      : item;
  });
}

/** Items with an unknown distance are treated as "within" — never hidden or deprioritized for missing data. */
export function isWithinDistance(distanceKm: number | undefined, maxDistanceKm: number | undefined): boolean {
  if (maxDistanceKm == null || distanceKm == null) return true;
  return distanceKm <= maxDistanceKm;
}
