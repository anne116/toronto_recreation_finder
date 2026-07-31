import { useEffect, useState } from 'react';
import { getCentres, getRegisteredCentres } from '../api/centres.api';
import type { ProgramType } from '../../../shared/types';

export type CentreNameOption = {
  id: string | number;
  name: string;
};

const cache = new Map<ProgramType, CentreNameOption[]>();

export function useCentreNameFilter(programType: ProgramType) {
  const [options, setOptions] = useState<CentreNameOption[]>(() => cache.get(programType) ?? []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const cached = cache.get(programType);
    if (cached) {
      setOptions(cached);
      return;
    }

    const abortController = new AbortController();

    (async () => {
      setLoading(true);

      try {
        const centres = programType === 'registered'
          ? await getRegisteredCentres({ signal: abortController.signal })
          : await getCentres({ signal: abortController.signal });

        if (!abortController.signal.aborted) {
          const names: CentreNameOption[] = (centres.features ?? [])
            .map((f) => ({ id: f.properties.id, name: f.properties.name ?? '' }))
            .filter((option) => option.name);

          cache.set(programType, names);
          setOptions(names);
        }
      } catch (err) {
        if (!abortController.signal.aborted) {
          console.error('Failed to load centre names:', err);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    })();

    return () => abortController.abort();
  }, [programType]);

  return { options, loading };
}
