import { useEffect, useMemo, useState } from 'react';
import type {
  AgeFilter, CentreDetail, CentreFacility, CentrePrograms,
  DropInProgram, ProgramRegistered
} from '../../../shared/types';
import { getCentreDetail, getCentreFacilities, getCentrePrograms } from '../api/centres.api';

function filterByAge<T extends DropInProgram|ProgramRegistered>(programs: T[], age: AgeFilter) {
  if (!age) return programs;
  return programs.filter(p => {
    const minAge = (p as any).age_min ?? (p as any).min_age;
    const maxAge = (p as any).age_max ?? (p as any).max_age;
    switch (age) {
      case 'young':  return (!maxAge || maxAge <= 12) || (!minAge || minAge < 12);
      case 'teen':   return (!minAge || minAge <= 18) && (!maxAge || maxAge >= 13);
      case 'adult':  return (!minAge || minAge <= 65) && (!maxAge || maxAge >= 19 || !maxAge);
      case 'senior': return !minAge || minAge >= 55;
      default:       return true;
    }
  });
}

export function useCentreDetails(id: string|number|null, age: AgeFilter) {
  const [detail, setDetail] = useState<CentreDetail|null>(null);
  const [programsRaw, setProgramsRaw] = useState<CentrePrograms|null>(null);
  const [facilities, setFacilities] = useState<CentreFacility[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const [d, p, f] = await Promise.all([ getCentreDetail(id), getCentrePrograms(id), getCentreFacilities(id) ]);
      setDetail(d); setProgramsRaw(p); setFacilities(f);
      setLoading(false);
    })();
  }, [id]);

  const programs = useMemo(() => {
    if (!programsRaw) return { dropin: [], registered: [] };
    return {
      dropin: filterByAge(programsRaw.dropin || [], age),
      registered: filterByAge(programsRaw.registered || [], age),
    };
  }, [programsRaw, age]);

  return { detail, programs, facilities, loading };
}
