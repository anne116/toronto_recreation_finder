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
    weekday: WeekdayName | null;
    startMonth?: string;
    age?: ProgramAgeFilter;
    locationId?: string | number;
    locationName?: string;
    maxDistanceKm?: number;
  };

function buildFilterPills(filters: Filters | null): string[] {
  if (!filters) return [];
  const pills: string[] = [];
  if (filters.category) pills.push(filters.category);
  if (filters.activities && filters.activities.length > 0) {
    pills.push(filters.activities.join(', '));
  } else if (filters.activity) {
    pills.push(filters.activity);
  }
  if (filters.locationName) pills.push(filters.locationName);
  return pills;
}

function hasAnySelectedFilter(filters: Filters, hasLocation: boolean = false): boolean {
  return Boolean(
    filters.category ||
    filters.activity ||
    (filters.activities && filters.activities.length > 0) ||
    filters.weekday ||
    filters.startMonth ||
    hasLocation ||
    filters.age ||
    filters.locationId
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
  let titleParts: string[] = [];
  if (activity) {
    titleParts.push(activity);
  } else if (category) {
    titleParts.push(category);
  }
  titleParts.push(programTypeLabel);

  const title = `${titleParts.join(' ')} | Toronto Recreation Finder`;

  let description = `Find ${activity || category || programTypeLabel.toLowerCase()} programs`;
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
  const [scopedCentreId, setScopedCentreId] = useState<string | number | null>(null);
  const [scheduleFocusToken, setScheduleFocusToken] = useState(0);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [locateMeLoading, setLocateMeLoading] = useState(false);
  const [locateMeError, setLocateMeError] = useState<string | null>(null);
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);
  const [previewLocation, setPreviewLocation] = useState<{ lat: number; lon: number } | null>(null);

  const locationPickingEnabled = locationPermissionDenied && !userLocation;

  useEffect(() => {
    if (userLocation) setPreviewLocation(null);
  }, [userLocation]);

  async function handleRequestLocation() {
    if (!navigator.geolocation) {
      setLocationPermissionDenied(true);
      return;
    }

    if (navigator.permissions?.query) {
      try {
        const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        if (status.state === 'denied') {
          setLocationPermissionDenied(true);
          return;
        }
      } catch {
        // Permissions API query unsupported here; fall through to the direct request below.
      }
    }

    setLocateMeLoading(true);
    setLocateMeError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({ lat: position.coords.latitude, lon: position.coords.longitude });
        setFilters((prev) => ({ ...prev, maxDistanceKm: prev.maxDistanceKm ?? 5 }));
        setLocationPermissionDenied(false);
        setLocateMeLoading(false);
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setLocationPermissionDenied(true);
        } else {
          setLocateMeError('Could not access your location. You can still search without it.');
        }
        setLocateMeLoading(false);
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  }

  function handleDisableDistanceSearch() {
    setUserLocation(null);
    setLocateMeError(null);
    setLocationPermissionDenied(false);
    setPreviewLocation(null);
    setFilters((prev) => ({ ...prev, maxDistanceKm: undefined }));
    setActiveFilters((prev) => (prev ? { ...prev, maxDistanceKm: undefined } : prev));
  }

  function handleMapLocationPreview(coords: { lat: number; lon: number }) {
    setPreviewLocation(coords);
  }

  function handleConfirmMapLocation() {
    if (!previewLocation) return;
    setUserLocation(previewLocation);
    setFilters((prev) => ({ ...prev, maxDistanceKm: prev.maxDistanceKm ?? 5 }));
    setLocationPermissionDenied(false);
    setPreviewLocation(null);
    setIsFiltersOpen(true);
  }

  const [activeFilters, setActiveFilters] = useState<Filters | null>(null);
  const [isFiltersOpen, setIsFiltersOpen] = useState(true);
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
    const minHeight = window.innerHeight * 0.25;
    const maxHeight = window.innerHeight * 0.85;
    setMobilePanelHeightPx(Math.min(maxHeight, Math.max(minHeight, drag.startHeight + deltaY)));
  }

  function handlePanelHandlePointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    panelDragRef.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  }
  const hasScheduleFilters = Boolean(
    activeFilters?.category || activeFilters?.activity || activeFilters?.activities?.length || activeFilters?.weekday || activeFilters?.startMonth || activeFilters?.age || activeFilters?.locationId || (userLocation && activeFilters?.maxDistanceKm)
  );
  const filterPills = buildFilterPills(activeFilters);
  const distancePillLabel = userLocation && activeFilters?.maxDistanceKm
    ? `< ${activeFilters.maxDistanceKm} km`
    : null;
  const { data: centres, loading: centresLoading } = useCentres({
    programType,
    category: activeFilters?.category ?? '',
    activity: activeFilters?.activity ?? '',
    activities: activeFilters?.activities,
    weekday: activeFilters?.weekday ?? null,
    startMonth: activeFilters?.startMonth,
    age: activeFilters?.age,
    locationId: activeFilters?.locationId,
  },
  { enabled: !!activeFilters }
);

  const pinScopedCentreName = scopedCentreId != null
    ? centres?.features?.find((f) => String(f.properties.id) === String(scopedCentreId))?.properties.name ?? null
    : null;
  const selectedCentreName = pinScopedCentreName ?? activeFilters?.locationName ?? null;

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
    }
  }, []);

  function handleSearch() {
    if (!hasAnySelectedFilter(filters, Boolean(userLocation))) {
      setSearchNotice('Select at least one filter to search.');
      return;
    }

    trackEvent('search_executed', {
      program_type: programType,
      category: filters.category || undefined,
      activity: filters.activity || undefined,
      weekday: filters.weekday || undefined,
      start_month: filters.startMonth || undefined,
      age: filters.age || undefined,
      max_distance_km: userLocation ? filters.maxDistanceKm : undefined,
    })

    const params = new URLSearchParams();
    params.set('programType', programType);
    if (filters.category) params.set('category', filters.category);
    if (filters.activity) {
      params.set('activity', filters.activity);
    } else if (filters.activities?.length) {
      filters.activities.forEach((item) => params.append('activity', item));
    }
    if (filters.weekday) params.set('weekday', filters.weekday);
    if (filters.startMonth) params.set('startMonth', filters.startMonth);
    if (filters.age) params.set('age', filters.age);
    setSearchParams(params);

    setHasSearched(true);
    setSelectedLocationId(null);
    setHighlightedLocationId(null);
    setScopedCentreId(null);
    setActiveFilters(filters);
    setIsFiltersOpen(false);

    setShowSchedulePanel(true);
    setMobilePanelHeightPx(null);
  }


  function handleReset() {
    setSearchParams({});

    setFilters({
      category: '',
      activity: '',
      weekday: null,
      startMonth: undefined,
      age: undefined,
    });
    setShowSchedulePanel(false);
    setSelectedLocationId(null);
    setHighlightedLocationId(null);
    setScopedCentreId(null);
    setHasSearched(false);
    setActiveFilters(null);
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
      weekday: null,
      startMonth: undefined,
      age: undefined,
    });
    setShowSchedulePanel(false);
    setSelectedLocationId(null);
    setScopedCentreId(null);
    setHasSearched(false);
    setActiveFilters(null);
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

    const isAlreadyFilterScoped = activeFilters?.locationId != null
      && String(activeFilters.locationId) === String(locationId);
    if (!isAlreadyFilterScoped) {
      setScopedCentreId(locationId);
      setHighlightedLocationId(locationId);
      setScheduleFocusToken(prev => prev + 1);
    }

  }

  const handleCentreClose = useCallback(() => {
    setSelectedLocationId(null);
    setHighlightedLocationId(null);
    setScopedCentreId(null);
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
            userLocation={userLocation}
            locateMeLoading={locateMeLoading}
            locateMeError={locateMeError}
            locationPermissionDenied={locationPermissionDenied}
            onRequestLocation={handleRequestLocation}
            onDisableDistanceSearch={handleDisableDistanceSearch}
          />
        </aside>

        {showSchedulePanel && (
          <>
            <div className = "schedule-desktop">
              <ResizablePanel
                pills={filterPills}
                centrePill={pinScopedCentreName ? { label: pinScopedCentreName, onRemove: handleCentreClose } : undefined}
                distancePill={distancePillLabel ? { label: distancePillLabel, onRemove: handleDisableDistanceSearch } : undefined}
                initialWidth={400}
                minWidth={300}
                maxWidth={640}
              >
                {programType === 'dropin' ? (
                  <SchedulePanel
                    category={activeFilters?.category ?? ''}
                    activity={activeFilters?.activity ?? ''}
                    activities={activeFilters?.activities}
                    age={activeFilters?.age as DropInAgeFilter | undefined}
                    weekday={activeFilters?.weekday}
                    locationId={activeFilters?.locationId}
                    hasSearchCriteria={hasScheduleFilters}
                    isVisible={true}
                    onLocationClick={handleScheduleLocationClick}
                    highlightedLocationId={highlightedLocationId}
                    focusToken={scheduleFocusToken}
                    scopedCentreId={scopedCentreId}
                    selectedCentreName={selectedCentreName}
                    centres={centres}
                    userLocation={userLocation}
                    maxDistanceKm={activeFilters?.maxDistanceKm}
                  />
                ) : (
                  <RegisteredProgramsPanel
                    category={activeFilters?.category ?? ''}
                    activity={activeFilters?.activity ?? ''}
                    activities={activeFilters?.activities}
                    age={activeFilters?.age as RegisteredAgeFilter | undefined}
                    startMonth={activeFilters?.startMonth}
                    locationId={activeFilters?.locationId}
                    hasSearchCriteria={hasScheduleFilters}
                    isVisible={true}
                    onLocationClick={handleScheduleLocationClick}
                    highlightedLocationId={highlightedLocationId}
                    focusToken={scheduleFocusToken}
                    scopedCentreId={scopedCentreId}
                    selectedCentreName={selectedCentreName}
                    centres={centres}
                    userLocation={userLocation}
                    maxDistanceKm={activeFilters?.maxDistanceKm}
                  />
                  )
                }
              </ResizablePanel>
            </div>

            <section
              className="schedule-mobile"
              style={mobilePanelHeightPx != null ? { height: mobilePanelHeightPx, maxHeight: mobilePanelHeightPx } : undefined}
            >
              {(filterPills.length > 0 || pinScopedCentreName || distancePillLabel) && (
                <div className="schedule-mobile-pills filter-pill-row">
                  {filterPills.map((pill) => (
                    <span key={pill} className="filter-pill">
                      {pill}
                    </span>
                  ))}
                  {pinScopedCentreName && (
                    <span className="filter-pill filter-pill--centre">
                      📍 {pinScopedCentreName}
                      <button
                        type="button"
                        className="filter-pill-remove"
                        aria-label={`Clear selected centre: ${pinScopedCentreName}`}
                        onClick={handleCentreClose}
                      >
                        ✕
                      </button>
                    </span>
                  )}
                  {distancePillLabel && (
                    <span className="filter-pill filter-pill--distance">
                      📏 {distancePillLabel}
                      <button
                        type="button"
                        className="filter-pill-remove"
                        aria-label={`Remove distance filter: ${distancePillLabel}`}
                        onClick={handleDisableDistanceSearch}
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
                    locationId={activeFilters?.locationId}
                    hasSearchCriteria={hasScheduleFilters}
                    isVisible={true}
                    onLocationClick={handleScheduleLocationClick}
                    highlightedLocationId={highlightedLocationId}
                    focusToken={scheduleFocusToken}
                    scopedCentreId={scopedCentreId}
                    selectedCentreName={selectedCentreName}
                    centres={centres}
                    userLocation={userLocation}
                    maxDistanceKm={activeFilters?.maxDistanceKm}
                  />
                ) : (
                  <RegisteredProgramsPanel
                    category={activeFilters?.category ?? ''}
                    activity={activeFilters?.activity ?? ''}
                      activities={activeFilters?.activities}
                    age={activeFilters?.age as RegisteredAgeFilter}
                    startMonth={activeFilters?.startMonth}
                    locationId={activeFilters?.locationId}
                    hasSearchCriteria={hasScheduleFilters}
                    isVisible={true}
                    onLocationClick={handleScheduleLocationClick}
                    highlightedLocationId={highlightedLocationId}
                    focusToken={scheduleFocusToken}
                    scopedCentreId={scopedCentreId}
                    selectedCentreName={selectedCentreName}
                    centres={centres}
                    userLocation={userLocation}
                    maxDistanceKm={activeFilters?.maxDistanceKm}
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
          </>
        )}

        <main className = "map-panel">
          <MapView
            centres = {centres}
            wards = {wards}
            onCentreClick = {handleCentreMarkerClick}
            onCentreClose = {handleCentreClose}
            selectedLocationId = {selectedLocationId}
            userLocation = {userLocation}
            maxDistanceKm = {filters.maxDistanceKm}
            activeMaxDistanceKm = {userLocation ? activeFilters?.maxDistanceKm : undefined}
            locationPickingEnabled = {locationPickingEnabled}
            previewLocation = {previewLocation}
            onMapLocationPreview = {handleMapLocationPreview}
            onConfirmMapLocation = {handleConfirmMapLocation}
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
