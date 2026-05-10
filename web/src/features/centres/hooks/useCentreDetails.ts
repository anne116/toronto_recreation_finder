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

function filterByAge<T extends DropInProgram | ProgramRegistered>(
  programs: T[],
  age?: AgeFilter
): T[] {
  if (!age) return programs;

  return programs.filter((p) => {
    const minAge = (p as any).age_min ?? (p as any).min_age ?? null;
    const maxAge = (p as any).age_max ?? (p as any).max_age ?? null;

    switch (age) {
      case "children":
        return (maxAge ?? 200) >= 0 && (minAge ?? 0) <= 12;
      case "teens":
        return (maxAge ?? 200) >= 13 && (minAge ?? 0) <= 17;
      case "young_adults":
        return (maxAge ?? 200) >= 18 && (minAge ?? 0) <= 24;
      case "adults":
        return (maxAge ?? 200) >= 25 && (minAge ?? 0) <= 59;
      case "seniors":
        return (maxAge ?? 200) >= 60 && (minAge ?? 0) <= 200;
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
    if (!id) {
      if (abortRef.current) abortRef.current.abort();
      setDetail(null);
      setProgramsRaw(null);
      setFacilities([]);
      setError(null);
      setLoading(false);
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        
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

  const programs = useMemo(() => {
    if (!programsRaw) return { dropin: [] as DropInProgram[], registered: [] as ProgramRegistered[] };
    return {
      dropin: filterByAge(programsRaw.dropin ?? [], age),
      registered: filterByAge(programsRaw.registered ?? [], age),
    };
  }, [programsRaw, age]);

  return { detail, programs, facilities, loading, error };
}
