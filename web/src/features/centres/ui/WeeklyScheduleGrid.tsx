import type { DropInProgram } from '../../../shared/types';
import { useEffect, useMemo, useRef, useState } from 'react';
import { MdChevronRight } from 'react-icons/md';
import { isFreeCentreLocation } from '../../../shared/data/freeCentres';

type ScheduleProgram = DropInProgram & {
  occurrence_count?: number;
}

type Props = {
  programs: DropInProgram[];
  sport?: string;
  onLocationClick?: (locationId: string | number, programDetails?: {
    activity?: string | null;
    day_of_week?: string | null;
    start_time?: string | null;
  }) => void;
  initialDay?: string;
  selectedActivity?: string;
  highlightedLocationId?: string | number | null;
  focusToken?: number;
  selectedCentreName?: string | null;
};

const MATCH_ROW_HIGHLIGHT = '#D8F3EE';
const MATCH_TAB_TINT = '#BFE7DF';

function formatTime(time?: string | null): string {
  if (!time) return '';
  return time.slice(0, 5);
}

function formatAgeRange(min?: number | null, max?: number | null): string {
  const hasMin = min !== null && min !== undefined;
  const hasMax = max !== null && max !== undefined;
  if (!hasMin && !hasMax) return 'All Ages';
  if (hasMin && hasMax) return `${min}-${max}`;
  if (hasMin) return `${min}+`;
  if (hasMax) return `Under ${max}`;
  return 'All Ages';
}

function formatDateDisplay(program: DropInProgram): string {
  return program.date_range ?? program.start_date ?? program.end_date ?? '';
}

function formatScheduleLine(program: ScheduleProgram): string {
  const dateDisplay = formatDateDisplay(program);
  if ((program.occurrence_count ?? 1) >1 && program.day_of_week) {
    return dateDisplay ? `Every ${program.day_of_week} (${dateDisplay})` : `Every ${program.day_of_week}`;
  }
  return dateDisplay;
}

function comparePrograms(a: DropInProgram, b: DropInProgram): number {
  const dateCompare = (a.start_date || '').localeCompare(b.start_date || '');
  if (dateCompare !== 0) return dateCompare;

  const timeCompare = formatTime(a.start_time).localeCompare(formatTime(b.start_time));
  if (timeCompare !== 0) return timeCompare;

  return (a.course_title || '').localeCompare(b.course_title || '');
}

function groupRecurringPrograms(programs: DropInProgram[]): ScheduleProgram[] {
  const grouped = new Map<string, DropInProgram[]>();

  programs.forEach((program) => {
    const key = [
      program.location_id,
      program.day_of_week ?? '',
      program.start_time ?? '',
      program.end_time ?? '',
    ].join('|');

    const bucket = grouped.get(key);
    if (bucket) {
      bucket.push(program);
    } else {
      grouped.set(key, [program]);
    }
  });

  return Array.from(grouped.values()).map((bucket) => {
    const sorted = [...bucket].sort((a, b) => (a.start_date || '').localeCompare(b.start_date || ''));
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const startDate = first.start_date ?? null;
    const endDate = last.end_date ?? last.start_date ?? null;
    
    let dateRange = first.date_range ?? startDate ?? endDate ?? null;
    if (startDate && endDate) {
      dateRange = startDate === endDate ? startDate : `${startDate} to ${endDate}`; 
    }

    return {
      ...first,
      start_date: startDate,
      end_date: endDate,
      date_range: dateRange,
      occurrence_count: sorted.length,
    };
  });
}

function groupByDay(programs: DropInProgram[]) {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const grouped = new Map<string, ScheduleProgram[]>();

  days.forEach(day => grouped.set(day, []));

  groupRecurringPrograms(programs).forEach(p => {
    const day = p.day_of_week || 'Unknown';
    if (grouped.has(day)) {
      grouped.get(day)!.push(p);
    } else {
      grouped.set(day, [p]);
    }
  });

  grouped.forEach((dayPrograms, day) => {
    grouped.set(day, [...dayPrograms].sort(comparePrograms));
  });

  return grouped;
}

export default function WeeklyScheduleGrid({ 
  programs, 
  onLocationClick,
  initialDay,
  selectedActivity,
  highlightedLocationId,
  focusToken = 0,
  selectedCentreName,
}: Props) {
  const grouped = groupByDay(programs);
  const dayConfigs = [
    { key: 'Monday', label: 'Mon' },
    { key: 'Tuesday', label: 'Tue' },
    { key: 'Wednesday', label: 'Wed' },
    { key: 'Thursday', label: 'Thu' },
    { key: 'Friday', label: 'Fri' },
    { key: 'Saturday', label: 'Sat' },
    { key: 'Sunday', label: 'Sun' },
  ];
  const [selectedDay, setSelectedDay] = useState<string>('Monday');
  const firstMatchingRowRef = useRef<HTMLDivElement | null>(null);
  const highlightedLocationIdStr = highlightedLocationId != null ? String(highlightedLocationId) : null;
  const matchingDaySet = useMemo(() => {
    const days = new Set<string>();
    if (!highlightedLocationIdStr) return days;

    programs.forEach((program) => {
      const locationId = program.location_id;
      if (locationId != null && String(locationId) === highlightedLocationIdStr && program.day_of_week) {
        days.add(program.day_of_week);
      }
    });

    return days;
  }, [programs, highlightedLocationIdStr]);


  useEffect(() => {
    const daysWithPrograms = dayConfigs
      .map(d => d.key)
      .filter(dayKey => (grouped.get(dayKey) ?? []).length > 0);
      if (initialDay && (grouped.get(initialDay) ?? []).length >0) {
        setSelectedDay(initialDay);
      return;
    }

    if (daysWithPrograms.length > 0) {
      setSelectedDay(daysWithPrograms[0]);
      } else {
        setSelectedDay('Monday');
      }
    }, [initialDay, programs]);

  useEffect(() => {
    if (!highlightedLocationIdStr || matchingDaySet.size === 0) {
      return;
    }

    const firstMatchingDay = dayConfigs.find(({ key }) => matchingDaySet.has(key))?.key;
    if (firstMatchingDay) {
      setSelectedDay(firstMatchingDay);
    }
  }, [focusToken, highlightedLocationIdStr, matchingDaySet]);

  useEffect(() => {
    if (!highlightedLocationIdStr || matchingDaySet.size === 0 || !matchingDaySet.has(selectedDay)) {
      return;
    }

    firstMatchingRowRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }, [selectedDay, highlightedLocationIdStr, matchingDaySet, focusToken]);
  
  if (programs.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
        No programs found matching your criteria
      </div>
    );
  }

  const dayPrograms = grouped.get(selectedDay) ?? [];
  const firstMatchingIndex = dayPrograms.findIndex((program) => {
    const locationId = program.location_id;
    return highlightedLocationIdStr !== null && locationId != null && String(locationId) === highlightedLocationIdStr;
  });

  return (
    <div style={{ padding: '0' }}>
      <div
        style={{
          display: 'flex',
          gap: 0,
          padding: '8px 12px 0',
          borderBottom: '3px solid var(--color-primary)',
          borderRadius: '12px 12px 0px 0px',
          background: 'var(--color-primary-light)',
          position: 'sticky',
          top: 0,
          zIndex: 5,
          overflowX: 'auto',
        }}
      >
        {dayConfigs.map(({ key, label }) => {
          const isActive = key === selectedDay;
          const hasPrograms = (grouped.get(key) ?? []).length > 0;
          const isMatchingDay = matchingDaySet.has(key);
          return (
            <button
              key={key}
              type="button"
              disabled={!hasPrograms}
              onClick={() =>  {
                if (!hasPrograms) return;
                setSelectedDay(key)}
              }
              style={{
                border: isActive
                ? '2px solid var(--color-primary)'
                : isMatchingDay
                ? `2px solid ${MATCH_TAB_TINT}`
                : hasPrograms
                ? '1.5px solid var(--color-border-hover)'
                : '1px dashed #cbd5f5',
                padding: '8px 12px',
                borderRadius: '12px 12px 0px 0px',
                fontSize: 13,
                cursor: hasPrograms ? 'pointer' : 'default',
                background: isActive
                ? 'var(--color-primary)'
                : isMatchingDay
                ? MATCH_TAB_TINT
                : hasPrograms
                ? 'var(--color-primary-light)'
                : '#f8fafc',
                color: isActive
                ? '#ffffff'
                : isMatchingDay
                ? '#134e4a'
                : hasPrograms
                ? 'var(--color-primary-hover)'
                : '#94a3b8',
                fontWeight: isActive ? 700 : 500,
                whiteSpace: 'nowrap',
                boxSizing: 'border-box',
                flex: 1,
                textAlign: 'center',
                opacity: hasPrograms ? 1 : 0.6,
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {dayPrograms.length > 0 ? (
        <div
          style={{
            border: '1px solid #e2e8f0',
            borderRadius: 6,
            marginTop: 4,
          }}
        >
          {dayPrograms.map((program, idx) => {
            const locationName =
              program.location_name ||
              program.asset_name ||
              'Unknown Location';
            const locationId = program.location_id;
            const shouldShowCourseTitle = !selectedActivity && Boolean(program.course_title);
            const isHighlightedMatch =
              highlightedLocationIdStr !== null &&
              locationId != null &&
              String(locationId) === highlightedLocationIdStr;
            const isFirstRow = idx === 0;
            const isLastRow = idx === dayPrograms.length - 1;

            return (
              <div
                key={`${selectedDay}-${idx}`}
                ref={(node) => {
                  if (idx === firstMatchingIndex) {
                    firstMatchingRowRef.current = node;
                  }
                }}
                style={{
                  position: 'relative',
                  padding: '2px 8px 2px 12px',
                  borderRadius: isFirstRow && isLastRow
                    ? 5
                    : isFirstRow
                    ? '5px 5px 0 0'
                    : isLastRow
                    ? '0 0 5px 5px'
                    : 0,
                  borderBottom:
                    idx < dayPrograms.length - 1
                      ? '1px solid #f1f5f9'
                      : 'none',
                  background: isHighlightedMatch ? MATCH_ROW_HIGHLIGHT : '#ffffff',
                  cursor: onLocationClick && locationId ? 'pointer' : 'default',
                  transition: 'background 0.2s',
                }}
                onClick={() => 
                  onLocationClick && locationId && onLocationClick(locationId, {
                    activity: program.activity,
                    day_of_week: selectedDay,
                    start_time: program.start_time
                  })
                }
                onMouseEnter={(e) => {
                  if (onLocationClick && locationId) {
                    e.currentTarget.style.background = isHighlightedMatch ? MATCH_ROW_HIGHLIGHT : '#f8fafc';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isHighlightedMatch ? MATCH_ROW_HIGHLIGHT : '#ffffff';
                }}
              >
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#334155',
                    marginBottom: '3px',
                  }}
                >
                  {shouldShowCourseTitle ? (
                    <>
                      {program.course_title}{' '}
                      <span style={{ fontWeight: 400, color: '#64748b' }}>
                        (👥 {formatAgeRange(program.age_min, program.age_max)})
                      </span>
                    </>
                  ) : (
                    <span style={{ fontWeight: 400, color: '#64748b' }}>
                      👥 {formatAgeRange(program.age_min, program.age_max)}
                    </span>
                  )}
                  {program.distanceKm != null && (
                    <span className="distance-pill">
                      📏 {program.distanceKm.toFixed(1)} km away
                    </span>
                  )}
                  {isFreeCentreLocation(locationId) && (
                    <span className="free-centre-badge">
                      🆓 Free Centre
                    </span>
                  )}
                </div>

                <div
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#1e293b',
                  marginBottom: '2px',
                }}
              >
                 🕒 {formatTime(program.start_time)} - {formatTime(program.end_time)}
              </div>

              {formatDateDisplay(program) && (
                <div
                  style={{
                    fontSize: '12px',
                    color: '#64748b',
                    marginBottom: '2px',
                  }}
                >
                  📅 {formatScheduleLine(program)}
                </div>
              )}

              {selectedCentreName ? (
                onLocationClick && locationId && (
                  <MdChevronRight
                    size={16}
                    color="#94a3b8"
                    style={{ position: 'absolute', top: '10px', right: '8px' }}
                  />
                )
              ) : (
                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--color-primary)',
                    marginBottom: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '4px',
                  }}
                >
                  <span>📍{locationName}</span>
                  {onLocationClick && locationId && (
                    <MdChevronRight size={16} color="#94a3b8" />
                  )}
                </div>
              )}
              </div>
          );
        })}
      </div>
    ) : (
      <div
        style={{
          padding: '20px',
          textAlign: 'center',
          color: '#94a3b8',
          fontSize: '13px',
          border: '1px solid #e2e8f0',
          borderRadius: 6,
          background: '#f8fafc',
          marginTop: 8,
        }}
      >
        {selectedCentreName
          ? `No matching sessions from ${selectedCentreName} on this day.`
          : 'No programs scheduled for this day'}
      </div>
    )}
  </div>
);

}
