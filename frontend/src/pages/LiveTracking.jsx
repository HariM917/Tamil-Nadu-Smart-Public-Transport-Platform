import React, { useState, useEffect, useRef } from 'react';
import { apiService } from '../services/api';
import { MapPin, Search, Compass, Navigation, Loader2, RefreshCw } from 'lucide-react';
// Leaflet imports
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet marker icon asset paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom component to dynamically pan map view
function ChangeView({ center, zoom }) {
  const map = useMap();
  map.setView(center, zoom);
  return null;
}

export default function LiveTracking() {
  const [query, setQuery] = useState('');
  const [buses, setBuses] = useState([]);
  const [selectedBus, setSelectedBus] = useState(null);
  
  const [trackingInfo, setTrackingInfo] = useState(null);
  const [mapCenter, setMapCenter] = useState([13.0827, 80.2707]); // Default Chennai
  const [mapZoom, setMapZoom] = useState(11);
  
  const [loading, setLoading] = useState(false);
  const [pollingActive, setPollingActive] = useState(false);
  const pollIntervalRef = useRef(null);

  // Load all active buses on mount
  useEffect(() => {
    fetchBuses();
    return () => stopPolling();
  }, []);

  // Poll selected bus location
  useEffect(() => {
    if (selectedBus) {
      startPolling(selectedBus.id);
    } else {
      stopPolling();
    }
    return () => stopPolling();
  }, [selectedBus]);

  async function fetchBuses() {
    setLoading(true);
    try {
      const results = await apiService.listBuses();
      setBuses(results);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query) {
      fetchBuses();
      return;
    }
    setLoading(true);
    try {
      const results = await apiService.searchBusesByQuery(query);
      setBuses(results);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const startPolling = (busId) => {
    stopPolling();
    setPollingActive(true);
    
    // Immediate track step
    trackStep(busId);
    
    // Poll every 4 seconds
    pollIntervalRef.current = setInterval(() => {
      trackStep(busId);
    }, 4000);
  };

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    setPollingActive(false);
  };

  const trackStep = async (busId) => {
    try {
      const data = await apiService.trackBus(busId);
      
      // Update selected bus info (contains simulated lat/lng step movement)
      setTrackingInfo(data.tracking);
      
      const newLat = data.bus.current_lat || 13.0827;
      const newLng = data.bus.current_lng || 80.2707;
      
      setMapCenter([newLat, newLng]);
      setMapZoom(13);
    } catch (err) {
      console.error('Tracking step failed:', err);
    }
  };

  const selectBusHandler = (bus) => {
    setSelectedBus(bus);
    const lat = bus.current_lat || 13.0827;
    const lng = bus.current_lng || 80.2707;
    setMapCenter([lat, lng]);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="font-display font-bold text-3xl text-white flex items-center gap-2">
          <MapPin className="h-8 w-8 text-blue-500" />
          <span>Real-Time GPS Bus Tracking</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Monitor transit vehicles moving along highways and calculate dynamic destination ETAs.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 min-h-[550px]">
        {/* Left panel: Search & Bus List */}
        <div className="lg:col-span-1 glass-panel p-5 rounded-2xl flex flex-col gap-4 max-h-[600px] overflow-y-auto">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              placeholder="Search bus or route..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#0c102b] border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          </form>

          {loading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
            </div>
          ) : (
            <div className="space-y-3 flex-grow overflow-y-auto">
              {buses.map((bus) => (
                <div
                  key={bus.id}
                  onClick={() => selectBusHandler(bus)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-200 ${
                    selectedBus?.id === bus.id ? 'border-blue-500/50 bg-blue-500/5' : 'border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white font-mono">{bus.bus_number}</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-semibold border capitalize ${
                      bus.status === 'running' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-slate-800 border-white/5 text-slate-400'
                    }`}>
                      {bus.status}
                    </span>
                  </div>
                  <h4 className="text-[11px] font-medium text-slate-300 mt-2 truncate">{bus.bus_name || bus.route_name}</h4>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Center / Right: Map & Stats */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          {/* Map area */}
          <div className="relative w-full h-[400px] rounded-2xl overflow-hidden border border-white/10 bg-slate-950 shadow-glass">
            <MapContainer 
              center={mapCenter} 
              zoom={mapZoom} 
              style={{ width: '100%', height: '100%' }}
              zoomControl={true}
            >
              <ChangeView center={mapCenter} zoom={mapZoom} />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {/* Render selected bus marker */}
              {selectedBus && (
                <Marker position={mapCenter}>
                  <Popup>
                    <div className="text-xs space-y-1">
                      <p className="font-bold">{selectedBus.bus_name || selectedBus.bus_number}</p>
                      <p className="text-slate-400">Route: {selectedBus.source} to {selectedBus.destination}</p>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Render intermediate route stops if available */}
              {selectedBus?.stops && selectedBus.stops.map((stop, idx) => (
                <Marker 
                  key={idx} 
                  position={[parseFloat(stop.lat), parseFloat(stop.lng)]}
                  icon={new L.DivIcon({
                    html: `<div class="h-3 w-3 bg-indigo-500 rounded-full border-2 border-white"></div>`,
                    className: 'dummy-stop-icon',
                    iconSize: [12, 12]
                  })}
                >
                  <Popup>
                    <div className="text-xs font-semibold">{stop.name}</div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>

            {pollingActive && (
              <div className="absolute top-4 right-4 z-[400] px-3 py-1.5 rounded-full bg-blue-600/90 border border-blue-500 text-[10px] font-bold text-white flex items-center gap-1.5 shadow-neon">
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span>Simulating Live Movement</span>
              </div>
            )}
          </div>

          {/* Stats Bar */}
          {selectedBus && trackingInfo && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-5 rounded-2xl glass-panel text-xs">
              <div className="space-y-1">
                <span className="text-slate-500 flex items-center gap-1">
                  <Navigation className="h-3.5 w-3.5 text-blue-500" />
                  <span>Telemetry Speed</span>
                </span>
                <p className="text-base font-bold text-white">{trackingInfo.current_speed_kmh} km/h</p>
              </div>

              <div className="space-y-1">
                <span className="text-slate-500 flex items-center gap-1">
                  <Compass className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Compass Heading</span>
                </span>
                <p className="text-base font-bold text-white capitalize">{selectedBus.heading ? `${selectedBus.heading.toFixed(0)}°` : 'N/A'}</p>
              </div>

              <div className="space-y-1">
                <span className="text-slate-500 flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Distance Left</span>
                </span>
                <p className="text-base font-bold text-white">{trackingInfo.distance_km} km</p>
              </div>

              <div className="space-y-1">
                <span className="text-slate-500 flex items-center gap-1 text-emerald-400">
                  <RefreshCw className="h-3.5 w-3.5 text-emerald-400 animate-spin" />
                  <span>Predicted ETA</span>
                </span>
                <p className="text-base font-extrabold text-emerald-400">{trackingInfo.eta_minutes} mins</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
