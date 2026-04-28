import { useEffect, useMemo, useState } from "react";
import WeeklyScheduleGrid from "./WeeklyScheduleGrid";
import { searchProgramsAggregated } from "../api/centres.api";
import type { DropInProgram } from "../../../shared/types";


type Props = {
  category?: string;
  activity?: string;
  age?: "young" | "teen" | "adult" | "senior";
  weekday?: string | number;
  district?: string;
  time_of_day?: "morning" | "afternoon" | "evening" | "weekend";
  hasSearchCriteria?: boolean;
  onLocationClick: (locationId: string | number) => void;
  highlightedLocationId?: string | number | null;
  focusToken?: number;
  isVisible: boolean;
  className?: string;
};

const DAY_NAME = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_INDEX: Record<string, number> = {
  Monday: 0,
  Tuesday: 1,
  Wednesday: 2,
  Thursday: 3,
  Friday: 4,
  Saturday: 5,
  Sunday: 6,
};

function toWeekdayNumber(w?: string | number): number | undefined {
  if (w === undefined || w === null || w === '') return undefined;
  if (typeof w === "number") return w;
  const asNumber = Number(w);
  if (!Number.isNaN(asNumber)) {
    return asNumber;
  }
  return DAY_INDEX[w] ?? undefined;
}

function normalizeProgram(p: any): DropInProgram {
    return {
      ...p,
      course_title: p.course_title ?? "",
      day_of_week: p.day_of_week ?? (typeof p.weekday === "number" ? DAY_NAME[p.weekday] : ""),
    } as DropInProgram;
  }

export default function SchedulePanel({
  category,
  activity,
  age,
  weekday,
  district,
  time_of_day,
  hasSearchCriteria = false,
  onLocationClick,
  highlightedLocationId,
  focusToken = 0,
  isVisible,
}: Props) {
  const [programs, setPrograms] = useState<DropInProgram[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedWeekday = useMemo(() => toWeekdayNumber(weekday), [weekday]);
  useEffect(() => {
    if (!isVisible || !hasSearchCriteria) {
      setPrograms([]);
      setError(null);
      setLoading(false);
      return;
    }

    const abortController = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const resp = await searchProgramsAggregated({
          category,
          activity,
          age,
          weekday: normalizedWeekday,
          district,
          time_of_day,
          limit: 2000,
          signal: abortController.signal,
        });

        if (!abortController.signal.aborted) {
          const raw = resp?.programs ?? [];
          const cleaned = raw
            .filter((p: any) => p && p.course_title != null)
            .map(normalizeProgram);
          setPrograms(cleaned);
        }
      } catch (e: any) {
        if (!abortController.signal.aborted) {
          console.error("Failed to load schedule:", e);
          setError("Failed to load schedule. Please try again.");
          setPrograms([]);
        }
      } finally {
        if (!abortController.signal.aborted) setLoading(false);
      }
    })();

    return () => abortController.abort();
  }, [category, activity, age, district, time_of_day, normalizedWeekday, isVisible, hasSearchCriteria]);

  if (!isVisible) return null;

  return (
    <div 
      style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'white',
        overflow: 'hidden',
      }}
    >
  
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '16px',
      }}>
        {!hasSearchCriteria && (
          <div className="text-sm text-gray-500" style={{ padding: '40px 20px', textAlign: 'center' }}>
            Select filters to view available drop-in sessions
          </div>
        )}
  
        {hasSearchCriteria && loading && (
          <div className="text-sm text-gray-500" style={{ padding: '40px 20px', textAlign: 'center' }}>
            Loading schedules…
          </div>
        )}
  
        {hasSearchCriteria && !loading && error && (
          <div className="text-sm text-red-600" style={{ padding: '20px', background: '#fee2e2', borderRadius: '8px' }}>
            {error}
          </div>
        )}
  
        {hasSearchCriteria && !loading && !error && programs.length === 0 && (
          <div className="text-sm text-gray-500" style={{ padding: '40px 20px', textAlign: 'center' }}>
            No sessions found for your search criteria
          </div>
        )}
  
        {hasSearchCriteria && !loading && !error && programs.length > 0 && (
          <WeeklyScheduleGrid
            programs={programs}
            onLocationClick={onLocationClick}
            initialWeekday={normalizedWeekday}
            selectedActivity={activity}
            highlightedLocationId={highlightedLocationId}
            focusToken={focusToken}
          />
        )}
      </div>
    </div>
  );  
}
