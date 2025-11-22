// src/features/centres/hooks/useCentreDetails.ts
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  AgeFilter,
  CentreDetail,
  CentreFacility,
  CentrePrograms,
  DropInProgram,
  ProgramRegistered,
} from "../../../shared/types";
import {
  getCentreDetail,
  getCentreFacilities,
  getCentrePrograms,
} from "../api/centres.api";

// Accept optional age; return all programs when age is not set
function filterByAge<T extends DropInProgram | ProgramRegistered>(
  programs: T[],
  age?: AgeFilter
): T[] {
  if (!age) return programs;

  return programs.filter((p) => {
    // handles both drop-in and registered shapes
    const minAge = (p as any).age_min ?? (p as any).min_age ?? null;
    const maxAge = (p as any).age_max ?? (p as any).max_age ?? null;

    switch (age) {
      case "young":
        // ≤12, allow open-ended max
        return (maxAge != null && maxAge <= 12) || (minAge == null || minAge < 12);
      case "teen":
        // 13–18 inclusive, tolerate open-ended min/max
        return (minAge == null || minAge <= 18) && (maxAge == null || maxAge >= 13);
      case "adult":
        // 19–65 inclusive; treat missing bounds as pass
        return (minAge == null || minAge <= 65) && (maxAge == null || maxAge >= 19);
      case "senior":
        // 55+
        return minAge == null || minAge >= 55;
      default:
        return true;
    }
  });
}

export function useCentreDetails(id: string | number | null, age?: AgeFilter) {
  const [detail, setDetail] = useState<CentreDetail | null>(null);
  const [programsRaw, setProgramsRaw] = useState<CentrePrograms | null>(null);
  const [facilities, setFacilities] = useState<CentreFacility[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // reset if no centre is selected
    if (!id) {
      if (abortRef.current) abortRef.current.abort();
      setDetail(null);
      setProgramsRaw(null);
      setFacilities([]);
      setError(null);
      setLoading(false);
      return;
    }

    // cancel any in-flight request
    if (abortRef.current) abortRef.current.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        // If your API helpers accept AbortSignal, pass it; if not, just omit { signal: ac.signal }
        const [d, p, f] = await Promise.all([
          getCentreDetail(id, ac.signal as any),
          getCentrePrograms(id, ac.signal as any),
          getCentreFacilities(id, ac.signal as any),
        ]);

        if (!ac.signal.aborted) {
          setDetail(d);
          setProgramsRaw(p);
          setFacilities(f);
        }
      } catch (e) {
        if (!ac.signal.aborted) setError(e);
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [id]);

  // Client-side age filter; no refetch when age changes
  const programs = useMemo(() => {
    if (!programsRaw) return { dropin: [] as DropInProgram[], registered: [] as ProgramRegistered[] };
    return {
      dropin: filterByAge(programsRaw.dropin ?? [], age),
      registered: filterByAge(programsRaw.registered ?? [], age),
    };
  }, [programsRaw, age]);

  return { detail, programs, facilities, loading, error };
}
