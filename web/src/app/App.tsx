import { useState, useEffect } from 'react';
import { getWards } from '../features/centres/api/centres.api';
import { useCentres } from '../features/centres/hooks/useCentres';
import type { WardFeatureCollection, AgeFilter } from '../shared/types';
import FiltersPanel from '../features/filters/ui/FiltersPanel';
import MapView from '../features/map/ui/MapView';
import SchedulePanel from '../features/centres/ui/SchedulePanel';
import ResizablePanel from '../shared/ui/ResizablePanel';
import '../App.css';

export default function App() {
  
  type Filters = {
    category: string;
    activity: string;
    district: string;
    weekday: string;
    age?: AgeFilter;
    
  };
  
  const [filters, setFilters] = useState<Filters>({
    category: '',
    activity: '',
    district: '',
    weekday: '',
    age: undefined,
  });
  const [wards, setWards] = useState<WardFeatureCollection | null>(null);
  const [status, setStatus] = useState<string>('Pick a filter above and hit Search');
  const [showSchedulePanel, setShowSchedulePanel] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string | number | null>(null);
  const [highlightedLocationId, setHighlightedLocationId] = useState<string | number | null>(null);
  const [scheduleFocusToken, setScheduleFocusToken] = useState(0);

  const [activeFilters, setActiveFilters] = useState<Filters | null>(null);
  const [isFiltersOpen, setIsFiltersOpen] = useState(true);
  const [isScheduleOpen, setIsScheduleOpen] = useState(true);
  const hasScheduleFilters = Boolean(
    activeFilters?.category || activeFilters?.activity || activeFilters?.district || activeFilters?.weekday || activeFilters?.age
  );
  const { data: centres, loading: centresLoading } = useCentres({
    category: activeFilters?.category ?? '',
    activity: activeFilters?.activity ?? '',
    district: activeFilters?.district ?? '',
    weekday: activeFilters?.weekday ?? '',
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

  function handleSearch() {
    setStatus('Searching...');
    setHasSearched(true);
    setSelectedLocationId(null);
    setHighlightedLocationId(null);
    setActiveFilters(filters);
    setIsFiltersOpen(false);
    
    if (filters.category || filters.activity || filters.district || filters.weekday || filters.age) {
      setShowSchedulePanel(true);
      setStatus(
        filters.activity
          ? `Showing ${filters.activity} programs`
          : filters.category
            ? `Showing ${filters.category} programs`
            : 'Showing matching programs'
      );
      setIsScheduleOpen(true);
    } else {
      setShowSchedulePanel(false);
      setStatus('Showing all centres');
      setIsScheduleOpen(false);
    }
  }
  

  function handleReset() {
    setFilters({
      category: '',
      activity: '',
      district: '',
      weekday: '',
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
 
  

  return (
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

      <aside className={`filters-panel ${isFiltersOpen ? 'open' : 'closed'}`}>
        <FiltersPanel
          value = {filters}
          onChange = {setFilters}
          onSearch = {handleSearch}
          onReset = {handleReset}
          status = {status}
          isOpen={isFiltersOpen}
          onToggle={() => setIsFiltersOpen(prev => !prev)}
        />
      </aside>

      {showSchedulePanel && (
        <>
          {isScheduleOpen && (
            <div className = "schedule-desktop">
              <ResizablePanel
                title={
                  activeFilters?.activity
                    ? `${activeFilters.activity} Schedule`
                    : activeFilters?.category
                      ? `${activeFilters.category} Schedule`
                      : "Schedule"
                }
                initialWidth={400}
                minWidth={300}
                maxWidth={640}
                onClose={() => setIsScheduleOpen(false)}
              >
                <SchedulePanel
                  category={activeFilters?.category ?? ''}
                  activity={activeFilters?.activity ?? ''}
                  age={activeFilters?.age}
                  weekday={activeFilters?.weekday}
                  district={activeFilters?.district ?? ''}
                  hasSearchCriteria={hasScheduleFilters}
                  isVisible={isScheduleOpen}
                  onLocationClick={handleScheduleLocationClick}
                  highlightedLocationId={highlightedLocationId}
                  focusToken={scheduleFocusToken}
                />
              </ResizablePanel>
            </div>
          )}

          <section 
            className={`schedule-mobile ${isScheduleOpen ? 'open' : 'closed'}`}
            aria-hidden={!isScheduleOpen}
          >
            <div className="schedule-mobile-header">
              <div className="schedule-mobile-title">
                {activeFilters?.activity
                  ? `${activeFilters.activity} Schedule`
                  : activeFilters?.category
                    ? `${activeFilters.category} Schedule`
                    : 'Schedule'}
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
              <SchedulePanel
                category={activeFilters?.category ?? ''}
                activity={activeFilters?.activity ?? ''}
                age={activeFilters?.age}
                weekday={activeFilters?.weekday}
                district={activeFilters?.district ?? ''}
                hasSearchCriteria={hasScheduleFilters}
                isVisible={isScheduleOpen}
                onLocationClick={handleScheduleLocationClick}
                highlightedLocationId={highlightedLocationId}
                focusToken={scheduleFocusToken}
              />
            </div>
          </section>

          {!isScheduleOpen && (
            <button
              type="button"
              className="schedule-toggle"
              aria-label="Open schedule"
              onClick={() => setIsScheduleOpen(true)}
            >
              <span className="schedule-toggle-icon">🗓️</span>
              <span className="schedule-toggle-text">Schedule</span>
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
  );
}
