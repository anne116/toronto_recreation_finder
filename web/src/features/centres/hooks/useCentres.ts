import { useEffect, useState } from 'react';
import { getCentres } from '../api/centres.api';
import type { AgeFilter, CentresFeatureCollection } from '../../../shared/types';
import type { WeekdayName } from '../../../shared/lib/weekday';

type CentresFilters = {
  category?: string;
  activity?: string;
  district?: string;
  weekday?: WeekdayName | null;
  age?: AgeFilter;
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
      return;
    }

    if (!filters.category && !filters.activity && !filters.district && !filters.weekday && !filters.age) {
      setData(null);
      return;
    }

    const abortController = new AbortController();

    (async () => {
      setLoading(true);
      setError(null);
      
      try {
        const centres = await getCentres({
          category: filters.category,
          activity: filters.activity,
          district: filters.district,
          age: filters.age,
          weekday: filters.weekday ?? undefined,
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
  }, [enabled, filters.category, filters.activity, filters.district, filters.weekday, filters.age]);

  return { data, loading, error };
}
