import type { DropInProgram } from '../../../shared/types';

type Props = {
  programs: DropInProgram[];
  sport?: string;  // Optional: highlight specific sport
  onLocationClick?: (locationId: string | number) => void;
};

// Helper to format time
function formatTime(time?: string | null): string {
  if (!time) return '';
  return time.slice(0, 5); // "18:00:00" → "18:00"
}

// Helper to format age range
function formatAgeRange(min?: number | null, max?: number | null): string {
  if (!min && !max) return 'All Ages';
  if (min && max) return `${min}-${max}`;
  if (min) return `${min}+`;
  if (max) return `Under ${max}`;
  return 'All Ages';
}

// Group programs by day of week
function groupByDay(programs: DropInProgram[]) {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const grouped = new Map<string, DropInProgram[]>();
  
  // Initialize all days
  days.forEach(day => grouped.set(day, []));
  
  // Group programs
  programs.forEach(p => {
    const day = p.day_of_week || 'Unknown';
    if (grouped.has(day)) {
      grouped.get(day)!.push(p);
    } else {
      grouped.set(day, [p]);
    }
  });
  
  return grouped;
}

export default function WeeklyScheduleGrid({ programs, sport, onLocationClick }: Props) {
  const grouped = groupByDay(programs);
  
  if (programs.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
        No programs found matching your criteria
      </div>
    );
  }
  
  return (
    <div style={{ padding: '0' }}>
      {Array.from(grouped.entries()).map(([day, dayPrograms]) => {
        if (dayPrograms.length === 0) return null;
        
        return (
          <div key={day} style={{ marginBottom: '16px' }}>
            {/* Day Header */}
            <div style={{
              padding: '8px 12px',
              background: '#dbeafe',
              color: '#1e40af',
              fontWeight: 600,
              fontSize: '13px',
              borderRadius: '6px 6px 0 0',
              borderBottom: '2px solid #3b82f6'
            }}>
              {day}
            </div>
            
            {/* Programs for this day */}
            <div style={{ 
              border: '1px solid #e2e8f0',
              borderTop: 'none',
              borderRadius: '0 0 6px 6px',
              overflow: 'hidden'
            }}>
              {dayPrograms.map((program, idx) => {
                const locationName = (program as any).location_name || (program as any).asset_name || 'Unknown Location';
                const locationId = (program as any).location_id;
                
                return (
                  <div
                    key={`${day}-${idx}`}
                    style={{
                      padding: '12px',
                      borderBottom: idx < dayPrograms.length - 1 ? '1px solid #f1f5f9' : 'none',
                      background: '#ffffff',
                      cursor: onLocationClick && locationId ? 'pointer' : 'default',
                      transition: 'background 0.2s'
                    }}
                    onClick={() => onLocationClick && locationId && onLocationClick(locationId)}
                    onMouseEnter={(e) => {
                      if (onLocationClick && locationId) {
                        e.currentTarget.style.background = '#f8fafc';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#ffffff';
                    }}
                  >
                    {/* Time */}
                    <div style={{
                      fontSize: '15px',
                      fontWeight: 600,
                      color: '#1e293b',
                      marginBottom: '4px'
                    }}>
                      🕒 {formatTime(program.start_time)} - {formatTime(program.end_time)}
                    </div>
                    
                    {/* Location */}
                    <div style={{
                      fontSize: '13px',
                      color: '#3b82f6',
                      marginBottom: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      📍 {locationName}
                      {onLocationClick && locationId && (
                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                          (click to view)
                        </span>
                      )}
                    </div>
                    
                    {/* Age Range */}
                    <div style={{
                      fontSize: '12px',
                      color: '#64748b'
                    }}>
                      👥 {formatAgeRange(program.age_min, program.age_max)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}