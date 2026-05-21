import { useEffect, useRef, useState } from "react";
import type { CentreDetail } from "../../../shared/types";
import { getCentreDetail } from "../api/centres.api";

export function useCentreDetails(id: string | number | null) {
  const [detail, setDetail] = useState<CentreDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!id) {
      if (abortRef.current) abortRef.current.abort();
      setDetail(null);
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
        
        const centreDetail = await getCentreDetail(id, { signal: ac.signal });

        if (!ac.signal.aborted) {
          setDetail(centreDetail);
        }
      } catch (e) {
        if (!ac.signal.aborted) {
          setError(e);
          setDetail(null);
        }
      } finally {
        if (!ac.signal.aborted) {
          setLoading(false);
        }
      }
    })();

    return () => ac.abort();
  }, [id]);

  return {detail, loading, error };
}
