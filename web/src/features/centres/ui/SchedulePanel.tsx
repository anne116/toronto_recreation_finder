import { useEffect, useMemo, useState } from "react";
import WeeklyScheduleGrid from "./WeeklyScheduleGrid";
import { searchProgramsAggregated } from "../api/centres.api";
import { attachDistanceKm, buildLocationCoordinatesMap, isWithinDistance } from "../lib/distance";
import { haversineDistanceKm } from "../../../shared/lib/geo";
import { FREE_CENTRE_LOCATION_IDS, isFreeCentreLocation } from "../../../shared/data/freeCentres";
import type { AgeFilter, CentresFeatureCollection, DropInProgram } from "../../../shared/types";
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
  locationId?: string | number;
  scopedCentreId?: string | number | null;
  selectedCentreName?: string | null;
  centres?: CentresFeatureCollection | null;
  userLocation?: { lat: number; lon: number } | null;
  maxDistanceKm?: number;
  freeCentresOnly?: boolean;
};


function normalizeProgram(p: DropInProgram): DropInProgram {
    return {
      ...p,
      course_title: p.course_title ?? "",
    };
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
  locationId,
  scopedCentreId,
  selectedCentreName,
  centres,
  userLocation,
  maxDistanceKm,
  freeCentresOnly = false,
}: Props) {
  const [programs, setPrograms] = useState<DropInProgram[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [scopedPrograms, setScopedPrograms] = useState<DropInProgram[]>([]);
  const [scopedLoading, setScopedLoading] = useState(false);
  const [scopedError, setScopedError] = useState<string | null>(null);

  const coordinatesById = useMemo(() => buildLocationCoordinatesMap(centres), [centres]);

  const scopedLocationIds = useMemo(() => {
    const distanceActive = Boolean(userLocation && maxDistanceKm);
    if (!distanceActive && !freeCentresOnly) return null;
    if (distanceActive && !centres) return undefined;

    if (!distanceActive) {
      // Free Centres Only, no distance filter - use the static list directly,
      // no need to wait on `centres` to be loaded.
      return Array.from(FREE_CENTRE_LOCATION_IDS);
    }

    const withinRadius: (string | number)[] = [];
    coordinatesById.forEach((coord, id) => {
      if (isWithinDistance(haversineDistanceKm(userLocation!, coord), maxDistanceKm!)) {
        withinRadius.push(id);
      }
    });
    return freeCentresOnly ? withinRadius.filter((id) => isFreeCentreLocation(id)) : withinRadius;
  }, [userLocation, maxDistanceKm, centres, coordinatesById, freeCentresOnly]);

  useEffect(() => {
    if (!isVisible || !hasSearchCriteria) {
      setPrograms([]);
      setError(null);
      setLoading(false);
      return;
    }
    if (scopedLocationIds === undefined) return;
    if (scopedLocationIds !== null && scopedLocationIds.length === 0) {
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
          location_id: locationId,
          location_ids: locationId == null ? scopedLocationIds ?? undefined : undefined,
          limit: 2000,
          signal: abortController.signal,
        });

        if (!abortController.signal.aborted) {
          const raw = resp?.programs ?? [];
          const cleaned = raw
            .filter((p) => p && p.course_title != null)
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
  }, [category, activity, activities, age, district, time_of_day, weekday, isVisible, hasSearchCriteria, locationId, scopedLocationIds]);

  useEffect(() => {
    if (!isVisible || !hasSearchCriteria || scopedCentreId == null) {
      setScopedPrograms([]);
      setScopedError(null);
      setScopedLoading(false);
      return;
    }

    const abortController = new AbortController();

    (async () => {
      try {
        setScopedLoading(true);
        setScopedError(null);

        const resp = await searchProgramsAggregated({
          category,
          activity: activity ?? '',
          activities,
          age,
          weekday: weekday ?? undefined,
          district,
          time_of_day,
          location_id: scopedCentreId,
          limit: 2000,
          signal: abortController.signal,
        });

        if (!abortController.signal.aborted) {
          const raw = resp?.programs ?? [];
          const cleaned = raw
            .filter((p) => p && p.course_title != null)
            .map(normalizeProgram);
          setScopedPrograms(cleaned);
        }
      } catch (e: any) {
        if (!abortController.signal.aborted) {
          console.error("Failed to load centre schedule:", e);
          setScopedError("Failed to load sessions for this centre. Please try again.");
          setScopedPrograms([]);
        }
      } finally {
        if (!abortController.signal.aborted) setScopedLoading(false);
      }
    })();

    return () => abortController.abort();
  }, [category, activity, activities, age, district, time_of_day, weekday, isVisible, hasSearchCriteria, scopedCentreId]);

  const isScoped = scopedCentreId != null;
  const rawDisplayedPrograms = isScoped ? scopedPrograms : programs;
  const displayedLoading = isScoped ? scopedLoading : loading;
  const displayedError = isScoped ? scopedError : error;

  const displayedPrograms = useMemo(() => {
    const withDistance = attachDistanceKm(rawDisplayedPrograms, coordinatesById, userLocation ?? null);
    if (!userLocation || !maxDistanceKm) return withDistance;
    return withDistance.filter((p) => isWithinDistance(p.distanceKm, maxDistanceKm));
  }, [rawDisplayedPrograms, coordinatesById, userLocation, maxDistanceKm]);

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
        minHeight: 0,
        padding: '16px',
        overflowY: 'auto',
      }}>
        {!hasSearchCriteria && (
          <div className="text-sm text-gray-500" style={{ padding: '40px 20px', textAlign: 'center' }}>
            Select filters to view available drop-in sessions
          </div>
        )}
  
        {hasSearchCriteria && displayedLoading && (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <Spinner label="Loading schedules" />
          </div>
        )}

        {hasSearchCriteria && !displayedLoading && displayedError && (
          <div className="text-sm text-red-600" style={{ padding: '20px', background: '#fee2e2', borderRadius: '8px' }}>
            {displayedError}
          </div>
        )}

        {hasSearchCriteria && !displayedLoading && !displayedError && displayedPrograms.length === 0 && (
          <div className="text-sm text-gray-500" style={{ padding: '40px 20px', textAlign: 'center' }}>
            {selectedCentreName
              ? `No matching sessions from ${selectedCentreName} for your search criteria`
              : freeCentresOnly
                ? userLocation && maxDistanceKm
                  ? 'No sessions found at Free Centres within your search radius. Try widening your radius or turning off "Free Centres Only".'
                  : 'No sessions found at Free Centres for your search criteria. Try turning off "Free Centres Only" to see more results.'
                : userLocation && maxDistanceKm
                  ? 'No sessions found for your search criteria. Try widening your search radius.'
                  : 'No sessions found for your search criteria'}
          </div>
        )}

        {hasSearchCriteria && !displayedLoading && !displayedError && displayedPrograms.length > 0 && (
          <WeeklyScheduleGrid
            programs={displayedPrograms}
            onLocationClick={onLocationClick}
            initialDay={weekday ?? undefined}
            selectedActivity={activity}
            highlightedLocationId={highlightedLocationId}
            focusToken={focusToken}
            selectedCentreName={selectedCentreName}
          />
        )}
      </div>
    </div>
  );
}
