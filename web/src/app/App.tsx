import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async'; 
import { getWards } from '../features/centres/api/centres.api';
import { useCentres } from '../features/centres/hooks/useCentres';
import type { WardFeatureCollection, DropInAgeFilter, ProgramAgeFilter, ProgramType, RegisteredAgeFilter } from '../shared/types';
import FiltersPanel from '../features/filters/ui/FiltersPanel';
import MapView from '../features/map/ui/MapView';
import SchedulePanel from '../features/centres/ui/SchedulePanel';
import ResizablePanel from '../shared/ui/ResizablePanel';
import '../App.css';
import type { WeekdayName } from '../shared/lib/weekday';
import RegisteredProgramsPanel from '../features/centres/ui/RegisteredProgramsPanel';


  type Filters = {
    category: string;
    activity: string;
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

function hasAnySelectedFilter(filters: Filters): boolean {
  return Boolean(
    filters.category ||
    filters.activity ||
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
  const [programType, setProgramType] = useState<ProgramType>(programTypeFromURL);
  const [filters, setFilters] = useState<Filters>({
    category: searchParams.get('category') || '',
    activity: searchParams.get('activity') || '',
    district: searchParams.get('district') || '',
    weekday: (searchParams.get('weekday') as WeekdayName) || null,
    startMonth: searchParams.get('startMonth') || undefined,
    age: (searchParams.get('age') as ProgramAgeFilter) || undefined,
  });

  const [wards, setWards] = useState<WardFeatureCollection | null>(null);
  const [status, setStatus] = useState<string>('Pick a filter above and hit Search');
  const [searchNotice, setSearchNotice] = useState<string | null>(null);
  const [showSchedulePanel, setShowSchedulePanel] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string | number | null>(null);
  const [highlightedLocationId, setHighlightedLocationId] = useState<string | number | null>(null);
  const [scheduleFocusToken, setScheduleFocusToken] = useState(0);

  const [activeFilters, setActiveFilters] = useState<Filters | null>(null);
  const [isFiltersOpen, setIsFiltersOpen] = useState(true);
  const [isScheduleOpen, setIsScheduleOpen] = useState(true);
  const hasScheduleFilters = Boolean(
    activeFilters?.category || activeFilters?.activity || activeFilters?.district || activeFilters?.weekday || activeFilters?.startMonth || activeFilters?.age
  );
  const { data: centres, loading: centresLoading } = useCentres({
    programType,
    category: activeFilters?.category ?? '',
    activity: activeFilters?.activity ?? '',
    district: activeFilters?.district ?? '',
    weekday: activeFilters?.weekday ?? null,
    startMonth: activeFilters?.startMonth,
    age: activeFilters?.age,
  },
  { enabled: !!activeFilters }
);
  

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
      setStatus('Select at least one filter to search.');
      return;
    }

    const params = new URLSearchParams();
    params.set('programType', programType);
    if (filters.category) params.set('category', filters.category);
    if (filters.activity) params.set('activity', filters.activity);
    if (filters.district) params.set('district', filters.district);
    if (filters.weekday) params.set('weekday', filters.weekday);
    if (filters.startMonth) params.set('startMonth', filters.startMonth);
    if (filters.age) params.set('age', filters.age);
    setSearchParams(params);

    setStatus('Searching...');
    setHasSearched(true);
    setSelectedLocationId(null);
    setHighlightedLocationId(null);
    setActiveFilters(filters);
    setIsFiltersOpen(false);

    setShowSchedulePanel(true);
    setStatus(
      filters.activity
        ? `Showing ${filters.activity} ${programType === 'dropin' ? 'programs' : 'registered programs'}`
        : filters.category
          ? `Showing ${filters.category} ${programType === 'dropin' ? 'programs' : 'registered programs'}`
          : `Showing matching ${programType === 'dropin' ? 'programs' : 'registered programs'}`
    );
    setIsScheduleOpen(true);
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
    setStatus('Filters reset');
    setActiveFilters(null);
    setIsScheduleOpen(false);
  }

  function handleProgramTypeChange(nextType: ProgramType) {
    if (nextType === programType) return;
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
    setStatus(nextType === 'dropin' ? 'Ready to search drop-in' : 'Ready to search registered programs')
  }

  function handleCentreMarkerClick(locationId: string | number) {
    setSelectedLocationId(locationId);
    setHighlightedLocationId(locationId);
    setScheduleFocusToken(prev => prev + 1);
    if (showSchedulePanel) {
      setIsScheduleOpen(true);
    }
    setStatus('Viewing centre details');
  }

  function handleScheduleLocationClick(locationId: string | number) {
    setHighlightedLocationId(null);
    setSelectedLocationId(locationId);
    setStatus('Viewing centre details');
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
            status={status}
            isOpen={isFiltersOpen}
            onToggle={() => setIsFiltersOpen(prev => !prev)}
          />
        </aside>

        {showSchedulePanel && (
          <>
            {isScheduleOpen && (
              <div className = "schedule-desktop">
                <ResizablePanel
                  title={buildPanelTitle(programType, activeFilters)}
                  initialWidth={400}
                  minWidth={300}
                  maxWidth={640}
                  onClose={() => setIsScheduleOpen(false)}
                >
                  {programType === 'dropin' ? (
                    <SchedulePanel
                      category={activeFilters?.category ?? ''}
                      activity={activeFilters?.activity ?? ''}
                      age={activeFilters?.age as DropInAgeFilter | undefined}
                      weekday={activeFilters?.weekday}
                      district={activeFilters?.district ?? ''}
                      hasSearchCriteria={hasScheduleFilters}
                      isVisible={isScheduleOpen}
                      onLocationClick={handleScheduleLocationClick}
                      highlightedLocationId={highlightedLocationId}
                      focusToken={scheduleFocusToken}
                    />
                  ) : (
                    <RegisteredProgramsPanel
                      category={activeFilters?.category ?? ''}
                      activity={activeFilters?.activity ?? ''}
                      age={activeFilters?.age as RegisteredAgeFilter | undefined}
                      startMonth={activeFilters?.startMonth}
                      district={activeFilters?.district ?? ''}
                      hasSearchCriteria={hasScheduleFilters}
                      isVisible={isScheduleOpen}
                      onLocationClick={handleScheduleLocationClick}
                      highlightedLocationId={highlightedLocationId}
                      focusToken={scheduleFocusToken}
                    />
                    )
                  }
                </ResizablePanel>
              </div>
            )}

            <section 
              className={`schedule-mobile ${isScheduleOpen ? 'open' : 'closed'}`}
              aria-hidden={!isScheduleOpen}
            >
              <div className="schedule-mobile-header">
                <div className="schedule-mobile-title">
                  {buildPanelTitle(programType, activeFilters)}
                </div>
                <button
                  type="button"
                  className="schedule-mobile-close"
                  onClick={() => setIsScheduleOpen(false)}
                  aria-label="Close schedule"
                >
                  x
                </button>
              </div>
              <div className="schedule-mobile-body">
                {programType === 'dropin' ? (
                  <SchedulePanel
                    category={activeFilters?.category ?? ''}
                    activity={activeFilters?.activity ?? ''}
                    age={activeFilters?.age as DropInAgeFilter}
                    weekday={activeFilters?.weekday}
                    district={activeFilters?.district ?? ''}
                    hasSearchCriteria={hasScheduleFilters}
                    isVisible={isScheduleOpen}
                    onLocationClick={handleScheduleLocationClick}
                    highlightedLocationId={highlightedLocationId}
                    focusToken={scheduleFocusToken}
                  />
                ) : (
                  <RegisteredProgramsPanel
                    category={activeFilters?.category ?? ''}
                    activity={activeFilters?.activity ?? ''}
                    age={activeFilters?.age as RegisteredAgeFilter}
                    startMonth={activeFilters?.startMonth}
                    district={activeFilters?.district ?? ''}
                    hasSearchCriteria={hasScheduleFilters}
                    isVisible={isScheduleOpen}
                    onLocationClick={handleScheduleLocationClick}
                    highlightedLocationId={highlightedLocationId}
                    focusToken={scheduleFocusToken}
                  />
                )}

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
            selectedLocationId = {selectedLocationId}
          />
        </main>


        {hasSearched && centresLoading && (
          <div className = "page-loading">
            Loading centres...
          </div>
        )}    

      </div>
    </>
  );
}
