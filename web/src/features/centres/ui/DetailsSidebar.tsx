import { useMemo, useState, useCallback } from "react";
import type { AgeFilter, DropInProgram } from '../../../shared/types';
import { useCentreDetails } from '../hooks/useCentreDetails';

import DropinControls from "./DropinControls";
import DropinList from "./DropinList";
import { filterBySportAndSchedule, type ScheduleKey } from "../../../shared/lib/dropin.derive";

import RegisteredControls from "./RegisteredControls";
import RegisteredList from "./RegisteredList";
import { filterPrograms, type CategoryTag } from "../../../shared/lib/registered.derive";
import type { RegisteredProgram } from "../../../shared/types";

type Props = { centreId: string | number | null; age: AgeFilter; onClose: () => void };

export default function DetailsSidebar({ centreId, age, onClose }: Props) {
  const { detail, programs, facilities, loading } = useCentreDetails(centreId, age);
  
  const [sidebarWidth, setSidebarWidth] = useState<number>(550);
  const [isDragging, setIsDragging] = useState(false);

  function startDrag(e: React.MouseEvent) {
    e.preventDefault();

    const prevUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
    setIsDragging(true);
  
    function onMove(ev: MouseEvent) {
      const viewportWidth = window.innerWidth;
      const mouseX = ev.clientX;
      const newWidth = viewportWidth - mouseX;

      const clamped = Math.min(
        Math.min(900, viewportWidth * 0.8),
        Math.max(280, newWidth)
      );
      setSidebarWidth(clamped);
    }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.userSelect = prevUserSelect;
      document.body.style.cursor = "";
      setIsDragging(false);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  const [selectedSport, setSelectedSport] = useState<string | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleKey | null>(null);
  const [regSelectedCategory, setRegSelectedCategory] = useState<CategoryTag | null>(null);
  const [regSelectedSection, setRegSelectedSection] = useState<string | null>(null);

  const dropin: DropInProgram[] = programs?.dropin ?? [];

  const dropinFiltered = useMemo(
    () => filterBySportAndSchedule(dropin, selectedSport, selectedSchedule),
    [dropin, selectedSport, selectedSchedule]
  );

  function handleSelectSport(s: string | null) {
    setSelectedSport(s);
    setSelectedSchedule(null); // clear schedule when sport changes
  }

  const registered: RegisteredProgram[] = programs?.registered ?? [];

  const registeredFiltered = useMemo(
    () => filterPrograms(registered, regSelectedCategory, regSelectedSection),
    [registered, regSelectedCategory, regSelectedSection]
  );

  function handleSelectRegCategory(c: CategoryTag) {
    setRegSelectedCategory(c);
    setRegSelectedSection(null); // clear section when category changes
  }



  return (
    <div 
      className={`details-sidebar ${centreId ? "open" : ""} ${isDragging ? "dragging" : ""}`}
      id="detailsSidebar"
      style={{width: sidebarWidth}}
    >
      <div 
        className="sidebar-resizer"
        onMouseDown={startDrag}
        title="Drag to resize"
        style={{ right: sidebarWidth - 10 }}
      />
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
            {registered.length > 0 && (
              <>
                <RegisteredControls
                  programs={registered}
                  selectedCategory={regSelectedCategory}
                  onSelectCategory={handleSelectRegCategory}
                  selectedSection={regSelectedSection}
                  onSelectSection={setRegSelectedSection}
                />
                <RegisteredList programs={registeredFiltered} />
              </>
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
