import React, { useState, useEffect, useRef } from 'react';
import { apiService } from '../services/api';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Search, Navigation2, Clock, Map as MapIcon, Loader2 } from 'lucide-react';

// Custom bus marker
const busIcon = new L.DivIcon({
  className: 'custom-bus-marker',
  html: `<div class="bg-tn-primary text-white p-2 rounded-full shadow-lg border-2 border-white ring-4 ring-tn-primary/20 animate-pulse-glow">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>
          </svg>
         </div>`,
  iconSize: [38, 38],
  iconAnchor: [19, 19],
  popupAnchor: [0, -20],
});

export default function LiveTracking() {
  const [buses, setBuses] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBus, setSelectedBus] = useState(null);
  
  const [telemetry, setTelemetry] = useState(null);
  const [loading, setLoading] = useState(false);
  const mapRef = useRef(null);
  const trackingInterval = useRef(null);

  useEffect(() => {
    loadBuses();
    return () => clearInterval(trackingInterval.current);
  }, []);

  const loadBuses = async () => {
    try {
      const data = await apiService.listBuses();
      setBuses(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    try {
      if (!searchQuery) {
        loadBuses();
        return;
      }
      const data = await apiService.searchBusesByQuery(searchQuery);
      setBuses(data);
    } catch (err) {
      console.error(err);
    }
  };

  const startTracking = async (bus) => {
    setSelectedBus(bus);
    setLoading(true);
    clearInterval(trackingInterval.current);

    try {
      const data = await apiService.trackBus(bus.id);
      setTelemetry(data.tracking);
      updateMapView(data.tracking.current_lat, data.tracking.current_lng);
      
      // Poll every 4 seconds
      trackingInterval.current = setInterval(async () => {
        try {
          const tick = await apiService.trackBus(bus.id);
          setTelemetry(tick.tracking);
          updateMapView(tick.tracking.current_lat, tick.tracking.current_lng);
        } catch (e) {
          console.error('Tracking tick failed', e);
        }
      }, 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateMapView = (lat, lng) => {
    if (mapRef.current) {
      mapRef.current.setView([lat, lng], 14, { animate: true, duration: 1 });
    }
  };

  // Chennai center
  const center = [13.0827, 80.2707];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex-shrink-0 mb-6 animate-fade-in">
        <h1 className="section-title flex items-center gap-2">
          <MapPin className="h-8 w-8 text-tn-primary" />
          Live GPS Tracking
        </h1>
        <p className="section-subtitle">
          Real-time location, speed, and ETA for all active state buses.
        </p>
      </div>

      <div className="flex-grow grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
        
        {/* Sidebar */}
        <div className="lg:col-span-1 flex flex-col gap-4 overflow-hidden h-full">
          <div className="glass-panel p-4 rounded-2xl flex-shrink-0 animate-fade-in-up">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                placeholder="Search bus, route, destination..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input !pr-10"
              />
              <button type="submit" className="absolute right-2 top-2 p-1.5 text-tn-text-muted hover:text-tn-primary transition-colors">
                <Search className="h-4 w-4" />
              </button>
            </form>
          </div>

          <div className="glass-panel rounded-2xl flex-grow overflow-y-auto p-2 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <div className="space-y-2 p-2">
              <h3 className="text-xs font-bold text-tn-text-muted uppercase tracking-wider mb-3 px-1">Active Routes</h3>
              {buses.map((bus) => (
                <button
                  key={bus.id}
                  onClick={() => startTracking(bus)}
                  className={`w-full text-left p-3 rounded-xl transition-all ${
                    selectedBus?.id === bus.id 
                      ? 'bg-tn-primary text-white shadow-md' 
                      : 'hover:bg-slate-100 bg-white border border-slate-100'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold font-display">{bus.bus_name || bus.bus_number}</span>
                    {selectedBus?.id !== bus.id && (
                      <span className={`badge ${bus.is_active ? 'badge-success' : 'badge-warning'} !px-1.5 !py-0.5 text-[9px]`}>
                        {bus.status}
                      </span>
                    )}
                  </div>
                  <div className={`text-xs flex items-center gap-1 ${selectedBus?.id === bus.id ? 'text-blue-100' : 'text-tn-text-secondary'}`}>
                    <span>{bus.source}</span>
                    <Navigation2 className="h-2.5 w-2.5 rotate-90" />
                    <span>{bus.destination}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Map Area */}
        <div className="lg:col-span-3 flex flex-col gap-4 min-h-0 relative animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          
          <div className="glass-panel-elevated rounded-2xl flex-grow overflow-hidden relative border-2 border-slate-200">
            {loading && (
              <div className="absolute inset-0 z-[1000] bg-white/50 backdrop-blur-sm flex items-center justify-center">
                <div className="glass-panel p-4 flex items-center gap-3">
                  <Loader2 className="h-5 w-5 text-tn-primary animate-spin" />
                  <span className="font-semibold text-tn-text">Connecting to GPS...</span>
                </div>
              </div>
            )}
            
            <MapContainer 
              center={center} 
              zoom={12} 
              className="h-full w-full z-0"
              ref={mapRef}
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
              />
              
              {telemetry && selectedBus && (
                <>
                  <Marker 
                    position={[telemetry.current_lat, telemetry.current_lng]}
                    icon={busIcon}
                  >
                    <Popup>
                      <div className="text-center">
                        <strong className="block text-sm text-tn-text font-display">{selectedBus.bus_name || selectedBus.bus_number}</strong>
                        <span className="text-xs text-tn-text-secondary">Speed: {telemetry.current_speed_kmh} km/h</span>
                      </div>
                    </Popup>
                  </Marker>
                  
                  {/* Decorative polyline showing path */}
                  <Polyline 
                    positions={[
                      [telemetry.current_lat - 0.02, telemetry.current_lng - 0.02],
                      [telemetry.current_lat - 0.01, telemetry.current_lng - 0.01],
                      [telemetry.current_lat, telemetry.current_lng]
                    ]} 
                    pathOptions={{ color: '#0f4c81', weight: 4, opacity: 0.6, dashArray: '8, 8' }} 
                  />
                </>
              )}
            </MapContainer>
          </div>

          {/* Telemetry Dashboard */}
          {telemetry && (
            <div className="glass-panel p-4 rounded-2xl grid grid-cols-2 md:grid-cols-4 gap-4 animate-slide-in-down flex-shrink-0">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-tn-text-muted uppercase tracking-wider mb-1">Status</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse-dot" />
                  <span className="font-semibold text-sm text-tn-text">Live GPS Active</span>
                </div>
              </div>
              
              <div className="flex flex-col border-l border-slate-200 pl-4">
                <span className="text-[10px] font-bold text-tn-text-muted uppercase tracking-wider mb-1">Speed</span>
                <div className="flex items-baseline gap-1">
                  <span className="font-display font-bold text-xl text-tn-text">{telemetry.current_speed_kmh}</span>
                  <span className="text-xs text-tn-text-secondary font-medium">km/h</span>
                </div>
              </div>
              
              <div className="flex flex-col border-l border-slate-200 pl-4">
                <span className="text-[10px] font-bold text-tn-text-muted uppercase tracking-wider mb-1">Distance Left</span>
                <div className="flex items-baseline gap-1">
                  <span className="font-display font-bold text-xl text-tn-text">{telemetry.distance_km}</span>
                  <span className="text-xs text-tn-text-secondary font-medium">km</span>
                </div>
              </div>
              
              <div className="flex flex-col border-l border-slate-200 pl-4">
                <span className="text-[10px] font-bold text-tn-text-muted uppercase tracking-wider mb-1">Estimated Arrival</span>
                <div className="flex items-baseline gap-1">
                  <span className="font-display font-bold text-xl text-emerald-600">{telemetry.eta_minutes}</span>
                  <span className="text-xs text-emerald-600 font-medium">mins</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
