// src/features/centres/hooks/useCentres.ts
import { useEffect, useState } from 'react';
import { getCentres } from '../api/centres.api';
import type { CentresFeatureCollection } from '../../../shared/types';

type CentresFilters = {
  activity?: string;
  district?: string;
  weekday?: string;
  facility_type?: string;
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
    // Don't fetch if no filters set (optional optimization)
    // Remove this if you want to load all centres on initial load
    if (!enabled) {
      return;
    }

    if (!filters.activity && !filters.district && !filters.weekday && !filters.facility_type) {
      setData(null);
      return;
    }

    const abortController = new AbortController();

    (async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Convert weekday string to number if present
        const weekdayNum = filters.weekday 
          ? (parseInt(filters.weekday, 10) || undefined)
          : undefined;

        const centres = await getCentres({
          activity: filters.activity,
          district: filters.district,
          facility_type: filters.facility_type,
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
  }, [enabled, filters.activity, filters.district, filters.weekday, filters.facility_type]);

  return { data, loading, error };
}