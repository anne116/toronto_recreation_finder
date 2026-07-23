import { useEffect, useState } from "react";
import WeeklyScheduleGrid from "./WeeklyScheduleGrid";
import { searchProgramsAggregated } from "../api/centres.api";
import type { AgeFilter, DropInProgram } from "../../../shared/types";
import type { WeekdayName } from "../../../shared/lib/weekday";
import Spinner from "../../../shared/ui/Spinner";


type Props = {
  category?: string;
  activity?: string;
  activities?: string[];
  age?: AgeFilter;
  weekday?: WeekdayName | null;
  district?: string;
  time_of_day?: "morning" | "afternoon" | "evening" | "weekend";
  hasSearchCriteria?: boolean;
  onLocationClick: (locationId: string | number, programDetails?: {
    activity?: string | null;
    day_of_week?: string | null;
    start_time?: string | null;
  }) => void;
  highlightedLocationId?: string | number | null;
  focusToken?: number;
  isVisible: boolean;
  className?: string;
};


function normalizeProgram(p: any): DropInProgram {
    return {
      ...p,
      course_title: p.course_title ?? "",
    } as DropInProgram;
  }

export default function SchedulePanel({
  category,
  activity,
  activities,
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
          activity: activity ?? '',
          activities,
          age,
          weekday: weekday ?? undefined,
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
  }, [category, activity, activities, age, district, time_of_day, weekday, isVisible, hasSearchCriteria]);

  if (!isVisible) return null;

  return (
    <div 
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'white',
      }}
    >
  
      <div style={{
        flex: 1,
        padding: '16px',
      }}>
        {!hasSearchCriteria && (
          <div className="text-sm text-gray-500" style={{ padding: '40px 20px', textAlign: 'center' }}>
            Select filters to view available drop-in sessions
          </div>
        )}
  
        {hasSearchCriteria && loading && (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <Spinner label="Loading schedules" />
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
            initialDay={weekday ?? undefined}
            selectedActivity={activity}
            highlightedLocationId={highlightedLocationId}
            focusToken={focusToken}
          />
        )}
      </div>
    </div>
  );  
}
