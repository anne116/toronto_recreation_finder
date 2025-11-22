// src/app/App.tsx

import { useState, useEffect } from 'react';
import { getWards } from '../features/centres/api/centres.api';
import { useCentres } from '../features/centres/hooks/useCentres';
import type { WardFeatureCollection, AgeFilter } from '../shared/types';

// Import UI components
import FiltersPanel from '../features/filters/ui/FiltersPanel';
import MapView from '../features/map/ui/MapView';
import DetailsSidebar from '../features/centres/ui/DetailsSidebar';
import SchedulePanel from '../features/centres/ui/SchedulePanel';  // ← NEW!

/**
 * ==========================================
 * PROFESSIONAL ARCHITECTURE OVERVIEW
 * ==========================================
 * 
 * LAYOUT STRUCTURE:
 * 
 * ┌─────────────────────────────────────────────────────┐
 * │  FiltersPanel (left, fixed)                         │
 * │  - User selects filters                             │
 * │  - Clicks Search                                    │
 * └─────────────────────────────────────────────────────┘
 * 
 * ┌───────────────┬──────────────────┬─────────────────┐
 * │  (Filters)    │  SchedulePanel   │  MapView        │
 * │               │  (conditional)   │  (main)         │
 * │               │  - Shows when    │  - Shows        │
 * │               │    activity      │    filtered     │
 * │               │    filter active │    centres      │
 * └───────────────┴──────────────────┴─────────────────┘
 * 
 * DetailsSidebar (slides in from right when centre clicked)
 * 
 * DATA FLOW:
 * 1. User sets filters → FiltersPanel
 * 2. User clicks Search → Fetch centres → MapView
 * 3. If activity filter → Show SchedulePanel
 * 4. User clicks bubble/grid → Open DetailsSidebar
 */

export default function App() {
  
  // ==========================================
  // STATE: FILTERS
  // ==========================================
  
  type Filters = {
    activity: string;
    district: string;
    weekday: string;
    age?: AgeFilter;
    facility_type: string;
  };
  
  const [filters, setFilters] = useState<Filters>({
    activity: '',
    district: '',
    weekday: '',
    age: undefined,
    facility_type: '',
  });
  
  // ==========================================
  // STATE: MAP & UI
  // ==========================================
  
  const [wards, setWards] = useState<WardFeatureCollection | null>(null);
  const [selectedCentre, setSelectedCentre] = useState<string | number | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [status, setStatus] = useState<string>('Ready to search');
  
  // ==========================================
  // STATE: SCHEDULE PANEL VISIBILITY
  // ==========================================
  
  /**
   * PROFESSIONAL PATTERN: Explicit visibility control
   * 
   * WHY?
   * - SchedulePanel only shows when user has searched with activity
   * - Need to hide when filters reset
   * - Clear, explicit state management
   */
  const [showSchedulePanel, setShowSchedulePanel] = useState(false);
  
  // NEW: Track if user has searched
  const [hasSearched, setHasSearched] = useState(false);
  
  // ==========================================
  // STATE: LAYER VISIBILITY (Map controls)
  // ==========================================
  
  const [layersVisible, setLayersVisible] = useState({
    centres: true,
    wards: true,
  });
  
  // ==========================================
  // DATA FETCHING: Centres
  // ==========================================
  
  /**
   * useCentres hook fetches centres based on filters
   * Updates automatically when filters change
   */
  const { data: centres, loading: centresLoading } = useCentres({
    activity: filters.activity,
    district: filters.district,
    weekday: filters.weekday,
    facility_type: filters.facility_type,
  },
  { enabled: hasSearched }
);
  

  useEffect(() => {
    let mounted = true;  // ✅ Use mounted flag instead
    
    (async () => {
      try {
        const wardsData = await getWards();
        if (mounted) {  // ✅ Only update if still mounted
          setWards(wardsData);
        }
      } catch (error) {
        if (mounted) {
          console.error('Failed to load wards:', error);
        }
      }
    })();
    
    return () => {
      mounted = false;  // ✅ Cleanup
    };
  }, []);
  
  // ==========================================
  // HANDLER: Search Button
  // ==========================================
  
  /**
   * PROFESSIONAL PATTERN: Explicit search action
   * 
   * User clicks "Search" button:
   * 1. Fetch centres (handled by useCentres hook)
   * 2. Show schedule panel if activity filter is set
   * 3. Update status message
   */
  function handleSearch() {
    setStatus('Searching...');
    setHasSearched(true);  // Mark that user has searched
    
    if (filters.activity) {
      setShowSchedulePanel(true);
      setStatus(`Showing ${filters.activity} programs`);
    } else {
      setShowSchedulePanel(false);
      setStatus('Showing all centres');
    }
  }
  
  // ==========================================
  // HANDLER: Reset Filters
  // ==========================================
  
  function handleReset() {
    setFilters({
      activity: '',
      district: '',
      weekday: '',
      age: undefined,
      facility_type: '',
    });
    setShowSchedulePanel(false);
    setSelectedCentre(null);
    setHasSearched(false);  // Reset search state
    setStatus('Filters reset');
  }
  
  // ==========================================
  // HANDLER: Find Near Me
  // ==========================================
  
  function handleNearMe() {
    if (!navigator.geolocation) {
      setStatus('Geolocation not supported by your browser');
      return;
    }
    
    setStatus('Getting your location...');
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: [number, number] = [
          position.coords.longitude,
          position.coords.latitude,
        ];
        setUserLocation(coords);
        setStatus('Showing centres near you');
      },
      (error) => {
        console.error('Geolocation error:', error);
        setStatus('Could not get your location');
      }
    );
  }
  
  // ==========================================
  // HANDLER: Centre Click (from map or grid)
  // ==========================================
  
  /**
   * PROFESSIONAL PATTERN: Single source of truth
   * 
   * Both map bubbles AND schedule grid locations
   * call this same handler.
   * 
   * WHY?
   * - Consistent behavior
   * - Single place to add logging, analytics, etc.
   * - Easy to modify later
   */
  function handleCentreClick(centreId: string | number) {
    setSelectedCentre(centreId);
    setStatus(`Viewing centre details`);
  }
  
  // ==========================================
  // HANDLER: Close Sidebar
  // ==========================================
  
  function handleCloseSidebar() {
    setSelectedCentre(null);
    setStatus(showSchedulePanel ? `Showing ${filters.activity} programs` : 'Ready to search');
  }
  
  // ==========================================
  // HANDLER: Toggle Map Layers
  // ==========================================
  
  function toggleLayer(layer: 'centres' | 'wards') {
    setLayersVisible(prev => ({
      ...prev,
      [layer]: !prev[layer],
    }));
  }
  
  // ==========================================
  // RENDER
  // ==========================================
  
  return (
    <div style={{ 
      display: 'flex',
      width: '100vw', 
      height: '100vh',
      overflow: 'hidden',
      position: 'relative',
    }}>
      
      {/* ==========================================
          FILTERS PANEL (Left, always visible)
          ========================================== */}
      <div style={{
        width: '320px',
        flexShrink: 0,
        height: '100vh',
        overflow: 'auto',
        zIndex: 10,
      }}>
        <FiltersPanel
          value={filters}
          onChange={setFilters}
          onSearch={handleSearch}
          onReset={handleReset}
          onNearMe={handleNearMe}
          status={status}
        />
      </div>
      
      {/* ==========================================
          SCHEDULE PANEL (Middle, conditional)
          ========================================== */}
      {showSchedulePanel && (
        <div style={{
          width: '400px',
          flexShrink: 0,
          height: '100vh',
          overflow: 'hidden',
          zIndex: 10,
        }}>
          <SchedulePanel
            activity={filters.activity}
            age={filters.age}
            weekday={filters.weekday}
            district={filters.district}
            isVisible={showSchedulePanel}
            onLocationClick={handleCentreClick}
          />
        </div>
      )}
      
      {/* ==========================================
          MAP VIEW (Right, fills remaining space)
          ========================================== */}
      {hasSearched ? (
        <div style={{
          flex: 1,
          height: '100vh',
          position: 'relative',
        }}>
          <MapView
            centres={centres}
            wards={wards}
            onCentreClick={handleCentreClick}
            layersVisible={layersVisible}
            userLocation={userLocation}
          />
        </div>
      ) : (
        <div style={{
          flex: 1,
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f8fafc',
          color: '#64748b',
          fontSize: '18px',
          textAlign: 'center',
          padding: '40px',
        }}>
          <div>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗺️</div>
            <div style={{ fontWeight: 600, marginBottom: '8px' }}>
              Toronto Recreation Finder
            </div>
            <div>
              Select your preferences and click "Search" to discover recreation centres
            </div>
          </div>
        </div>
      )}
      
      {/* ==========================================
          DETAILS SIDEBAR (Right side, slides in)
          ========================================== */}

      <DetailsSidebar
        centreId={selectedCentre}
        age={filters.age}
        onClose={handleCloseSidebar}
        activeFilters={{
          activity: filters.activity,
          age: filters.age as any,
          weekday: filters.weekday,       // can be "", "0".."6", or "Monday".."Sunday"
          district: filters.district,
          facility_type: filters.facility_type,
        }}
        onLocationClick={handleCentreClick}
      />

      
      {/* ==========================================
          LEGEND (Bottom right, layer toggles)
          ========================================== */}
      <div className="legend">
        <div className="legend-title">Map Layers</div>
        
        <label className="legend-item">
          <input
            type="checkbox"
            checked={layersVisible.centres}
            onChange={() => toggleLayer('centres')}
          />
          <div className="legend-icon" style={{ background: '#3b82f6' }} />
          <span className="legend-text">Recreation Centres</span>
        </label>
        
        <label className="legend-item">
          <input
            type="checkbox"
            checked={layersVisible.wards}
            onChange={() => toggleLayer('wards')}
          />
          <div className="legend-icon" style={{ background: '#94a3b8' }} />
          <span className="legend-text">Ward Boundaries</span>
        </label>
      </div>
      
      {/* ==========================================
          LOADING INDICATOR (Optional)
          ========================================== */}
      {hasSearched && centresLoading && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'white',
          padding: '20px 40px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          zIndex: 1000,
        }}>
          Loading centres...
        </div>
      )}
    </div>
  );
}

/**
 * ==========================================
 * PROFESSIONAL EXPLANATION
 * ==========================================
 * 
 * 1. STATE ORGANIZATION
 *    - Filters: User input
 *    - UI State: What's visible (panel, sidebar)
 *    - Data: Centres, wards
 *    - User interaction: Selected centre, location
 * 
 *    PRINCIPLE: Group related state together
 * 
 * 2. HANDLER NAMING CONVENTION
 *    - handle[Action]: handleSearch, handleReset
 *    - on[Event]: Passed to children as props
 *    - toggle[Thing]: Boolean state changes
 * 
 *    PRINCIPLE: Clear, consistent naming
 * 
 * 3. COMPONENT COMPOSITION
 *    - Each component has single responsibility
 *    - Props flow down (data)
 *    - Events flow up (callbacks)
 * 
 *    PRINCIPLE: Unidirectional data flow
 * 
 * 4. CONDITIONAL RENDERING
 *    - SchedulePanel: isVisible prop
 *    - DetailsSidebar: Opens when centreId set
 *    - Loading: Shows when fetching
 * 
 *    PRINCIPLE: Declarative UI
 * 
 * 5. SIDE EFFECTS
 *    - useEffect for initial data load (wards)
 *    - useCentres hook manages centre fetching
 *    - Geolocation in event handler
 * 
 *    PRINCIPLE: Separate side effects from render
 * 
 * ==========================================
 * COMMON PATTERNS USED
 * ==========================================
 * 
 * 1. LIFTING STATE UP
 *    - App.tsx holds selectedCentre
 *    - Both Map and SchedulePanel can change it
 *    - Single source of truth
 * 
 * 2. CALLBACK PROPS
 *    - onCentreClick, onLocationClick
 *    - Children notify parent of events
 *    - Parent decides what to do
 * 
 * 3. CONTROLLED COMPONENTS
 *    - FiltersPanel: value + onChange
 *    - App controls filter state
 *    - Standard React pattern
 * 
 * 4. COMPOSITION OVER INHERITANCE
 *    - Build UI from small components
 *    - Each component reusable
 *    - No deep inheritance hierarchies
 * 
 * ==========================================
 * TESTING THIS COMPONENT
 * ==========================================
 * 
 * 1. Unit Tests (if you add them):
 *    - Mock child components
 *    - Test state changes
 *    - Test handler functions
 * 
 * 2. Integration Tests:
 *    - Render full component
 *    - Simulate user clicks
 *    - Verify correct behavior
 * 
 * 3. Manual Testing (what you do now):
 *    - Click through each user flow
 *    - Verify visual appearance
 *    - Check console for errors
 */