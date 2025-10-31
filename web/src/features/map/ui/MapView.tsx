import { useEffect, useRef, useState } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import maplibregl from 'maplibre-gl';
import type { Map as MaplibreMap, GeoJSONSource } from 'maplibre-gl';
import type { CentresFeatureCollection, WardFeatureCollection } from '../../../shared/types';


type Props = {
  centres: CentresFeatureCollection | null;
  wards: WardFeatureCollection | null;
  onCentreClick: (id: string | number) => void;
  layersVisible: { centres: boolean; wards: boolean };
  userLocation?: [number, number] | null;
};

export default function MapView({ centres, wards, onCentreClick, layersVisible, userLocation }: Props) {
  const mapRef = useRef<MaplibreMap | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors'
          }
        },
        layers: [{ id: 'osm-tiles', type: 'raster', source: 'osm-tiles', minzoom: 0, maxzoom: 19 }]
      },
      center: [-79.3832, 43.6532], zoom: 11
    });
    map.on('load', () => setMapReady(true));
    mapRef.current = map;
    return () => {
      setMapReady(false);
      map.remove();
      mapRef.current = null;
    };

  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !wards) return;
    if (map.getSource('wards')) {
      (map.getSource('wards') as GeoJSONSource).setData(wards as any);
    } else {
      map.addSource('wards', { type: 'geojson', data: wards as any });
      map.addLayer({ id: 'wards-fill', type: 'fill', source: 'wards', paint: { 'fill-color': '#94a3b8', 'fill-opacity': 0.15 } });
      map.addLayer({ id: 'wards-outline', type: 'line', source: 'wards', paint: { 'line-color': '#1e293b', 'line-width': 2.5, 'line-opacity': 0.9 } });
    }
    map.setLayoutProperty('wards-fill', 'visibility', layersVisible.wards ? 'visible' : 'none');
    map.setLayoutProperty('wards-outline', 'visibility', layersVisible.wards ? 'visible' : 'none');
  }, [wards, layersVisible.wards]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !centres) return;
    if (map.getSource('centres')) {
      (map.getSource('centres') as GeoJSONSource).setData(centres as any);
    } else {
      map.addSource('centres', { type: 'geojson', data: centres as any });
      map.addLayer({
        id: 'centres-circle', type: 'circle', source: 'centres',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['get', 'total_programs'], 0, 8, 10, 12, 50, 16, 100, 20],
          'circle-color': '#3b82f6', 'circle-opacity': 0.8, 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff'
        }
      });
      map.on('click', 'centres-circle', (e) => {
        const feature = e.features?.[0];
        const id = feature?.properties?.id;
        if (id != null) onCentreClick(id);
      });
      map.on('mouseenter', 'centres-circle', () => map.getCanvas().style.cursor = 'pointer');
      map.on('mouseleave', 'centres-circle', () => map.getCanvas().style.cursor = '');
    }
    map.setLayoutProperty('centres-circle', 'visibility', layersVisible.centres ? 'visible' : 'none');

    if (centres.features?.length) {
      const b = new maplibregl.LngLatBounds();
      centres.features.forEach(f => b.extend(f.geometry.coordinates as [number, number]));
      map.fitBounds(b, { padding: 100, maxZoom: 13 });
    }
  }, [centres, layersVisible.centres, onCentreClick]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (userMarkerRef.current) { userMarkerRef.current.remove(); userMarkerRef.current = null; }
    if (userLocation) {
      userMarkerRef.current = new maplibregl.Marker({ color: '#10b981' }).setLngLat(userLocation).addTo(map);
      map.flyTo({ center: userLocation, zoom: 13 });
    }
  }, [userLocation]);

  return <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />;
}
