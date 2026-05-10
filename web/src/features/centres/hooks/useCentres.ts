import { useEffect, useState } from 'react';
import { getCentres } from '../api/centres.api';
import type { AgeFilter, CentresFeatureCollection } from '../../../shared/types';

type CentresFilters = {
  category?: string;
  activity?: string;
  district?: string;
  weekday?: string;
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
        let weekdayNum: number | undefined = undefined;
        if (filters.weekday !== undefined && filters.weekday !== ''){
          const parsed = Number(filters.weekday);
          weekdayNum = Number.isNaN(parsed) ? undefined : parsed;
        }


        const centres = await getCentres({
          category: filters.category,
          activity: filters.activity,
          district: filters.district,
          age: filters.age,
          weekday: weekdayNum,
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
