import { useEffect, useState } from 'react';
import MapView from '../features/map/ui/MapView.tsx';
import Legend from '../features/legend/ui/Legend';
import FiltersPanel from '../features/filters/ui/FiltersPanel';
import DetailsSidebar from '../features/centres/ui/DetailsSidebar';
import type { AgeFilter, CentresFeatureCollection, WardFeatureCollection } from '../shared/types';
import { getWards } from '../features/centres/api/centres.api';
import { useCentres } from '../features/centres/hooks/useCentres';

export default function App() {
  const [filters, setFilters] = useState({ activity:'', district:'', weekday:'', age:'' as AgeFilter, facility_type:'' });
  const [wards, setWards] = useState<WardFeatureCollection | null>(null);
  const [selectedCentreId, setSelectedCentreId] = useState<string|number|null>(null);
  const [layersVisible, setLayersVisible] = useState({ centres: true, wards: true });
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [status, setStatus] = useState('Loading map...');

  const { data: centres, loading: centresLoading, refetch } = useCentres(filters);

  useEffect(() => {
    (async () => {
      const w = await getWards();
      setWards(w);
      setStatus('Map loaded! Click markers for details.');
    })();
  }, []);

  const onSearch = () => refetch();
  const onReset = () => {
    setFilters({ activity:'', district:'', weekday:'', age:'', facility_type:'' });
    setSelectedCentreId(null);
    refetch();
  };
  const onNearMe = () => {
    setStatus('Locating…');
    navigator.geolocation?.getCurrentPosition(
      (p) => { setUserLocation([p.coords.longitude, p.coords.latitude]); setStatus('Your location is shown if permission is granted.'); },
      () => setStatus('Unable to retrieve your location.'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div style={{ position: 'relative', height: '100vh' }}>
      <MapView
        centres={centres as CentresFeatureCollection | null}
        wards={wards}
        onCentreClick={setSelectedCentreId}
        layersVisible={layersVisible}
        userLocation={userLocation}
      />

      <FiltersPanel
        value={filters}
        onChange={setFilters}
        onSearch={onSearch}
        onReset={onReset}
        onNearMe={onNearMe}
        status={centresLoading ? 'Loading centres…' : status}
      />

      <Legend value={layersVisible} onChange={setLayersVisible} />

      <DetailsSidebar centreId={selectedCentreId} age={filters.age} onClose={() => setSelectedCentreId(null)} />
    </div>
  );
}
