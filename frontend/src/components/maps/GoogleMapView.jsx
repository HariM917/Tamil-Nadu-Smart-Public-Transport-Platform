import React, { useCallback, useEffect, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Polyline } from '@react-google-maps/api';

const CHENNAI_CENTER = { lat: 13.0827, lng: 80.2707 };

const mapContainerStyle = { width: '100%', height: '100%' };

const defaultOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
};

/**
 * Reusable Google Maps wrapper (replaces Leaflet across tracking & route pages).
 * Set VITE_GOOGLE_MAPS_API_KEY in frontend/.env
 */
export default function GoogleMapView({
  center = CHENNAI_CENTER,
  zoom = 12,
  markers = [],
  polylines = [],
  fitBounds = null,
  className = 'h-full w-full',
  onMapReady,
}) {
  const mapRef = useRef(null);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
  });

  const onLoad = useCallback(
    (map) => {
      mapRef.current = map;
      onMapReady?.(map);
    },
    [onMapReady]
  );

  useEffect(() => {
    if (!mapRef.current || !fitBounds?.length || !window.google) return;
    const bounds = new window.google.maps.LatLngBounds();
    fitBounds.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }));
    mapRef.current.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
  }, [fitBounds, isLoaded]);

  if (!apiKey) {
    return (
      <div className={`${className} flex items-center justify-center bg-slate-100 text-center p-6`}>
        <div>
          <p className="font-semibold text-tn-text">Google Maps API key required</p>
          <p className="text-xs text-tn-text-muted mt-2">
            Add <code className="bg-white px-1 rounded">VITE_GOOGLE_MAPS_API_KEY</code> to frontend/.env
          </p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={`${className} flex items-center justify-center bg-red-50 text-red-700 text-sm p-4`}>
        Failed to load Google Maps
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className={`${className} flex items-center justify-center bg-slate-50`}>
        <span className="text-sm text-tn-text-secondary animate-pulse">Loading map…</span>
      </div>
    );
  }

  return (
    <div className={className}>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={zoom}
        onLoad={onLoad}
        options={defaultOptions}
      >
        {polylines.map((line, i) => (
          <Polyline
            key={`line-${i}`}
            path={line.path}
            options={{
              strokeColor: line.color || '#2563eb',
              strokeOpacity: 0.8,
              strokeWeight: line.weight || 4,
            }}
          />
        ))}

        {markers.map((m, i) => (
          <Marker
            key={m.id ?? `marker-${i}`}
            position={{ lat: m.lat, lng: m.lng }}
            title={m.title}
            label={m.label}
            icon={
              m.icon === 'bus'
                ? {
                    path: window.google.maps.SymbolPath.CIRCLE,
                    scale: 12,
                    fillColor: '#0f4c81',
                    fillOpacity: 1,
                    strokeWeight: 2,
                    strokeColor: '#ffffff',
                  }
                : m.icon === 'start'
                  ? {
                      path: window.google.maps.SymbolPath.CIRCLE,
                      scale: 10,
                      fillColor: '#059669',
                      fillOpacity: 1,
                      strokeWeight: 2,
                      strokeColor: '#fff',
                    }
                  : m.icon === 'end'
                    ? {
                        path: window.google.maps.SymbolPath.CIRCLE,
                        scale: 10,
                        fillColor: '#dc2626',
                        fillOpacity: 1,
                        strokeWeight: 2,
                        strokeColor: '#fff',
                      }
                    : {
                        path: window.google.maps.SymbolPath.CIRCLE,
                        scale: 6,
                        fillColor: '#2563eb',
                        fillOpacity: 1,
                        strokeWeight: 1,
                        strokeColor: '#fff',
                      }
            }
          />
        ))}
      </GoogleMap>
    </div>
  );
}

export { CHENNAI_CENTER };
