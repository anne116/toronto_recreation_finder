import { useMemo, useState, useEffect } from "react";
import type { AgeFilter, DropInProgram } from '../../../shared/types';
import { useCentreDetails } from '../hooks/useCentreDetails';
import { searchProgramsAggregated } from '../api/centres.api';

import CompactHeader from "./CompactHeader.tsx";
import HeroSection from "./HeroSection.tsx";
import WeeklyScheduleGrid from "./WeeklyScheduleGrid.tsx";
import CollapsibleSection from "./CollapsibleSection.tsx";

import DropinControls from "./DropinControls";
import DropinList from "./DropinList";
import { filterBySportAndSchedule, type ScheduleKey } from "../../../shared/lib/dropin.derive";
import RegisteredControls from "./RegisteredControls";
import RegisteredList from "./RegisteredList";
import { filterPrograms, type CategoryTag } from "../../../shared/lib/registered.derive";
import type { RegisteredProgram } from "../../../shared/types";

type ActiveFilters = {
  activity: string;
  age?: AgeFilter;
  weekday: string;
  district: string;
  facility_type: string;
};

type Props = { 
  centreId: string | number | null; 
  age?: AgeFilter;
  onClose: () => void;
  activeFilters?: ActiveFilters;
  onLocationClick?: (locationId: string | number) => void;
};

const DAY_INDEX: Record<string, number> = {
  Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6,
};
const DAY_NAME = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

function toWeekdayNumber(w?: string | number) {
  if (w === undefined || w === null || w === "") return undefined;
  if (typeof w === "number") return w;
  if (/^[0-6]$/.test(w)) return Number(w);
  return DAY_INDEX[w];
}

function toApiAge(a?: string): "young" | "teen" | "adult" | "senior" | undefined {
  if (!a) return undefined;
  const v = a.toLowerCase();
  return v === "young" || v === "teen" || v === "adult" || v === "senior" ? (v as any) : undefined;
}

function normalizeProgram(p: any): DropInProgram {
  return {
    ...p,
    course_title: p.course_title ?? "",
    day_of_week: p.day_of_week ?? (typeof p.weekday === "number" ? DAY_NAME[p.weekday] : ""),
  } as DropInProgram;
}

export default function DetailsSidebar({ 
  centreId, 
  age, 
  onClose, 
  activeFilters,
  onLocationClick 
}: Props) {
  const { detail, programs, facilities, loading } = useCentreDetails(centreId, age);

  const [sidebarWidth, setSidebarWidth] = useState<number>(550);
  const [isDragging, setIsDragging] = useState(false);

  const [aggregatedPrograms, setAggregatedPrograms] = useState<DropInProgram[]>([]);
  const [loadingAggregated, setLoadingAggregated] = useState(false);

  useEffect(() => {
    if (!activeFilters?.activity) {
      setAggregatedPrograms([]);
      return;
    }
    const abortController = new AbortController();

    (async () => {
      setLoadingAggregated(true);
      try {
        const response = await searchProgramsAggregated({
          activity: activeFilters.activity,
          age: toApiAge(activeFilters.age as any),
          weekday: toWeekdayNumber(activeFilters.weekday),
          district: activeFilters.district,
          signal: abortController.signal,
          limit: 2000,
        });

        if (!abortController.signal.aborted) {
          const raw = response?.programs ?? [];
          const cleaned = (raw as any[])
            .filter(Boolean)
            .map(normalizeProgram);
          setAggregatedPrograms(cleaned);
        }
      } catch (error) {
        if (!abortController.signal.aborted) {
          console.error("Failed to fetch aggregated programs:", error);
          setAggregatedPrograms([]);
        }
      } finally {
        if (!abortController.signal.aborted) setLoadingAggregated(false);
      }
    })();

    return () => abortController.abort();
  }, [
    activeFilters?.activity,
    activeFilters?.age,
    activeFilters?.weekday,
    activeFilters?.district
  ]);

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
    setSelectedSchedule(null);
  }

  const registered: RegisteredProgram[] = programs?.registered ?? [];
  const registeredFiltered = useMemo(
    () => filterPrograms(registered, regSelectedCategory, regSelectedSection),
    [registered, regSelectedCategory, regSelectedSection]
  );

  function handleSelectRegCategory(c: CategoryTag) {
    setRegSelectedCategory(c);
    setRegSelectedSection(null);
  }

  const showHeroSection = !!(activeFilters?.activity && aggregatedPrograms.length > 0);

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
        <h2 id="sidebarTitle">
          {detail && (
            <CompactHeader 
              name={detail.name}
              address={detail.address}
              phone={detail.phone}
              district={detail.district}
            />
          )}
        </h2>
      </div>

      <div className="sidebar-content" id="sidebarContent">
        {!centreId && (
          <div className="empty-state">
            Select a centre on the map to view details
          </div>
        )}
        {loading && <div className="empty-state">Loading…</div>}

        {detail && programs && (
          <>
            {showHeroSection && (
              <div style={{ margin: '16px 0' }}>
                <HeroSection
                  title={`${activeFilters!.activity} Schedule`}
                  subtitle={`${aggregatedPrograms.length} sessions across Toronto`}
                >
                  {loadingAggregated ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                      Loading schedule...
                    </div>
                  ) : (
                    <WeeklyScheduleGrid 
                      programs={aggregatedPrograms}
                      sport={activeFilters!.activity}
                      onLocationClick={onLocationClick}
                    />
                  )}
                </HeroSection>
              </div>
            )}

            {dropin.length > 0 && (
              <CollapsibleSection 
                title="Other Drop-in Programs" 
                count={dropin.length}
                defaultOpen={!showHeroSection} 
              >
                <DropinControls
                  programs={dropin}
                  selectedSport={selectedSport}
                  onSelectSport={handleSelectSport}
                  selectedSchedule={selectedSchedule}
                  onSelectSchedule={setSelectedSchedule}
                />
                <DropinList programs={dropinFiltered} />
              </CollapsibleSection>
            )}

            {registered.length > 0 && (
              <CollapsibleSection 
                title="Registered Programs" 
                count={registered.length}
                defaultOpen={false}
              >
                <RegisteredControls
                  programs={registered}
                  selectedCategory={regSelectedCategory}
                  onSelectCategory={handleSelectRegCategory}
                  selectedSection={regSelectedSection}
                  onSelectSection={setRegSelectedSection}
                />
                <RegisteredList programs={registeredFiltered} />
              </CollapsibleSection>
            )}

            {facilities.length > 0 && (
              <CollapsibleSection 
                title="Facilities" 
                count={facilities.length}
                defaultOpen={false}
              >
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
              </CollapsibleSection>
            )}

            <CollapsibleSection title="Accessibility" defaultOpen={false}>
              <div className="info-value">
                {detail.accessibility || "Information not available"}
              </div>
            </CollapsibleSection>

            {detail.amenities && detail.amenities !== "None" && (
              <CollapsibleSection title="Amenities" defaultOpen={false}>
                {detail.amenities
                  .split(",")
                  .map((a) => a.trim())
                  .map((a) => (
                    <span key={a} className="badge badge-blue">
                      {a}
                    </span>
                  ))}
              </CollapsibleSection>
            )}

            {programs.dropin.length === 0 && programs.registered.length === 0 && (
              <div className="info-section">
                <div className="info-value">No programs match your age filter</div>
              </div>
            )}

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
