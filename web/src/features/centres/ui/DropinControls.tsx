import { useMemo } from "react";
import type { DropInProgram } from "../../../shared/types";
import { getSports, getSchedulesForSport, type ScheduleKey } from "../../../shared/lib/dropin.derive.ts";

type Props = {
  programs: DropInProgram[];
  selectedSport: string | null;
  onSelectSport: (sport: string | null) => void;
  selectedSchedule: ScheduleKey | null;
  onSelectSchedule: (sk: ScheduleKey | null) => void;
};

function labelForSchedule(sk: ScheduleKey) {
    switch (sk) {
      case "morning": return "Morning (6–12)";
      case "afternoon": return "Afternoon (12–17)";
      case "evening": return "Evening (17–22)";
      case "weekend": return "Weekend";
      default: return sk;
    }
  }

export default function DropinControls({
  programs, selectedSport, onSelectSport, selectedSchedule, onSelectSchedule
}: Props) {
  const sports = useMemo(() => getSports(programs), [programs]);
  const schedules = useMemo(
    () => (selectedSport ? getSchedulesForSport(programs, selectedSport) : []),
    [programs, selectedSport]
  );

  return (
    <div className="info-section">
      <h3>Drop-in Programs</h3>

      {/* sport tags */}
      <div className="program-types-container open" style={{ marginBottom: 12 }}>
        <button
          className={`badge program-type-badge ${!selectedSport ? "active" : ""}`}
          onClick={() => onSelectSport(null)}
        >
          All
        </button>
        {sports.map((sport) => (
          <button
            key={`sport-${sport}`}
            className={`badge program-type-badge ${selectedSport === sport ? "active" : ""}`}
            onClick={() => onSelectSport(sport)}
            title={`Show ${sport} schedules`}
            aria-pressed={selectedSport === sport}
          >
            {sport}
          </button>
        ))}
      </div>

      {/* Schedule dropdown (enabled after a sport is selected) */}
      <div className="filter-group">
        <label>Schedule</label>
        <select
          value={selectedSchedule ?? ""}
          onChange={(e) => onSelectSchedule(e.target.value ? (e.target.value as ScheduleKey) : null)}
          disabled={!selectedSport}
        >
          <option value="">All times</option>
          {schedules.map((sk) => (
            <option
              key={`sched-${sk}`} value={sk}>
                {labelForSchedule(sk)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
