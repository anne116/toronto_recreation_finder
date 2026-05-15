import type { DropInProgram } from '../../../shared/types';
import { useEffect, useMemo, useRef, useState } from 'react';

type Props = {
  programs: DropInProgram[];
  sport?: string;
  onLocationClick?: (locationId: string | number) => void;
  initialDay?: string;
  selectedActivity?: string;
  highlightedLocationId?: string | number | null;
  focusToken?: number;
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

function deduplicatePrograms(programs: DropInProgram[]): DropInProgram[] {
  const seen = new Map<string, DropInProgram>();
  
  programs.forEach(p => {
    const locationId = (p as any).location_id || 'unknown';
    const day = p.day_of_week || 'unknown';
    const start = formatTime(p.start_time);
    const end = formatTime(p.end_time);
    const ageMin = p.age_min ?? 'any';
    const ageMax = p.age_max ?? 'any';
    
    const key = `${locationId}-${day}-${start}-${end}-${ageMin}-${ageMax}`;
    
    if (!seen.has(key)) {
      seen.set(key, p);
    }
  });
  
  return Array.from(seen.values());
}

function groupByDay(programs: DropInProgram[]) {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const grouped = new Map<string, DropInProgram[]>();
  
  days.forEach(day => grouped.set(day, []));
  
  const uniquePrograms = deduplicatePrograms(programs);
  
  
  uniquePrograms.forEach(p => {
    const day = p.day_of_week || 'Unknown';
    if (grouped.has(day)) {
      grouped.get(day)!.push(p);
    } else {
      grouped.set(day, [p]);
    }
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
      const locationId = (program as any).location_id;
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
    const locationId = (program as any).location_id;
    return highlightedLocationIdStr !== null && locationId != null && String(locationId) === highlightedLocationIdStr;
  });
  
  return (
    <div style={{ padding: '0' }}>
      <div
        style={{
          display: 'flex',
          gap: 0,
          padding: '8px 12px 0',
          borderBottom: '3px solid #3b82f6',
          borderRadius: '12px 12px 0px 0px',
          background: '#e5f0ff',
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
                ? '2px solid #3b82f6'
                : isMatchingDay
                ? `2px solid ${MATCH_TAB_TINT}`
                : hasPrograms
                ? '1.5px solid #bfdbfe'
                : '1px dashed #cbd5f5',
                padding: '8px 12px',
                borderRadius: '12px 12px 0px 0px',
                fontSize: 13,
                cursor: hasPrograms ? 'pointer' : 'default',
                background: isActive 
                ? '#4d95f7' 
                : isMatchingDay
                ? MATCH_TAB_TINT
                : hasPrograms
                ? '#e5f0ff'
                : '#f8fafc',
                color: isActive 
                ? '#ffffff' 
                : isMatchingDay
                ? '#134e4a'
                : hasPrograms
                ? '#1d4ed8'
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
            overflow: 'hidden',
            marginTop: 8,
          }}
        >
          {dayPrograms.map((program, idx) => {
            const locationName = 
              (program as any).location_name ||
              (program as any).asset_name ||
              'Unknown Location';
            const locationId = ((program as any).location_id);
            const shouldShowCourseTitle = !selectedActivity && Boolean(program.course_title);
            const isHighlightedMatch =
              highlightedLocationIdStr !== null &&
              locationId != null &&
              String(locationId) === highlightedLocationIdStr;

            return (
              <div
                key={`${selectedDay}-${idx}`}
                ref={(node) => {
                  if (idx === firstMatchingIndex) {
                    firstMatchingRowRef.current = node;
                  }
                }}
                style={{
                  padding: '12px',
                  borderBottom:
                    idx < dayPrograms.length - 1
                      ? '1px solid #f1f5f9'
                      : 'none',
                  background: isHighlightedMatch ? MATCH_ROW_HIGHLIGHT : '#ffffff',
                  cursor: onLocationClick && locationId ? 'pointer' : 'default',
                  transition: 'background 0.2s',
                }}
                onClick={() => 
                  onLocationClick && locationId && onLocationClick(locationId)
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
                {shouldShowCourseTitle && (
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#334155',
                      marginBottom: '6px',
                    }}
                  >
                    {program.course_title}
                  </div>
                )}

                <div
                style={{
                  fontSize: '15px',
                  fontWeight: 600,
                  color: '#1e293b',
                  marginBottom: '4px',
                }}
              >
                 🕒 {formatTime(program.start_time)} - {formatTime(program.end_time)}
              </div>

              <div
                style={{
                  fontSize: '13px',
                  color: '#3b82f6',
                  marginBottom: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                📍{locationName}
                {onLocationClick && locationId && (
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    (click to view)
                  </span>
                )}
              </div>

              <div
                style={{
                  fontSize: '12px',
                  color: '#64748b',
                }}
              >
                👥 {formatAgeRange(program.age_min, program.age_max)}
              </div>
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
        No programs scheduled for this day
      </div>
    )}
  </div>
);

}
