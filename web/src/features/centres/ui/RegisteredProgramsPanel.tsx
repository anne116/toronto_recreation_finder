import { useEffect, useMemo, useRef, useState } from "react";
import { searchRegisteredPrograms } from "../api/centres.api";
import type { RegisteredAgeFilter, RegisteredProgramGroup } from "../../../shared/types";
import type { WeekdayName } from "../../../shared/lib/weekday";
import { trackEvent } from "../../../shared/lib/analytics";

type Props = {
  category?: string;
  activity?: string;
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
  age,
  startMonth,
  district,
  hasSearchCriteria = false,
  onLocationClick,
  highlightedLocationId,
  focusToken = 0,
  isVisible,
}: Props) {
  const [programs, setPrograms] = useState<RegisteredProgramGroup[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const highlightedLocationIdStr = highlightedLocationId != null ? String(highlightedLocationId) : null;
  const cardRefs = useRef(new Map<string, HTMLElement | null>());

  useEffect(() => {
    if (!isVisible || !hasSearchCriteria) {
      setPrograms([]);
      setExpandedIds(new Set());
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
          age,
          start_month: startMonth,
          district,
          limit: 2000,
          signal: abortController.signal,
        });

        if (!abortController.signal.aborted) {
          setPrograms(resp?.programs ?? []);
          setExpandedIds(new Set());
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
  }, [category, activity, age, startMonth, district, isVisible, hasSearchCriteria]);

  const sortedPrograms = useMemo(() => {
    if (!highlightedLocationIdStr) {
      return programs;
    }

    const matches: RegisteredProgramGroup[] = [];
    const others: RegisteredProgramGroup[] = [];
    programs.forEach((program) => {
      if (String(program.location_id) === highlightedLocationIdStr) {
        matches.push(program);
      } else {
        others.push(program);
      }
    });
    return [...matches, ...others];
  }, [programs, highlightedLocationIdStr]);

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

  function toggleExpanded(programId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(programId)) {
        next.delete(programId);
      } else {
        next.add(programId);
      }
      return next;
    });
  }

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
      <div style={{ flex: 1, padding: "16px", overflowY: "auto" }}>
        {!hasSearchCriteria && (
          <div className="text-sm text-gray-500" style={{ padding: "40px 20px", textAlign: "center" }}>
            Select filters to view registered programs
          </div>
        )}

        {hasSearchCriteria && loading && (
          <div className="text-sm text-gray-500" style={{ padding: "40px 20px", textAlign: "center" }}>
            Loading registered programs…
          </div>
        )}

        {hasSearchCriteria && !loading && error && (
          <div className="text-sm text-red-600" style={{ padding: "20px", background: "#fee2e2", borderRadius: "8px" }}>
            {error}
          </div>
        )}

        {hasSearchCriteria && !loading && !error && sortedPrograms.length === 0 && (
          <div className="text-sm text-gray-500" style={{ padding: "40px 20px", textAlign: "center" }}>
            No registered programs found for your search criteria
          </div>
        )}

        {hasSearchCriteria && !loading && !error && sortedPrograms.length > 0 && (
          <div style={{ display: "grid", gap: "12px" }}>
            {sortedPrograms.map((program) => {
              const isHighlighted = highlightedLocationIdStr !== null && String(program.location_id) === highlightedLocationIdStr;
              const isExpanded = expandedIds.has(program.id);
              const primaryPeriod = program.periods[0];
              const collapsedDays = primaryPeriod?.days_of_week ?? program.days_of_week;
              const collapsedStartDate = primaryPeriod?.start_date ?? program.start_date;
              const collapsedEndDate = primaryPeriod?.end_date ?? program.end_date;
              const collapsedDateRange = primaryPeriod?.date_range ?? formatPeriodRange(collapsedStartDate, collapsedEndDate);
              const collapsedStartTime = primaryPeriod?.start_time ?? program.start_time;
              const collapsedEndTime = primaryPeriod?.end_time ?? program.end_time;
              const primaryRegisterUrl = primaryPeriod?.activity_url;

              return (
                <article
                  key={program.id}
                  ref={(node) => {
                    cardRefs.current.set(program.id, node);
                  }}
                  onClick={() => onLocationClick(program.location_id, {
                    activity: program.course_title,
                    day_of_week: collapsedDays?.[0] || undefined,
                    start_time: collapsedStartTime
                  })}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "14px",
                    padding: "14px",
                    background: isHighlighted ? MATCH_CARD_HIGHLIGHT : "#ffffff",
                    boxShadow: isHighlighted ? "0 0 0 1px #9bd5c6 inset" : "0 1px 3px rgba(15,23,42,0.06)",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontSize: "16px", fontWeight: 700, color: "#1e293b", marginBottom: "8px" }}>
                    {program.course_title}
                  </div>
                  <div style={{ fontSize: "14px", color: "#334155", marginBottom: "4px" }}>
                    🕒 {formatDays(collapsedDays)}, {formatTime(collapsedStartTime)}–{formatTime(collapsedEndTime)}
                  </div>
                  <div style={{ fontSize: "14px", color: "#334155", marginBottom: "4px" }}>
                    📅 {collapsedDateRange}
                  </div>
                  <div style={{ fontSize: "14px", color: "#2563eb", marginBottom: "4px" }}>
                    📍 {program.location_name}
                  </div>
                  <div style={{ fontSize: "14px", color: "#475569", marginBottom: "10px" }}>
                    👥 {formatAgeRange(program.age_min, program.age_max)}
                  </div>

                  {primaryRegisterUrl && (
                    <div style={{ marginBottom: "10px" }}>
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
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "8px 12px",
                          borderRadius: "999px",
                          background: "#2563eb",
                          color: "#ffffff",
                          fontSize: "13px",
                          fontWeight: 600,
                          textDecoration: "none",
                        }}
                      >
                        Register
                      </a>
                    </div>
                  )}

                  {program.periods.length > 1 && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleExpanded(program.id);
                      }}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: "#0f766e",
                        fontSize: "13px",
                        fontWeight: 600,
                        padding: 0,
                        cursor: "pointer",
                      }}
                    >
                      {isExpanded ? "Hide registration periods" : "View all registration periods"}
                    </button>
                  )}

                  {isExpanded && (
                    <div
                      style={{
                        marginTop: "12px",
                        paddingTop: "12px",
                        borderTop: "1px solid #dbeafe",
                        display: "grid",
                        gap: "10px",
                      }}
                    >
                      {program.periods.map((period) => (
                        <div
                          key={period.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: "12px",
                            alignItems: "flex-start",
                          }}
                        >
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
                                  location_name: program.location_name,
                                  link_type: 'registration',
                                  activity: program.course_title,
                                  url: period.activity_url,
                                })
                              }}
                              style={{
                                color: "#1d4ed8",
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
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
