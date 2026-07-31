import { useState, useEffect, useCallback, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async'; 
import { getWards } from '../features/centres/api/centres.api';
import { useCentres } from '../features/centres/hooks/useCentres';
import type { WardFeatureCollection, DropInAgeFilter, ProgramAgeFilter, ProgramType, RegisteredAgeFilter } from '../shared/types';
import FiltersPanel from '../features/filters/ui/FiltersPanel';
import MapView from '../features/map/ui/MapView';
import SchedulePanel from '../features/centres/ui/SchedulePanel';
import ResizablePanel from '../shared/ui/ResizablePanel';
import Navbar from '../shared/ui/Navbar';
import '../App.css';
import type { WeekdayName } from '../shared/lib/weekday';
import RegisteredProgramsPanel from '../features/centres/ui/RegisteredProgramsPanel';
import { trackEvent } from '../shared/lib/analytics';
import Spinner from '../shared/ui/Spinner';


  type Filters = {
    category: string;
    activity: string;
    activities?: string[];
    district: string;
    weekday: WeekdayName | null;
    startMonth?: string;
    age?: ProgramAgeFilter;
  };

function buildPanelTitle(programType: ProgramType, filters: Filters | null): string {
  const suffix = programType === 'dropin' ? 'Schedule' : 'Programs';
  if (filters?.activity) return `${filters.activity} ${suffix}`;
  if (filters?.category) return `${filters.category} ${suffix}`;
  return suffix;
}

function buildFilterPills(filters: Filters | null): string[] {
  if (!filters) return [];
  const pills: string[] = [];
  if (filters.category) pills.push(filters.category);
  if (filters.activities && filters.activities.length > 0) {
    pills.push(filters.activities.join(', '));
  } else if (filters.activity) {
    pills.push(filters.activity);
  }
  return pills;
}

function hasAnySelectedFilter(filters: Filters): boolean {
  return Boolean(
    filters.category ||
    filters.activity ||
    (filters.activities && filters.activities.length > 0) ||
    filters.district ||
    filters.weekday ||
    filters.startMonth ||
    filters.age
  );
}

function buildPageMetadata(programType: ProgramType, activeFilters: Filters | null) {
  const baseUrl = 'https://cityrecreationfinder.com/toronto';

  if (!activeFilters) {
    return {
      title: 'Toronto Recreation Finder - Find Drop-in & Registered Programs',
      description: 'Search drop-in and registered recreation programs across Toronto recreation centres. Filter by location, activity, age, and schedule.',
      canonicalUrl: baseUrl,
    }
  }

  const programTypeLabel = programType === 'dropin' ? 'Drop-in' : 'Registered';
  const activity = activeFilters.activity;
  const category = activeFilters.category;
  const district = activeFilters.district;
  let titleParts: string[] = [];
  if (activity) {
    titleParts.push(activity);
  } else if (category) {
    titleParts.push(category);
  }
  titleParts.push(programTypeLabel);

  if (district) {
    titleParts.push(`in ${district}`);
  }
  const title = `${titleParts.join(' ')} | Toronto Recreation Finder`;

  let description = `Find ${activity || category || programTypeLabel.toLowerCase()} programs`;
  if (district) {
    description += ` in ${district}`;
  }
  description += ' at Toronto recreation centres. Filter by location, activity, age, and schedule.';

  return {
    title,
    description,
    canonicalURL: baseUrl,
  }
}

export default function App() {
  const [searchParams, setSearchParams] = useSearchParams();
  const programTypeFromURL = (searchParams.get('programType') as ProgramType) || 'dropin';
  const activityParamsFromURL = searchParams.getAll('activity');
  const [programType, setProgramType] = useState<ProgramType>(programTypeFromURL);
  const [filters, setFilters] = useState<Filters>({
    category: searchParams.get('category') || '',
    activity: activityParamsFromURL.length === 1 ? activityParamsFromURL[0] : '',
    activities: activityParamsFromURL.length > 1 ? activityParamsFromURL : undefined,
    district: searchParams.get('district') || '',
    weekday: (searchParams.get('weekday') as WeekdayName) || null,
    startMonth: searchParams.get('startMonth') || undefined,
    age: (searchParams.get('age') as ProgramAgeFilter) || undefined,
  });

  const [wards, setWards] = useState<WardFeatureCollection | null>(null);
  const [searchNotice, setSearchNotice] = useState<string | null>(null);
  const [showSchedulePanel, setShowSchedulePanel] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string | number | null>(null);
  const [highlightedLocationId, setHighlightedLocationId] = useState<string | number | null>(null);
  const [scheduleFocusToken, setScheduleFocusToken] = useState(0);

  const [activeFilters, setActiveFilters] = useState<Filters | null>(null);
  const [isFiltersOpen, setIsFiltersOpen] = useState(true);
  const [isScheduleOpen, setIsScheduleOpen] = useState(true);
  const [mobilePanelHeightPx, setMobilePanelHeightPx] = useState<number | null>(null);
  const panelDragRef = useRef<{ pointerId: number; startY: number; startHeight: number } | null>(null);

  function handlePanelHandlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    e.preventDefault();
    const startHeight = mobilePanelHeightPx ?? window.innerHeight * 0.5;
    panelDragRef.current = { pointerId: e.pointerId, startY: e.clientY, startHeight };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePanelHandlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const drag = panelDragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const deltaY = e.clientY - drag.startY;
    const minHeight = window.innerHeight * 0.3;
    const maxHeight = window.innerHeight * 0.7;
    setMobilePanelHeightPx(Math.min(maxHeight, Math.max(minHeight, drag.startHeight + deltaY)));
  }

  function handlePanelHandlePointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    panelDragRef.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  }
  const hasScheduleFilters = Boolean(
    activeFilters?.category || activeFilters?.activity || activeFilters?.activities?.length || activeFilters?.district || activeFilters?.weekday || activeFilters?.startMonth || activeFilters?.age
  );
  const filterPills = buildFilterPills(activeFilters);
  const { data: centres, loading: centresLoading } = useCentres({
    programType,
    category: activeFilters?.category ?? '',
    activity: activeFilters?.activity ?? '',
    activities: activeFilters?.activities,
    district: activeFilters?.district ?? '',
    weekday: activeFilters?.weekday ?? null,
    startMonth: activeFilters?.startMonth,
    age: activeFilters?.age,
  },
  { enabled: !!activeFilters }
);

  const selectedCentreName = selectedLocationId != null
    ? centres?.features?.find((f) => String(f.properties.id) === String(selectedLocationId))?.properties.name ?? null
    : null;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const wardsData = await getWards();
        if (mounted) {
          setWards(wardsData);
        }
      } catch (error) {
        if (mounted) {
          console.error('Failed to load wards:', error);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!searchNotice) return;

    const timer = window.setTimeout(() => {
      setSearchNotice(null);
    }, 2400);

    return () => window.clearTimeout(timer);
  }, [searchNotice]);

  useEffect(() => {
    if (hasAnySelectedFilter(filters)) {
      setActiveFilters(filters);
      setShowSchedulePanel(true);
      setHasSearched(true);
      setIsScheduleOpen(true);
    }
  }, []);

  function handleSearch() {
    if (!hasAnySelectedFilter(filters)) {
      setSearchNotice('Select at least one filter to search.');
      return;
    }

    trackEvent('search_executed', {
      program_type: programType,
      category: filters.category || undefined,
      activity: filters.activity || undefined,
      district: filters.district || undefined,
      weekday: filters.weekday || undefined,
      start_month: filters.startMonth || undefined,
      age: filters.age || undefined,
    })

    const params = new URLSearchParams();
    params.set('programType', programType);
    if (filters.category) params.set('category', filters.category);
    if (filters.activity) {
      params.set('activity', filters.activity);
    } else if (filters.activities?.length) {
      filters.activities.forEach((item) => params.append('activity', item));
    }
    if (filters.district) params.set('district', filters.district);
    if (filters.weekday) params.set('weekday', filters.weekday);
    if (filters.startMonth) params.set('startMonth', filters.startMonth);
    if (filters.age) params.set('age', filters.age);
    setSearchParams(params);

    setHasSearched(true);
    setSelectedLocationId(null);
    setHighlightedLocationId(null);
    setActiveFilters(filters);
    setIsFiltersOpen(false);

    setShowSchedulePanel(true);
    setIsScheduleOpen(true);
    setMobilePanelHeightPx(null);
  }


  function handleReset() {
    setSearchParams({});

    setFilters({
      category: '',
      activity: '',
      district: '',
      weekday: null,
      startMonth: undefined,
      age: undefined,
    });
    setShowSchedulePanel(false);
    setSelectedLocationId(null);
    setHighlightedLocationId(null);
    setHasSearched(false);
    setActiveFilters(null);
    setIsScheduleOpen(false);
    setMobilePanelHeightPx(null);
  }

  function handleProgramTypeChange(nextType: ProgramType) {
    if (nextType === programType) return;
    trackEvent('program_type_toggle', {
      from_type: programType,
      to_type: nextType,
    });

    setProgramType(nextType);
    setFilters({
      category: '',
      activity: '',
      district: '',
      weekday: null,
      startMonth: undefined,
      age: undefined,
    });
    setShowSchedulePanel(false);
    setSelectedLocationId(null);
    setHasSearched(false);
    setActiveFilters(null);
    setIsScheduleOpen(false);
    setMobilePanelHeightPx(null);
  }

  function handleCentreMarkerClick(locationId: string | number) {
    const locationName = centres?.features?.find(
      f => f.properties.id === locationId
    )?.properties.name;
    
    trackEvent('map_pin_clicked', {
      location_name: locationName || `Location {locationId}`,
      program_type: programType,
    })
    setSelectedLocationId(locationId);
    setHighlightedLocationId(locationId);
    setScheduleFocusToken(prev => prev + 1);
    if (showSchedulePanel) {
      setIsScheduleOpen(true);
    }
  }

  const handleCentreClose = useCallback(() => {
    setSelectedLocationId(null);
    setHighlightedLocationId(null);
  }, []);

  function handleScheduleLocationClick(
    locationId: string | number,
    programDetails?: {
      activity?: string | null;
      day_of_week?: string | null;
      start_time?: string | null;
    }
  ) {
    const locationName = centres?.features?.find(
      f => f.properties.id === locationId
    )?.properties.name;

    trackEvent('session_clicked', {
      location_id: locationName || `Location {locationId}`,
      activity: programDetails?.activity || undefined,
      day_of_week: programDetails?.day_of_week || undefined,
      start_time: programDetails?.start_time || undefined,
      program_type: programType,
    })
    
    setHighlightedLocationId(null);
    setSelectedLocationId(locationId);
  }
 
  const pageMetadata = buildPageMetadata(programType, activeFilters);

  return (
    <>
      <Helmet>
        <title>{pageMetadata.title}</title>
        <meta name="description" content={pageMetadata.description} />
        <link rel="canonical" href={pageMetadata.canonicalUrl} />

        <meta property="og:title" content={pageMetadata.title} />
        <meta property="og:description" content={pageMetadata.description} />
        <meta property="og:url" content={pageMetadata.canonicalUrl} />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className={`app-shell${isFiltersOpen ? '' : ' navbar-collapsed'}`}>
      <Navbar variant="search" city="Toronto" />

      <div className = "app-layout">
        {!isFiltersOpen && (
          <button
            type="button"
            className="filters-fab"
            aria-label="Open filters"
            onClick={() => setIsFiltersOpen(true)}
          >
            <span className="filters-fab-icon">☰</span>
          </button>
        )}

        {isFiltersOpen && (
          <div
            className="filters-backdrop"
            onClick={() => setIsFiltersOpen(false)}
          />
        )}

        {searchNotice && (
          <div className="search-notice" role="status" aria-live="polite">
            {searchNotice}
          </div>
        )}

        <aside className={`filters-panel ${isFiltersOpen ? 'open' : 'closed'}`}>
          <FiltersPanel
            programType={programType}
            onProgramTypeChange={handleProgramTypeChange}
            value={filters}
            onChange={setFilters}
            onSearch={handleSearch}
            onReset={handleReset}
            isOpen={isFiltersOpen}
            onToggle={() => setIsFiltersOpen(prev => !prev)}
            isSearching={centresLoading}
          />
        </aside>

        {showSchedulePanel && (
          <>
            {isScheduleOpen && (
              <div className = "schedule-desktop">
                <ResizablePanel
                  title={buildPanelTitle(programType, activeFilters)}
                  pills={filterPills}
                  centrePill={selectedCentreName ? { label: selectedCentreName, onRemove: handleCentreClose } : undefined}
                  initialWidth={400}
                  minWidth={300}
                  maxWidth={640}
                  onClose={() => setIsScheduleOpen(false)}
                >
                  {programType === 'dropin' ? (
                    <SchedulePanel
                      category={activeFilters?.category ?? ''}
                      activity={activeFilters?.activity ?? ''}
                      activities={activeFilters?.activities}
                      age={activeFilters?.age as DropInAgeFilter | undefined}
                      weekday={activeFilters?.weekday}
                      district={activeFilters?.district ?? ''}
                      hasSearchCriteria={hasScheduleFilters}
                      isVisible={isScheduleOpen}
                      onLocationClick={handleScheduleLocationClick}
                      highlightedLocationId={highlightedLocationId}
                      focusToken={scheduleFocusToken}
                      selectedLocationId={selectedLocationId}
                      selectedCentreName={selectedCentreName}
                    />
                  ) : (
                    <RegisteredProgramsPanel
                      category={activeFilters?.category ?? ''}
                      activity={activeFilters?.activity ?? ''}
                      activities={activeFilters?.activities}
                      age={activeFilters?.age as RegisteredAgeFilter | undefined}
                      startMonth={activeFilters?.startMonth}
                      district={activeFilters?.district ?? ''}
                      hasSearchCriteria={hasScheduleFilters}
                      isVisible={isScheduleOpen}
                      onLocationClick={handleScheduleLocationClick}
                      highlightedLocationId={highlightedLocationId}
                      focusToken={scheduleFocusToken}
                      selectedLocationId={selectedLocationId}
                      selectedCentreName={selectedCentreName}
                    />
                    )
                  }
                </ResizablePanel>
              </div>
            )}

            <section
              className="schedule-mobile"
              style={mobilePanelHeightPx != null ? { height: mobilePanelHeightPx, maxHeight: mobilePanelHeightPx } : undefined}
            >
              {(filterPills.length > 0 || selectedCentreName) && (
                <div className="schedule-mobile-pills filter-pill-row">
                  {filterPills.map((pill) => (
                    <span key={pill} className="filter-pill">
                      {pill}
                    </span>
                  ))}
                  {selectedCentreName && (
                    <span className="filter-pill filter-pill--centre">
                      📍 {selectedCentreName}
                      <button
                        type="button"
                        className="filter-pill-remove"
                        aria-label={`Clear selected centre: ${selectedCentreName}`}
                        onClick={handleCentreClose}
                      >
                        ✕
                      </button>
                    </span>
                  )}
                </div>
              )}
              <div className="schedule-mobile-body">
                {programType === 'dropin' ? (
                  <SchedulePanel
                    category={activeFilters?.category ?? ''}
                    activity={activeFilters?.activity ?? ''}
                      activities={activeFilters?.activities}
                    age={activeFilters?.age as DropInAgeFilter}
                    weekday={activeFilters?.weekday}
                    district={activeFilters?.district ?? ''}
                    hasSearchCriteria={hasScheduleFilters}
                    isVisible={true}
                    onLocationClick={handleScheduleLocationClick}
                    highlightedLocationId={highlightedLocationId}
                    focusToken={scheduleFocusToken}
                    selectedLocationId={selectedLocationId}
                    selectedCentreName={selectedCentreName}
                  />
                ) : (
                  <RegisteredProgramsPanel
                    category={activeFilters?.category ?? ''}
                    activity={activeFilters?.activity ?? ''}
                      activities={activeFilters?.activities}
                    age={activeFilters?.age as RegisteredAgeFilter}
                    startMonth={activeFilters?.startMonth}
                    district={activeFilters?.district ?? ''}
                    hasSearchCriteria={hasScheduleFilters}
                    isVisible={true}
                    onLocationClick={handleScheduleLocationClick}
                    highlightedLocationId={highlightedLocationId}
                    focusToken={scheduleFocusToken}
                    selectedLocationId={selectedLocationId}
                    selectedCentreName={selectedCentreName}
                  />
                )}

              </div>
              <div
                className="schedule-mobile-handle"
                role="separator"
                aria-orientation="horizontal"
                aria-label="Resize schedule panel"
                onPointerDown={handlePanelHandlePointerDown}
                onPointerMove={handlePanelHandlePointerMove}
                onPointerUp={handlePanelHandlePointerUp}
                onPointerCancel={handlePanelHandlePointerUp}
              >
                <span className="schedule-mobile-handle-grip" aria-hidden="true" />
              </div>
            </section>

            {!isScheduleOpen && (
              <button
                type="button"
                className="schedule-toggle"
                aria-label={programType === 'dropin' ? 'Open schedule' : 'Open programs'}
                onClick={() => setIsScheduleOpen(true)}
              >
                <span className="schedule-toggle-icon">🗓️</span>
                <span className="schedule-toggle-text">
                  {programType === 'dropin' ? 'Schedule' : 'Programs'}
                </span>
              </button>
            )}
          </>
        )}

        <main className = "map-panel">
          <MapView
            centres = {centres}
            wards = {wards}
            onCentreClick = {handleCentreMarkerClick}
            onCentreClose = {handleCentreClose}
            selectedLocationId = {selectedLocationId}
          />
        </main>


        {hasSearched && centresLoading && (
          <div className="page-loading">
            <Spinner size={32} label="Loading centres" />
          </div>
        )}

      </div>
      </div>
    </>
  );
}
