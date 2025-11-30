import { useMemo } from "react";
import type { DropInProgram } from "../../../shared/types";
import { getSports, type ScheduleKey } from "../../../shared/lib/dropin.derive.ts";

type Props = {
  programs: DropInProgram[];
  selectedSport: string | null;
  onSelectSport: (sport: string | null) => void;
  selectedSchedule: ScheduleKey | null;
  onSelectSchedule: (sk: ScheduleKey | null) => void;
};


export default function DropinControls({
  programs, selectedSport, onSelectSport
}: Props) {
  const sports = useMemo(() => getSports(programs), [programs]);
  return (
    <div className="info-section">
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
    </div>
  );
}
