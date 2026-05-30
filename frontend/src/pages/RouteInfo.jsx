import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '../services/api';
import GoogleMapView from '../components/maps/GoogleMapView';
import { Bus, MapPin, Search, Clock, Navigation2, Compass, AlertCircle, Loader2 } from 'lucide-react';

export default function RouteInfo() {
  const [routesList, setRoutesList] = useState([]);
  const [allRoutes, setAllRoutes] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  
  // Search state
  const [sourceInput, setSourceInput] = useState('');
  const [destInput, setDestInput] = useState('');
  const [selectedRouteDropdown, setSelectedRouteDropdown] = useState('');

  // Results state
  const [searched, setSearched] = useState(false);
  const [recommendedRoutes, setRecommendedRoutes] = useState([]);
  const [selectedRouteIdx, setSelectedRouteIdx] = useState(-1);

  useEffect(() => {
    loadRoutes();
  }, []);

  const loadRoutes = async () => {
    try {
      const list = await apiService.listRoutes();
      setAllRoutes(list);
      setRoutesList(list.map((r) => r.route_no).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })));
    } catch (err) {
      console.error('Failed to load routes', err);
    }
  };

  const mapApiResult = (r) => ({
    route_number: r.route_no,
    source: r.source_stop,
    destination: r.destination_stop,
    stopsCount: r.stops_count,
    travelTime: r.eta_minutes,
    distanceKm: r.distance_km,
    fullStops: (r.stops || []).map((s) => ({ name: s.name, lat: s.lat, lng: s.lng, order: s.order })),
  });

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!sourceInput || !destInput) return;
    setSelectedRouteDropdown('');
    setSearched(true);
    setSearchLoading(true);
    try {
      const data = await apiService.searchRoutes(sourceInput, destInput);
      const results = data.map(mapApiResult);
      setRecommendedRoutes(results);
      setSelectedRouteIdx(results.length > 0 ? 0 : -1);
    } catch (err) {
      console.error(err);
      setRecommendedRoutes([]);
      setSelectedRouteIdx(-1);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleDropdownSelect = (routeNo) => {
    setSelectedRouteDropdown(routeNo);
    if (!routeNo) return;
    setSourceInput('');
    setDestInput('');
    setSearched(true);
    const route = allRoutes.find((r) => r.route_no === routeNo);
    if (!route) {
      setRecommendedRoutes([]);
      setSelectedRouteIdx(-1);
      return;
    }
    const fullStops = (route.stops || []).map((s) => ({ name: s.name, lat: s.lat, lng: s.lng }));
    let distance = 0;
    for (let i = 0; i < fullStops.length - 1; i++) {
      const a = fullStops[i];
      const b = fullStops[i + 1];
      const R = 6371;
      const dLat = ((b.lat - a.lat) * Math.PI) / 180;
      const dLon = ((b.lng - a.lng) * Math.PI) / 180;
      const x =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
      let segmentDist = R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
      
      // If segment is > 10km, it's likely a jump to a dummy coordinate (13.0, 80.0). Cap it to 1.5km.
      if (segmentDist > 10) {
        segmentDist = 1.5;
      }
      distance += segmentDist;
    }
    setRecommendedRoutes([
      {
        route_number: route.route_no,
        source: route.origin,
        destination: route.destination,
        stopsCount: fullStops.length,
        travelTime: Math.max(10, (fullStops.length - 1) * 4),
        distanceKm: parseFloat(distance.toFixed(1)),
        fullStops,
      },
    ]);
    setSelectedRouteIdx(0);
  };

  const activeRoute = selectedRouteIdx !== -1 ? recommendedRoutes[selectedRouteIdx] : null;

  const mapMarkers = useMemo(() => {
    if (!activeRoute?.fullStops) return [];
    return activeRoute.fullStops.map((stop, idx) => ({
      id: `stop-${idx}`,
      lat: stop.lat,
      lng: stop.lng,
      title: stop.name,
      icon: idx === 0 ? 'start' : idx === activeRoute.fullStops.length - 1 ? 'end' : 'stop',
    }));
  }, [activeRoute]);

  const mapPolylines = useMemo(() => {
    if (!activeRoute?.fullStops?.length) return [];
    return [{ path: activeRoute.fullStops.map((s) => ({ lat: s.lat, lng: s.lng })), color: '#2563eb', weight: 4 }];
  }, [activeRoute]);

  const fitBounds = useMemo(
    () => activeRoute?.fullStops?.map((s) => ({ lat: s.lat, lng: s.lng })) || null,
    [activeRoute]
  );

  return (
    <div className="w-full bg-[#f8fafc] flex flex-col min-h-[calc(100vh-4rem)]">
      {/* Top Header Panel */}
      <div className="bg-[#d92c2c] text-white text-xs font-semibold py-2.5 px-4 flex flex-wrap justify-between items-center border-b-4 border-yellow-400">
        <div className="flex gap-4">
          <span className="hover:underline cursor-pointer">ABOUT US</span>
          <span>|</span>
          <Link to="/fares" className="hover:underline cursor-pointer">FARE LIST</Link>
          <span>|</span>
          <span className="hover:underline cursor-pointer">CONCESSION FARES</span>
          <span>|</span>
          <span className="hover:underline cursor-pointer">BUS INFO</span>
        </div>
        <div className="text-[11px] font-mono">Toll Free Help: 149</div>
      </div>

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6 flex-grow w-full flex flex-col min-h-0">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-black text-[#d92c2c] uppercase tracking-wide flex items-center justify-center gap-2">
            <Compass className="h-7 w-7 text-[#d92c2c]" />
            Route Planner & Search
          </h1>
          <p className="text-sm text-slate-500 font-medium">Find stage-by-stage route connections and estimate distance & travel times.</p>
        </div>

        {/* Route Select Form */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 w-full md:w-auto flex-grow">
            <div className="relative flex-grow">
              <input
                type="text"
                placeholder="Enter Source Stop (e.g. Royapuram)"
                value={sourceInput}
                onChange={(e) => setSourceInput(e.target.value)}
                className="form-input !pl-10 text-sm"
                required
              />
              <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-emerald-600" />
            </div>

            <div className="relative flex-grow">
              <input
                type="text"
                placeholder="Enter Destination Stop (e.g. Poonamallee)"
                value={destInput}
                onChange={(e) => setDestInput(e.target.value)}
                className="form-input !pl-10 text-sm"
                required
              />
              <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-red-600" />
            </div>

            <button
              type="submit"
              disabled={searchLoading}
              className="bg-[#d92c2c] text-white px-6 py-3 rounded-xl text-sm font-bold shadow hover:bg-red-700 transition-all flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-60"
            >
              {searchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span>{searchLoading ? 'Searching…' : 'Search Routes'}</span>
            </button>
          </form>

          <div className="w-full md:w-px h-px md:h-8 bg-slate-200 self-center shrink-0" />

          <div className="flex items-center gap-3 w-full md:w-auto justify-end shrink-0">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Direct Select:</span>
            <select
              value={selectedRouteDropdown}
              onChange={(e) => handleDropdownSelect(e.target.value)}
              className="form-select max-w-[150px] !py-2.5 !px-3 text-sm font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <option value="">-- Choose Route --</option>
              {routesList.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Display Panel */}
        {searched ? (
          recommendedRoutes.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-grow">
              
              {/* Left Column: Recommendations & Stop List (4 cols) */}
              <div className="lg:col-span-4 space-y-4 flex flex-col max-h-[65vh] lg:max-h-[70vh] overflow-hidden">
                <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col overflow-hidden h-full">
                  <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-3 pb-2 border-b">Recommended Routes</h3>
                  
                  {/* Recommended Routes Cards list */}
                  <div className="space-y-2 overflow-y-auto pr-1 flex-shrink-0 max-h-48">
                    {recommendedRoutes.map((route, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedRouteIdx(idx)}
                        className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex justify-between items-center ${
                          selectedRouteIdx === idx
                            ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="space-y-1">
                          <span className="font-bold text-sm text-slate-800 font-mono">Route {route.route_number}</span>
                          <div className="text-slate-500 font-medium">
                            {route.source} → {route.destination}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-bold text-blue-600 block">{route.travelTime} mins</span>
                          <span className="text-slate-400 font-semibold block text-[10px]">{route.stopsCount} stops ({route.distanceKm} km)</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Vertical Stops Timeline */}
                  {activeRoute && (
                    <div className="flex-grow overflow-y-auto mt-4 pt-3 border-t">
                      <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider mb-4 px-1">Route Stop Sequence:</h4>
                      <div className="relative pl-6 border-l-2 border-slate-200 space-y-5 py-1 ml-3.5">
                        {activeRoute.fullStops.map((stop, idx) => (
                          <div key={idx} className="relative flex items-center gap-3">
                            <div className={`absolute -left-[31px] w-4.5 h-4.5 rounded-full flex items-center justify-center text-[8px] font-bold border-2 border-white shadow-sm ${
                              idx === 0 
                                ? 'bg-emerald-600 text-white' 
                                : idx === activeRoute.fullStops.length - 1 
                                  ? 'bg-red-600 text-white' 
                                  : 'bg-blue-600 text-white'
                            }`}>
                              {idx + 1}
                            </div>
                            <span className="font-semibold text-xs text-slate-700 uppercase tracking-wide truncate">
                              {stop.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Details Metrics & Leaflet Map (8 cols) */}
              <div className="lg:col-span-8 space-y-4 h-full flex flex-col">
                {activeRoute && (
                  <>
                    {/* Metrics Stats Banner */}
                    <div className="grid grid-cols-3 gap-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm text-center">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Recommended Route</span>
                        <div className="flex items-center justify-center gap-1">
                          <Bus className="h-5 w-5 text-blue-600" />
                          <span className="font-mono font-black text-xl text-slate-800">{activeRoute.route_number}</span>
                        </div>
                      </div>
                      <div className="border-l border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Est. Travel Time</span>
                        <div className="flex items-center justify-center gap-1">
                          <Clock className="h-5 w-5 text-emerald-600" />
                          <span className="font-display font-black text-xl text-emerald-600">{activeRoute.travelTime} mins</span>
                        </div>
                      </div>
                      <div className="border-l border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Total Distance</span>
                        <div className="flex items-center justify-center gap-1">
                          <Navigation2 className="h-5 w-5 text-blue-500 rotate-45" />
                          <span className="font-display font-black text-xl text-slate-800">{activeRoute.distanceKm} km</span>
                        </div>
                      </div>
                    </div>

                    <div className="border-2 border-slate-200/80 rounded-2xl overflow-hidden relative shadow-sm h-[400px] lg:h-[450px]">
                      <GoogleMapView
                        zoom={12}
                        markers={mapMarkers}
                        polylines={mapPolylines}
                        fitBounds={fitBounds}
                        className="h-full w-full"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-16 px-4 bg-white border border-slate-200 rounded-2xl max-w-md mx-auto shadow-sm flex flex-col items-center">
              <AlertCircle className="h-10 w-10 text-amber-500 mb-3 animate-pulse" />
              <h3 className="font-display font-bold text-slate-800 text-base">No Route Connections Found</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Could not find any routes connecting "{sourceInput}" to "{destInput}". Please verify the stop names or try another stage lookup.
              </p>
            </div>
          )
        ) : (
          <div className="text-center py-20 bg-white border border-slate-200 rounded-2xl shadow-sm border-dashed">
            <Bus className="h-12 w-12 text-slate-300 mx-auto mb-3 animate-bounce" />
            <h3 className="font-display font-bold text-slate-700 text-sm">Enter Source & Destination</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              Plan your travel by entering stage stops above or select a route directly from the MTC list to visualize it on the map.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
