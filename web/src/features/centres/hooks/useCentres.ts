import { useEffect, useState } from 'react';
import { getCentres, getRegisteredCentres } from '../api/centres.api';
import type { CentresFeatureCollection, DropInAgeFilter, ProgramAgeFilter, ProgramType } from '../../../shared/types';
import type { WeekdayName } from '../../../shared/lib/weekday';

type CentresFilters = {
  programType: ProgramType;
  category?: string;
  activity?: string;
  activities?: string[];
  district?: string;
  weekday?: WeekdayName | null;
  startMonth?: string;
  age?: ProgramAgeFilter;
  locationId?: string | number;
  hasDistanceFilter?: boolean;
  hasFreeCentresFilter?: boolean;
};

type UseCentresOptions = {
  enabled?: boolean;
};

export function useCentres(filters: CentresFilters, options: UseCentresOptions = {}) {
  const { enabled = true } = options;
  const [data, setData] = useState<CentresFeatureCollection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    const hasActivities = Boolean(filters.activities && filters.activities.length > 0);
    if (!filters.category && !filters.activity && !hasActivities && !filters.district && !filters.weekday && !filters.age && !filters.startMonth && !filters.locationId && !filters.hasDistanceFilter && !filters.hasFreeCentresFilter) {
      setData(null);
      return;
    }

    const abortController = new AbortController();

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const centres =
          filters.programType === 'registered'
            ? await getRegisteredCentres({
              category: filters.category,
              activity: filters.activity,
              activities: filters.activities,
              district: filters.district,
              age: filters.age,
              start_month: filters.startMonth,
              location_id: filters.locationId,
              signal: abortController.signal,
              })
            : await getCentres({
              category: filters.category,
              activity: filters.activity,
              activities: filters.activities,
              district: filters.district,
              age: filters.age as DropInAgeFilter | undefined,
              weekday: filters.weekday ?? undefined,
              location_id: filters.locationId,
              signal: abortController.signal,
              });
        if (!abortController.signal.aborted) {
          setData(centres);
        }
      } catch (err) {
        if (!abortController.signal.aborted) {
          console.error('Failed to fetch centres:', err);
          setError(err instanceof Error ? err : new Error('Unknown error'));
          setData(null);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    })();

    return () => abortController.abort();
  }, [enabled, filters.programType, filters.category, filters.activity, filters.activities, filters.district, filters.weekday, filters.startMonth, filters.age, filters.locationId, filters.hasDistanceFilter, filters.hasFreeCentresFilter]);

  return { data, loading, error };
}
