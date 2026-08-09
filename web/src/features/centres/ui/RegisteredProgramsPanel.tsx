import { useEffect, useMemo, useRef, useState } from "react";
import { searchRegisteredPrograms } from "../api/centres.api";
import { attachDistanceKm, buildLocationCoordinatesMap, isWithinDistance } from "../lib/distance";
import { haversineDistanceKm } from "../../../shared/lib/geo";
import { FREE_CENTRE_LOCATION_IDS, isFreeCentreLocation } from "../../../shared/data/freeCentres";
import type { CentresFeatureCollection, RegisteredAgeFilter, RegisteredProgramGroup } from "../../../shared/types";
import type { WeekdayName } from "../../../shared/lib/weekday";
import { trackEvent } from "../../../shared/lib/analytics";
import Spinner from "../../../shared/ui/Spinner";
import { MdChevronRight, MdExpandMore } from "react-icons/md";

type Props = {
  category?: string;
  activity?: string;
  activities?: string[];
  age?: RegisteredAgeFilter;
  startMonth?: string;
  district?: string;
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

const MATCH_CARD_HIGHLIGHT = "#D8F3EE";
const WEEKDAY_ABBREVIATIONS: Record<WeekdayName, string> = {
  Monday: "Mon",
  Tuesday: "Tue",
  Wednesday: "Wed",
  Thursday: "Thu",
  Friday: "Fri",
  Saturday: "Sat",
  Sunday: "Sun",
};

function formatTime(time?: string | null): string {
  if (!time) return "";
  return time.slice(0, 5);
}

function formatAgeRange(min?: number | null, max?: number | null): string {
  const hasMin = min !== null && min !== undefined;
  const hasMax = max !== null && max !== undefined;
  if (!hasMin && !hasMax) return "All Ages";
  if (hasMin && hasMax) return `Ages ${min}-${max}`;
  if (hasMin) return `Ages ${min}+`;
  if (hasMax) return `Ages under ${max}`;
  return "All Ages";
}

function formatDays(days: WeekdayName[]): string {
  return days.map((day) => WEEKDAY_ABBREVIATIONS[day] ?? day).join(", ");
}

function formatPeriodRange(startDate?: string | null, endDate?: string | null): string {
  if (startDate && endDate) {
    return startDate === endDate ? startDate : `${startDate} to ${endDate}`;
  }
  return startDate ?? endDate ?? "";
}

export default function RegisteredProgramsPanel({
  category,
  activity,
  activities,
  age,
  startMonth,
  district,
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
  const [programs, setPrograms] = useState<RegisteredProgramGroup[]>([]);
  const [sessionsModalProgramId, setSessionsModalProgramId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scopedPrograms, setScopedPrograms] = useState<RegisteredProgramGroup[]>([]);
  const [scopedLoading, setScopedLoading] = useState(false);
  const [scopedError, setScopedError] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const highlightedLocationIdStr = highlightedLocationId != null ? String(highlightedLocationId) : null;
  const cardRefs = useRef(new Map<string, HTMLElement | null>());
  const openMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!openMenuId) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (openMenuRef.current && !openMenuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [openMenuId]);

  useEffect(() => {
    if (!sessionsModalProgramId) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSessionsModalProgramId(null);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [sessionsModalProgramId]);

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
      setSessionsModalProgramId(null);
      setError(null);
      setLoading(false);
      return;
    }
    if (scopedLocationIds === undefined) return;
    if (scopedLocationIds !== null && scopedLocationIds.length === 0) {
      setPrograms([]);
      setSessionsModalProgramId(null);
      setError(null);
      setLoading(false);
      return;
    }

    const abortController = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const resp = await searchRegisteredPrograms({
          category,
          activity: activity ?? "",
          activities,
          age,
          start_month: startMonth,
          district,
          location_id: locationId,
          location_ids: locationId == null ? scopedLocationIds ?? undefined : undefined,
          limit: 2000,
          signal: abortController.signal,
        });

        if (!abortController.signal.aborted) {
          setPrograms(resp?.programs ?? []);
          setSessionsModalProgramId(null);
        }
      } catch (e) {
        if (!abortController.signal.aborted) {
          console.error("Failed to load registered programs:", e);
          setError("Failed to load registered programs. Please try again.");
          setPrograms([]);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    })();

    return () => abortController.abort();
  }, [category, activity, activities, age, startMonth, district, isVisible, hasSearchCriteria, locationId, scopedLocationIds]);

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

        const resp = await searchRegisteredPrograms({
          category,
          activity: activity ?? "",
          activities,
          age,
          start_month: startMonth,
          district,
          location_id: scopedCentreId,
          limit: 2000,
          signal: abortController.signal,
        });

        if (!abortController.signal.aborted) {
          setScopedPrograms(resp?.programs ?? []);
        }
      } catch (e) {
        if (!abortController.signal.aborted) {
          console.error("Failed to load centre's registered programs:", e);
          setScopedError("Failed to load programs for this centre. Please try again.");
          setScopedPrograms([]);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setScopedLoading(false);
        }
      }
    })();

    return () => abortController.abort();
  }, [category, activity, activities, age, startMonth, district, isVisible, hasSearchCriteria, scopedCentreId]);

  const isScoped = scopedCentreId != null;
  const displayedLoading = isScoped ? scopedLoading : loading;
  const displayedError = isScoped ? scopedError : error;
  const rawDisplayedPrograms = isScoped ? scopedPrograms : programs;

  const displayedPrograms = useMemo(() => {
    const withDistance = attachDistanceKm(rawDisplayedPrograms, coordinatesById, userLocation ?? null);
    if (!userLocation || !maxDistanceKm) return withDistance;
    return withDistance.filter((p) => isWithinDistance(p.distanceKm, maxDistanceKm));
  }, [rawDisplayedPrograms, coordinatesById, userLocation, maxDistanceKm]);

  const sortedPrograms = useMemo(() => {
    if (!highlightedLocationIdStr) return displayedPrograms;
    const matches: RegisteredProgramGroup[] = [];
    const others: RegisteredProgramGroup[] = [];
    displayedPrograms.forEach((program) => {
      if (String(program.location_id) === highlightedLocationIdStr) {
        matches.push(program);
      } else {
        others.push(program);
      }
    });
    return [...matches, ...others];
  }, [displayedPrograms, highlightedLocationIdStr]);

  useEffect(() => {
    if (!highlightedLocationIdStr) return;
    const firstMatch = sortedPrograms.find(
      (program) => String(program.location_id) === highlightedLocationIdStr
    );
    if (!firstMatch) return;
    cardRefs.current.get(firstMatch.id)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [sortedPrograms, highlightedLocationIdStr, focusToken]);

  if (!isVisible) return null;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "white",
      }}
    >
      <div style={{ flex: 1, minHeight: 0, padding: "10px", overflowY: "auto" }}>
        {!hasSearchCriteria && (
          <div className="text-sm text-gray-500" style={{ padding: "40px 20px", textAlign: "center" }}>
            Select filters to view registered programs
          </div>
        )}

        {hasSearchCriteria && displayedLoading && (
          <div style={{ padding: "40px 20px", textAlign: "center" }}>
            <Spinner label="Loading registered programs" />
          </div>
        )}

        {hasSearchCriteria && !displayedLoading && displayedError && (
          <div className="text-sm text-red-600" style={{ padding: "20px", background: "#fee2e2", borderRadius: "8px" }}>
            {displayedError}
          </div>
        )}

        {hasSearchCriteria && !displayedLoading && !displayedError && sortedPrograms.length === 0 && (
          <div className="text-sm text-gray-500" style={{ padding: "40px 20px", textAlign: "center" }}>
            {selectedCentreName
              ? `No matching programs from ${selectedCentreName} for your search criteria`
              : freeCentresOnly
                ? userLocation && maxDistanceKm
                  ? 'No registered programs found at Free Centres within your search radius. Try widening your radius or turning off "Free Centres Only".'
                  : 'No registered programs found at Free Centres for your search criteria. Try turning off "Free Centres Only" to see more results.'
                : userLocation && maxDistanceKm
                  ? "No registered programs found for your search criteria. Try widening your search radius."
                  : "No registered programs found for your search criteria"}
          </div>
        )}

        {hasSearchCriteria && !displayedLoading && !displayedError && sortedPrograms.length > 0 && (
          <div style={{ display: "grid", gap: "6px" }}>
            {sortedPrograms.map((program) => {
              const isHighlighted = highlightedLocationIdStr !== null && String(program.location_id) === highlightedLocationIdStr;
              const primaryPeriod = program.periods[0];
              const collapsedDays = primaryPeriod?.days_of_week ?? program.days_of_week;
              const collapsedStartDate = primaryPeriod?.start_date ?? program.start_date;
              const collapsedEndDate = primaryPeriod?.end_date ?? program.end_date;
              const collapsedDateRange = primaryPeriod?.date_range ?? formatPeriodRange(collapsedStartDate, collapsedEndDate);
              const collapsedStartTime = primaryPeriod?.start_time ?? program.start_time;
              const collapsedEndTime = primaryPeriod?.end_time ?? program.end_time;
              const primaryRegisterUrl = primaryPeriod?.activity_url;

              return (
                <div key={program.id}>
                <article
                  ref={(node) => {
                    cardRefs.current.set(program.id, node);
                  }}
                  onClick={() => onLocationClick(program.location_id, {
                    activity: program.course_title,
                    day_of_week: collapsedDays?.[0] || undefined,
                    start_time: collapsedStartTime
                  })}
                  style={{
                    position: "relative",
                    border: "1px solid #e2e8f0",
                    borderRadius: "14px",
                    padding: "8px 10px",
                    background: isHighlighted ? MATCH_CARD_HIGHLIGHT : "#ffffff",
                    boxShadow: isHighlighted ? "0 0 0 1px #9bd5c6 inset" : "0 1px 3px rgba(15,23,42,0.06)",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: "8px",
                      marginBottom: "2px",
                    }}
                  >
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#1e293b" }}>
                      {program.course_title}{' '}
                      <span style={{ fontWeight: 400, color: "#475569" }}>
                        (👥 {formatAgeRange(program.age_min, program.age_max)})
                      </span>
                      {program.distanceKm != null && (
                        <span className="distance-pill">
                          📏 {program.distanceKm.toFixed(1)} km away
                        </span>
                      )}
                      {!freeCentresOnly && isFreeCentreLocation(program.location_id) && (
                        <span className="free-centre-badge">
                          🆓 Free Centre
                        </span>
                      )}
                    </div>

                    {(primaryRegisterUrl || program.periods.length > 1) && (
                      <div
                        style={{ position: "relative", flexShrink: 0 }}
                        ref={openMenuId === program.id ? openMenuRef : undefined}
                      >
                        {primaryRegisterUrl && program.periods.length <= 1 ? (
                          <a
                            href={primaryRegisterUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(event) => {
                              event.stopPropagation();
                              trackEvent('external_link_clicked', {
                                location_name: program.location_name,
                                link_type: 'registration',
                                activity: program.course_title,
                                url: primaryRegisterUrl,
                              });
                            }}
                            className="registered-program-pill"
                          >
                            Register
                          </a>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="registered-program-pill"
                              aria-haspopup="menu"
                              aria-expanded={openMenuId === program.id}
                              onClick={(event) => {
                                event.stopPropagation();
                                setOpenMenuId(openMenuId === program.id ? null : program.id);
                              }}
                            >
                              {primaryRegisterUrl ? "Register" : "Sessions"}
                              <MdExpandMore size={14} className="registered-program-pill-chevron" />
                            </button>

                            {openMenuId === program.id && (
                              <div
                                className="registered-program-menu"
                                role="menu"
                                onClick={(event) => event.stopPropagation()}
                              >
                                {primaryRegisterUrl && (
                                  <a
                                    href={primaryRegisterUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    role="menuitem"
                                    className="registered-program-menu-item"
                                    onClick={() => {
                                      trackEvent('external_link_clicked', {
                                        location_name: program.location_name,
                                        link_type: 'registration',
                                        activity: program.course_title,
                                        url: primaryRegisterUrl,
                                      });
                                      setOpenMenuId(null);
                                    }}
                                  >
                                    Register
                                  </a>
                                )}
                                <button
                                  type="button"
                                  role="menuitem"
                                  className="registered-program-menu-item"
                                  onClick={() => {
                                    setSessionsModalProgramId(program.id);
                                    setOpenMenuId(null);
                                  }}
                                >
                                  View more sessions
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: "12px", color: "#334155", marginBottom: "1px" }}>
                    🕒 {formatDays(collapsedDays)}, {formatTime(collapsedStartTime)}–{formatTime(collapsedEndTime)}
                  </div>
                  <div style={{ fontSize: "12px", color: "#334155", marginBottom: "1px" }}>
                    📅 {collapsedDateRange}
                  </div>
                  {selectedCentreName ? (
                    <MdChevronRight
                      size={16}
                      color="#94a3b8"
                      style={{ position: "absolute", bottom: "8px", right: "10px" }}
                    />
                  ) : (
                    <div
                      style={{
                        fontSize: "12px",
                        color: "var(--color-primary-hover)",
                        marginBottom: "1px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "2px",
                      }}
                    >
                      <span>📍 {program.location_name}</span>
                      <MdChevronRight size={16} color="#94a3b8" />
                    </div>
                  )}
                </article>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {sessionsModalProgramId && (() => {
        const modalProgram = sortedPrograms.find((p) => p.id === sessionsModalProgramId);
        if (!modalProgram) return null;

        return (
          <div
            className="registered-sessions-modal-backdrop"
            onClick={() => setSessionsModalProgramId(null)}
          >
            <div
              className="registered-sessions-modal"
              role="dialog"
              aria-modal="true"
              aria-label={`Registration periods for ${modalProgram.course_title}`}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="registered-sessions-modal-header">
                <div className="registered-sessions-modal-title">
                  {modalProgram.course_title}
                </div>
                <button
                  type="button"
                  className="registered-sessions-modal-close"
                  aria-label="Close"
                  onClick={() => setSessionsModalProgramId(null)}
                >
                  ✕
                </button>
              </div>

              <div className="registered-sessions-modal-body">
                {modalProgram.periods.map((period) => (
                  <div key={period.id} className="registered-sessions-modal-row">
                    <div style={{ fontSize: "13px", color: "#334155", lineHeight: 1.5 }}>
                      <div>{formatPeriodRange(period.start_date, period.end_date)}</div>
                      <div>
                        ({formatDays(period.days_of_week)}) {formatTime(period.start_time)}–{formatTime(period.end_time)}
                      </div>
                    </div>
                    {period.activity_url && (
                      <a
                        href={period.activity_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(event) => {
                          event.stopPropagation();
                          trackEvent('external_link_clicked', {
                            location_name: modalProgram.location_name,
                            link_type: 'registration',
                            activity: modalProgram.course_title,
                            url: period.activity_url,
                          })
                        }}
                        style={{
                          color: "var(--color-primary-hover)",
                          fontSize: "13px",
                          fontWeight: 600,
                          textDecoration: "none",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Register
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
