import { useMemo, useState } from "react";
import type { AgeFilter, CentrePrograms, DropInProgram } from '../../../shared/types';
import { useCentreDetails } from '../hooks/useCentreDetails';

import DropinControls from "./DropinControls";
import DropinList from "./DropinList";
import { filterBySportAndSchedule, type ScheduleKey } from "../../../shared/lib/dropin.derive";
type Props = { centreId: string | number | null; age: AgeFilter; onClose: () => void };

export default function DetailsSidebar({ centreId, age, onClose }: Props) {
  const { detail, programs, facilities, loading } = useCentreDetails(centreId, age);

  // NEW: local UI state for this mini-SPA
  const [selectedSport, setSelectedSport] = useState<string | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleKey | null>(null);

  const dropin: DropInProgram[] = programs?.dropin ?? [];

  // Apply sport + schedule
  const dropinFiltered = useMemo(
    () => filterBySportAndSchedule(dropin, selectedSport, selectedSchedule),
    [dropin, selectedSport, selectedSchedule]
  );

  function handleSelectSport(s: string | null) {
    setSelectedSport(s);
    setSelectedSchedule(null); // clear schedule when sport changes
  }



  return (
    <div className={`details-sidebar ${centreId ? "open" : ""}`} id="detailsSidebar">
      <div className="sidebar-resizer" />
      <div className="sidebar-header">
        <button className="close-btn" onClick={onClose}>×</button>
        <h2 id="sidebarTitle">{detail?.name ?? "Centre Details"}</h2>
        <p id="sidebarSubtitle" style={{ opacity: 0.9, fontSize: 14 }}>
          {detail?.facility_type || (centreId ? "Recreation Centre" : "")}
        </p>
      </div>

      <div className="sidebar-content" id="sidebarContent">
        {!centreId && <div className="empty-state">Select a centre on the map to view details</div>}
        {loading && <div className="empty-state">Loading…</div>}

        {detail && programs && (
          <>
            {/* Location info */}
            <div className="info-section">
              <h3>Location Information</h3>
              {detail.address && (
                <div className="info-row">
                  <span className="info-label">Address:</span>
                  <span className="info-value">{detail.address}</span>
                </div>
              )}
              {detail.district && (
                <div className="info-row">
                  <span className="info-label">District:</span>
                  <span className="info-value">{detail.district}</span>
                </div>
              )}
              {detail.intersection && (
                <div className="info-row">
                  <span className="info-label">Intersection:</span>
                  <span className="info-value">{detail.intersection}</span>
                </div>
              )}
              {detail.ttc_information && (
                <div className="info-row">
                  <span className="info-label">TTC:</span>
                  <span className="info-value">{detail.ttc_information}</span>
                </div>
              )}
              {detail.phone && detail.phone !== "None" && (
                <div className="info-row">
                  <span className="info-label">Phone:</span>
                  <span className="info-value">{detail.phone}</span>
                </div>
              )}
            </div>

            {/* Accessibility */}
            <div className="info-section">
              <h3>Accessibility</h3>
              <div className="info-value">{detail.accessibility || "Information not available"}</div>
            </div>

            {/* Amenities */}
            {detail.amenities && detail.amenities !== "None" && (
              <div className="info-section">
                <h3>Amenities</h3>
                {detail.amenities
                  .split(",")
                  .map((a) => a.trim())
                  .map((a) => (
                    <span key={a} className="badge badge-blue">
                      {a}
                    </span>
                  ))}
              </div>
            )}

            {/* Drop-in: controls + filtered list */}
            {dropin.length > 0 && (
              <>
                <DropinControls
                  programs={dropin}
                  selectedSport={selectedSport}
                  onSelectSport={handleSelectSport}
                  selectedSchedule={selectedSchedule}
                  onSelectSchedule={setSelectedSchedule}
                />
                <DropinList programs={dropinFiltered} />
              </>
            )}

            {/* Registered programs (unchanged) */}
            {programs.registered.length > 0 && (
              <div className="info-section">
                <h3>Registered Programs</h3>
                <div className="program-list" id="registered-list">
                  {programs.registered.map((p, i) => (
                    <div className="program-item" key={i}>
                      <div className="program-title">{p.course_title}</div>
                      <div className="program-details">
                        {p.days_of_week || ""}
                        {p.program_category ? ` | ${p.program_category}` : ""}
                        {(p.min_age || p.max_age) && (
                          <>
                            {" | Ages: "}
                            {p.min_age && p.max_age
                              ? `${p.min_age}-${p.max_age}`
                              : p.min_age
                              ? `${p.min_age}+`
                              : `Under ${p.max_age}`}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty-state if nothing to show */}
            {programs.dropin.length === 0 && programs.registered.length === 0 && (
              <div className="info-section">
                <div className="info-value">No programs match your age filter</div>
              </div>
            )}

            {/* Facilities */}
            {facilities.length > 0 && (
              <div className="info-section">
                <h3>Facilities</h3>
                {Object.entries(
                  facilities.reduce<Record<string, number>>((acc, f) => {
                    acc[f.facility_type] = (acc[f.facility_type] || 0) + 1;
                    return acc;
                  }, {})
                ).map(([type, count]) => (
                  <span key={type} className="badge badge-blue">
                    {type} ({count})
                  </span>
                ))}
              </div>
            )}

            {/* Link to Toronto.ca */}
            {detail.url && detail.url !== "None" && (
              <a href={detail.url} target="_blank" className="external-link">
                View on Toronto.ca
              </a>
            )}
          </>
        )}
      </div>
    </div>
  );
}
