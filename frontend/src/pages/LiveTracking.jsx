import React, { useState, useEffect, useRef, useMemo } from 'react';
import { apiService } from '../services/api';
import GoogleMapView, { CHENNAI_CENTER } from '../components/maps/GoogleMapView';
import { MapPin, Search, Navigation2, Loader2 } from 'lucide-react';

export default function LiveTracking() {
  const [buses, setBuses] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBus, setSelectedBus] = useState(null);
  const [telemetry, setTelemetry] = useState(null);
  const [loading, setLoading] = useState(false);
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

      trackingInterval.current = setInterval(async () => {
        try {
          const tick = await apiService.trackBus(bus.id);
          setTelemetry(tick.tracking);
        } catch (e) {
          console.error('Tracking tick failed', e);
        }
      }, 5000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const mapMarkers = useMemo(() => {
    const list = [];
    if (selectedBus?.stops?.length) {
      selectedBus.stops.forEach((stop, idx) => {
        list.push({
          id: `stop-${idx}`,
          lat: stop.lat,
          lng: stop.lng,
          title: stop.name,
          icon: idx === 0 ? 'start' : idx === selectedBus.stops.length - 1 ? 'end' : 'stop',
        });
      });
    }
    if (telemetry && selectedBus) {
      list.push({
        id: 'bus-live',
        lat: telemetry.current_lat,
        lng: telemetry.current_lng,
        title: selectedBus.bus_name || selectedBus.bus_number,
        icon: 'bus',
      });
    }
    return list;
  }, [selectedBus, telemetry]);

  const mapPolylines = useMemo(() => {
    if (!selectedBus?.stops?.length) return [];
    return [
      {
        path: selectedBus.stops.map((s) => ({ lat: s.lat, lng: s.lng })),
        color: '#2563eb',
        weight: 4,
      },
    ];
  }, [selectedBus]);

  const fitBounds = useMemo(() => {
    if (!selectedBus?.stops?.length) return null;
    return selectedBus.stops.map((s) => ({ lat: s.lat, lng: s.lng }));
  }, [selectedBus]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex-shrink-0 mb-6 animate-fade-in">
        <h1 className="section-title flex items-center gap-2">
          <MapPin className="h-8 w-8 text-tn-primary" />
          Live GPS Tracking
        </h1>
        <p className="section-subtitle">
          Real-time location, speed, and ETA for all active state buses (Google Maps).
        </p>
      </div>

      <div className="flex-grow grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
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

        <div className="lg:col-span-3 flex flex-col gap-4 min-h-0 relative animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <div className="glass-panel-elevated rounded-2xl flex-grow overflow-hidden relative border-2 border-slate-200 min-h-[320px]">
            {loading && (
              <div className="absolute inset-0 z-10 bg-white/50 backdrop-blur-sm flex items-center justify-center">
                <div className="glass-panel p-4 flex items-center gap-3">
                  <Loader2 className="h-5 w-5 text-tn-primary animate-spin" />
                  <span className="font-semibold text-tn-text">Connecting to GPS...</span>
                </div>
              </div>
            )}
            <GoogleMapView
              center={telemetry ? { lat: telemetry.current_lat, lng: telemetry.current_lng } : CHENNAI_CENTER}
              zoom={13}
              markers={mapMarkers}
              polylines={mapPolylines}
              fitBounds={fitBounds}
              className="h-full w-full min-h-[320px]"
            />
          </div>

          {telemetry && (
            <div className="glass-panel p-4 rounded-2xl grid grid-cols-2 md:grid-cols-6 gap-4 animate-slide-in-down flex-shrink-0 text-xs">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-tn-text-muted uppercase tracking-wider mb-1">GPS Status</span>
                <span className="font-bold text-tn-text">{telemetry.driver_status || 'Active'}</span>
              </div>
              <div className="flex flex-col border-l border-slate-200 pl-4">
                <span className="text-[10px] font-bold text-tn-text-muted uppercase tracking-wider mb-1">Next Stop</span>
                <span className="font-bold text-slate-800 truncate">{telemetry.next_stop || '—'}</span>
              </div>
              <div className="flex flex-col border-l border-slate-200 pl-4">
                <span className="text-[10px] font-bold text-tn-text-muted uppercase tracking-wider mb-1">Speed</span>
                <span className="font-display font-bold text-lg">{telemetry.current_speed_kmh} km/h</span>
              </div>
              <div className="flex flex-col border-l border-slate-200 pl-4">
                <span className="text-[10px] font-bold text-tn-text-muted uppercase tracking-wider mb-1">Distance</span>
                <span className="font-display font-bold text-lg">{telemetry.distance_km} km</span>
              </div>
              <div className="flex flex-col border-l border-slate-200 pl-4">
                <span className="text-[10px] font-bold text-tn-text-muted uppercase tracking-wider mb-1">ETA</span>
                <span className="font-display font-bold text-lg text-emerald-600">{telemetry.eta_minutes} min</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
