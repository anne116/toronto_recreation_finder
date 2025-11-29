import { useState, useEffect } from 'react';
import { getWards } from '../features/centres/api/centres.api';
import { useCentres } from '../features/centres/hooks/useCentres';
import type { WardFeatureCollection, AgeFilter } from '../shared/types';
import FiltersPanel from '../features/filters/ui/FiltersPanel';
import MapView from '../features/map/ui/MapView';
import SchedulePanel from '../features/centres/ui/SchedulePanel';
import ResizablePanel from '../shared/ui/ResizablePanel';

export default function App() {
  
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
  const [wards, setWards] = useState<WardFeatureCollection | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [status, setStatus] = useState<string>('Ready to search');
  const [showSchedulePanel, setShowSchedulePanel] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [layersVisible, setLayersVisible] = useState({
    centres: true,
    wards: true,
  });
  const [selectedLocationId, setSelectedLocationId] = useState<string | number | null>(null);

  const [activeFilters, setActiveFilters] = useState<Filters | null>(null);

  const { data: centres, loading: centresLoading } = useCentres({
    activity: activeFilters?.activity ?? '',
    district: activeFilters?.district ?? '',
    weekday: activeFilters?.weekday ?? '',
    facility_type: activeFilters?.facility_type ?? '',
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
    setActiveFilters(filters);
    
    if (filters.activity) {
      setShowSchedulePanel(true);
      setStatus(`Showing ${filters.activity} programs`);
    } else {
      setShowSchedulePanel(false);
      setStatus('Showing all centres');
    }
  }
  

  function handleReset() {
    setFilters({
      activity: '',
      district: '',
      weekday: '',
      age: undefined,
      facility_type: '',
    });
    setShowSchedulePanel(false);
    setSelectedLocationId(null);
    setHasSearched(false);
    setStatus('Filters reset');
    setActiveFilters(null);
  }
  
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


  function handleLocationClick(locationId: string | number) {
    setSelectedLocationId(locationId);
    setStatus('Viewing centre details');
  }
 
  function toggleLayer(layer: 'centres' | 'wards') {
    setLayersVisible(prev => ({
      ...prev,
      [layer]: !prev[layer],
    }));
  }
  

  return (
    <div style={{ 
      display: 'flex',
      width: '100vw', 
      height: '100vh',
      overflow: 'hidden',
      position: 'relative',
    }}>
      
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
      

      {showSchedulePanel && (
        <ResizablePanel
          title={
            activeFilters?.activity
              ? `${activeFilters.activity} Schedule`
              : "Schedule"
          }
          initialWidth={400}
          minWidth={300}
          maxWidth={640}
          onClose={() => setShowSchedulePanel(false)}
        >
          <SchedulePanel
            activity={activeFilters?.activity ?? ''}
            age={activeFilters?.age}
            weekday={activeFilters?.weekday}
            district={activeFilters?.district ?? ''}
            isVisible={showSchedulePanel}
            onLocationClick={handleLocationClick}
          />
        </ResizablePanel>
      )}
      


      <div style={{
        flex: 1,
        height: '100vh',
        position: 'relative',
      }}>
        <MapView
          centres={centres}
          wards={wards}
          onCentreClick={handleLocationClick}
          layersVisible={layersVisible}
          userLocation={userLocation}
          selectedLocationId={selectedLocationId}
        />
      </div>
      {!hasSearched && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(248, 250, 252, 0.8',
            color: '#64748b',
            fontSize: '18px',
            textAlign: 'center',
            padding: '40px',
          }}
        >
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

      {hasSearched && (
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
            <div className="legend-icon--line"/>
            <span className="legend-text">Ward Boundaries</span>
          </label>
        </div>
      )}
      

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
