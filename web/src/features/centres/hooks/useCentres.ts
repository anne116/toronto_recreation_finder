import { useCallback, useEffect, useState } from 'react';
import type { CentresFeatureCollection } from '../../../shared/types';
import { getCentres } from '../api/centres.api';

export type CentreFilters = { activity: string; district: string; weekday: string; facility_type: string };

export function useCentres(filters: CentreFilters) {
  const [data, setData] = useState<CentresFeatureCollection|null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const refetch = useCallback(async () => {
    try { setLoading(true); setError(null);
      const d = await getCentres(filters);
      setData(d);
    } catch (e) { setError(e); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => {
    refetch();
  }, [filters.activity, filters.district, filters.weekday, filters.facility_type]); 

  return { data, loading, error, refetch };
}
