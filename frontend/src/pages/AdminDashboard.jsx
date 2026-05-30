import React, { useState, useEffect, useRef, useMemo } from 'react';
import { apiService } from '../services/api';
import GoogleMapView from '../components/maps/GoogleMapView';
import { Users, Bus, Award, CheckCircle, XCircle, Eye, TrendingUp, ShieldAlert, Zap, BarChart3 } from 'lucide-react';
import { useToast } from '../components/ToastProvider';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from 'recharts';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('passes'); // passes, users, buses, analytics, ai_predictions
  const [data, setData] = useState({ passes: [], users: [], buses: [], analytics: null });
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const [selectedPass, setSelectedPass] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [passStatusFilter, setPassStatusFilter] = useState('');

  const [adminSelectedBus, setAdminSelectedBus] = useState(null);
  const [adminTelemetry, setAdminTelemetry] = useState(null);
  const adminInterval = useRef(null);

  // AI predictions states
  const [selectedPredictionRoute, setSelectedPredictionRoute] = useState('102');
  const [targetTime, setTargetTime] = useState('morning');
  const [predictedOccupancy, setPredictedOccupancy] = useState(82);
  const [peakHours, setPeakHours] = useState('8:00 AM - 10:00 AM');
  const [demandLevel, setDemandLevel] = useState('High');

  useEffect(() => {
    fetchData();
    return () => clearInterval(adminInterval.current);
  }, [activeTab, passStatusFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'passes') {
        const [passes, analytics] = await Promise.all([
          apiService.adminGetPasses(passStatusFilter),
          apiService.adminGetAnalytics().catch(() => null),
        ]);
        setData(prev => ({ ...prev, passes, analytics }));
      } else if (activeTab === 'users') {
        const users = await apiService.adminGetUsers();
        setData(prev => ({ ...prev, users }));
      } else if (activeTab === 'buses' || activeTab === 'ai_predictions') {
        const buses = await apiService.listBuses();
        setData(prev => ({ ...prev, buses }));
      } else if (activeTab === 'analytics') {
        const analytics = await apiService.adminGetAnalytics().catch(() => null);
        setData(prev => ({ ...prev, analytics }));
      }
    } catch (err) {
      toast.error('Failed to load ' + activeTab);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (status) => {
    if (!selectedPass) return;
    try {
      await apiService.adminReviewPass(selectedPass.id, { status, admin_remarks: reviewNotes });
      toast.success(`Pass ${status} successfully`);
      setSelectedPass(null);
      setReviewNotes('');
      fetchData();
    } catch (err) {
      toast.error('Review failed: ' + err.message);
    }
  };

  const adminSelectBus = async (bus) => {
    setAdminSelectedBus(bus);
    clearInterval(adminInterval.current);
    try {
      const data = await apiService.trackBus(bus.id);
      setAdminTelemetry(data.tracking);
      
      // Poll every 5 seconds
      adminInterval.current = setInterval(async () => {
        try {
          const tick = await apiService.trackBus(bus.id);
          setAdminTelemetry(tick.tracking);
          setAdminSelectedBus(prev => {
            if (prev?.id === bus.id) {
              return {
                ...prev,
                current_lat: tick.tracking.current_lat,
                current_lng: tick.tracking.current_lng,
                current_speed: tick.tracking.current_speed_kmh
              };
            }
            return prev;
          });
        } catch (e) {
          console.error('Admin tracking tick failed', e);
        }
      }, 5000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCalculateForecast = () => {
    let base = 50;
    if (selectedPredictionRoute === '102') base = 78;
    else if (selectedPredictionRoute === '101CT') base = 68;
    else if (selectedPredictionRoute === '101') base = 60;
    else if (selectedPredictionRoute === '102CT') base = 55;

    let timeModifier = 0;
    let peaks = '8:00 AM - 10:00 AM';
    let demand = 'High';
    if (targetTime === 'morning') {
      timeModifier = 10;
      peaks = '8:00 AM - 10:00 AM';
      demand = 'High';
    } else if (targetTime === 'afternoon') {
      timeModifier = -18;
      peaks = '1:30 PM - 3:00 PM';
      demand = 'Medium';
    } else if (targetTime === 'evening') {
      timeModifier = 14;
      peaks = '5:00 PM - 7:00 PM';
      demand = 'Critical';
    }

    const finalVal = Math.min(96, Math.max(25, base + timeModifier + Math.floor(Math.random() * 5)));
    setPredictedOccupancy(finalVal);
    setPeakHours(peaks);
    setDemandLevel(finalVal > 80 ? 'Critical' : finalVal > 60 ? 'High' : 'Medium');
  };

  const adminMapMarkers = useMemo(() => {
    if (!adminSelectedBus) return [];
    const list = [];
    if (adminSelectedBus.stops?.length) {
      adminSelectedBus.stops.forEach((stop, idx) => {
        list.push({
          id: `adm-stop-${idx}`,
          lat: stop.lat,
          lng: stop.lng,
          title: stop.name,
          icon: 'stop',
        });
      });
    }
    const lat = adminTelemetry?.current_lat ?? adminSelectedBus.current_lat;
    const lng = adminTelemetry?.current_lng ?? adminSelectedBus.current_lng;
    if (lat && lng) {
      list.push({ id: 'adm-bus', lat, lng, title: adminSelectedBus.bus_number, icon: 'bus' });
    }
    return list;
  }, [adminSelectedBus, adminTelemetry]);

  const adminMapPolylines = useMemo(() => {
    if (!adminSelectedBus?.stops?.length) return [];
    return [{ path: adminSelectedBus.stops.map((s) => ({ lat: s.lat, lng: s.lng })), color: '#059669', weight: 3 }];
  }, [adminSelectedBus]);

  const adminFitBounds = useMemo(
    () => adminSelectedBus?.stops?.map((s) => ({ lat: s.lat, lng: s.lng })) || null,
    [adminSelectedBus]
  );

  const tabs = [
    { id: 'passes', label: 'Pass Approvals', icon: Award },
    { id: 'buses', label: 'Fleet Map', icon: Bus },
    { id: 'users', label: 'User Directory', icon: Users },
    { id: 'analytics', label: 'System Analytics', icon: BarChart3 },
    { id: 'ai_predictions', label: 'AI Predictions', icon: Zap },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex-shrink-0 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-fade-in">
        <div>
          <h1 className="section-title text-tn-primary">Officer Portal</h1>
          <p className="section-subtitle">Manage operations, live fleet tracking, and approve digital passes.</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm flex-wrap gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === tab.id 
                  ? 'bg-tn-primary text-white shadow-sm' 
                  : 'text-tn-text-secondary hover:text-tn-text hover:bg-slate-50'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {tab.id === 'ai_predictions' && (
                <span className="bg-amber-400 text-[9px] font-black text-slate-900 px-1 py-0.5 rounded-md leading-none tracking-wide ml-1 uppercase animate-pulse">
                  AI
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-grow glass-panel rounded-2xl overflow-hidden flex flex-col min-h-0 animate-fade-in-up">
        
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin h-8 w-8 border-4 border-tn-primary border-t-transparent rounded-full" />
              <p className="text-sm font-medium text-tn-text-secondary">Loading data...</p>
            </div>
          </div>
        ) : (
          <div className="flex-grow overflow-auto p-0">
            
            {/* ── PASSES TAB ── */}
            {activeTab === 'passes' && (
              <div className="p-4 space-y-4">
                {data.analytics?.stats && (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {[
                      { label: 'Pending', value: data.analytics.stats.pending_approvals, color: 'text-amber-600' },
                      { label: 'Approved', value: data.analytics.stats.approved_passes, color: 'text-emerald-600' },
                      { label: 'Rejected', value: data.analytics.stats.rejected_applications, color: 'text-red-600' },
                      { label: 'Active Passes', value: data.analytics.stats.active_passes, color: 'text-blue-600' },
                      { label: 'Avg Verification', value: `${data.analytics.stats.avg_verification_score}%`, color: 'text-tn-primary' },
                    ].map((k) => (
                      <div key={k.label} className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                        <p className="text-[10px] font-bold text-tn-text-muted uppercase">{k.label}</p>
                        <p className={`text-xl font-black ${k.color}`}>{k.value ?? 0}</p>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {['', 'pending', 'approved', 'rejected'].map((s) => (
                    <button
                      key={s || 'all'}
                      type="button"
                      onClick={() => setPassStatusFilter(s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                        passStatusFilter === s ? 'bg-tn-primary text-white border-tn-primary' : 'bg-white border-slate-200'
                      }`}
                    >
                      {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All'}
                    </button>
                  ))}
                </div>
                <table className="data-table">
                  <thead className="sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th>ID</th>
                      <th>Applicant</th>
                      <th>Pass Type</th>
                      <th>Verification</th>
                      <th>ML Status</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.passes.length === 0 ? (
                      <tr><td colSpan="7" className="text-center py-8 text-tn-text-secondary">No passes found.</td></tr>
                    ) : data.passes.map((pass) => (
                      <tr key={pass.id}>
                        <td className="font-mono text-xs">#{pass.id}</td>
                        <td className="font-semibold">
                          <div>{pass.user?.full_name || `User #${pass.user_id}`}</div>
                          <div className="text-[10px] text-tn-text-secondary font-mono">{pass.ocr_aadhaar || '—'}</div>
                        </td>
                        <td>
                          <span className="capitalize block">{pass.category.replace('_', ' ')}</span>
                          <span className="text-[10px] text-tn-text-muted">{pass.pass_type}</span>
                        </td>
                        <td>
                          <span className="font-bold text-sm">{pass.verification_score ?? 0}%</span>
                          <span className="block text-[10px] text-tn-text-muted">{pass.ml_verification_status}</span>
                        </td>
                        <td>
                          <span className={`badge ${pass.fraud_risk_score >= 0.5 ? 'badge-danger' : 'badge-success'}`}>
                            {pass.fraud_risk_score >= 0.5 ? 'FLAGGED' : 'LOW'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${pass.status === 'pending' ? 'badge-warning' : pass.status === 'approved' ? 'badge-success' : 'badge-danger'}`}>
                            {pass.status}
                          </span>
                        </td>
                        <td>
                          <button onClick={() => setSelectedPass(pass)} className="p-1.5 text-tn-primary hover:bg-tn-primary/10 rounded-lg">
                            <Eye className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── USERS TAB ── */}
            {activeTab === 'users' && (
              <table className="data-table">
                <thead className="sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Contact</th>
                    <th>Aadhaar Number</th>
                    <th>Verified</th>
                    <th>Role</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.map(u => (
                    <tr key={u.id}>
                      <td className="font-mono text-xs">#{u.id}</td>
                      <td className="font-semibold">{u.full_name}</td>
                      <td className="text-xs text-tn-text-secondary">{u.email || u.phone}</td>
                      <td className="font-mono text-xs">{u.aadhaar_number || 'Not Submitted'}</td>
                      <td>
                        <span className={`badge ${u.aadhaar_verified ? 'badge-success' : 'badge-warning'}`}>
                          {u.aadhaar_verified ? 'Verified' : 'Unverified'}
                        </span>
                      </td>
                      <td><span className={`badge ${u.role === 'admin' ? 'badge-purple' : 'badge-info'}`}>{u.role}</span></td>
                      <td className="text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* ── FLEET TAB (With Live Map) ── */}
            {activeTab === 'buses' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 h-[calc(100vh-12rem)] min-h-0">
                {/* List Panel */}
                <div className="lg:col-span-1 flex flex-col gap-4 overflow-hidden h-full">
                  <h3 className="text-xs font-bold text-tn-text-muted uppercase tracking-wider mb-2">Fleet Management</h3>
                  <div className="overflow-y-auto flex-grow space-y-2 pr-1">
                    {data.buses.map(b => (
                      <button
                        key={b.id}
                        onClick={() => adminSelectBus(b)}
                        className={`w-full text-left p-3 rounded-xl border transition-all ${
                          adminSelectedBus?.id === b.id
                            ? 'border-tn-primary bg-tn-primary/5 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-sm text-tn-text font-mono">{b.bus_number}</span>
                          <span className={`badge ${b.status === 'running' ? 'badge-success' : 'badge-warning'} !px-1.5 !py-0.5 text-[9px]`}>
                            {b.status}
                          </span>
                        </div>
                        <div className="text-xs text-tn-text-secondary truncate">
                          {b.source} → {b.destination}
                        </div>
                        <div className="text-[10px] text-tn-text-muted mt-1 flex justify-between">
                          <span>Driver: {b.driver_name || 'Unassigned'}</span>
                          <span>Speed: {b.current_speed || 0} km/h</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Map & Live Details */}
                <div className="lg:col-span-2 flex flex-col gap-4 h-full min-h-0">
                  <div className="glass-panel-elevated rounded-2xl flex-grow overflow-hidden relative border-2 border-slate-200 h-96">
                    {!adminSelectedBus ? (
                      <div className="absolute inset-0 bg-slate-50 flex flex-col items-center justify-center text-center p-6">
                        <Bus className="h-10 w-10 text-slate-300 mb-2 animate-bounce" />
                        <h4 className="font-bold text-tn-text-secondary">Select a Bus to Track</h4>
                        <p className="text-xs text-tn-text-muted max-w-xs mt-1">Click any active bus in the fleet list to initialize real-time GPS tracking maps.</p>
                      </div>
                    ) : (
                      <GoogleMapView
                        center={{
                          lat: adminTelemetry?.current_lat || adminSelectedBus.current_lat || 13.0827,
                          lng: adminTelemetry?.current_lng || adminSelectedBus.current_lng || 80.2707,
                        }}
                        zoom={13}
                        markers={adminMapMarkers}
                        polylines={adminMapPolylines}
                        fitBounds={adminFitBounds}
                        className="h-full w-full"
                      />
                    )}
                  </div>

                  {/* Upgraded Telemetry Panel */}
                  {adminSelectedBus && adminTelemetry && (
                    <div className="glass-panel p-4 rounded-xl grid grid-cols-2 sm:grid-cols-6 gap-4 flex-shrink-0 bg-slate-50 text-xs shadow-sm">
                      <div>
                        <span className="text-[9px] font-bold text-tn-text-muted uppercase tracking-wider block">GPS Status</span>
                        <div className="flex items-center gap-1 mt-0.5">
                          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="font-bold text-tn-text">Active</span>
                        </div>
                      </div>
                      <div className="border-l border-slate-200 pl-3">
                        <span className="text-[9px] font-bold text-tn-text-muted uppercase tracking-wider block">Current Stop</span>
                        <span className="font-bold text-slate-800 uppercase tracking-tight block truncate" title={adminTelemetry.current_stop}>{adminTelemetry.current_stop || "Unknown"}</span>
                      </div>
                      <div className="border-l border-slate-200 pl-3">
                        <span className="text-[9px] font-bold text-tn-text-muted uppercase tracking-wider block">Next Stop</span>
                        <span className="font-bold text-slate-800 uppercase tracking-tight block truncate" title={adminTelemetry.next_stop}>{adminTelemetry.next_stop || "Unknown"}</span>
                      </div>
                      <div className="border-l border-slate-200 pl-3">
                        <span className="text-[9px] font-bold text-tn-text-muted uppercase tracking-wider block">Speed</span>
                        <span className="font-bold text-slate-800 font-mono">{adminTelemetry.current_speed_kmh} km/h</span>
                      </div>
                      <div className="border-l border-slate-200 pl-3">
                        <span className="text-[9px] font-bold text-tn-text-muted uppercase tracking-wider block">Est. Arrival (ETA)</span>
                        <span className="font-bold text-emerald-600">{adminTelemetry.eta_minutes} mins</span>
                      </div>
                      <div className="border-l border-slate-200 pl-3">
                        <span className="text-[9px] font-bold text-tn-text-muted uppercase tracking-wider block">Driver</span>
                        <span className="font-bold text-slate-800 block truncate" title={adminSelectedBus.driver_name}>{adminSelectedBus.driver_name}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* ── SYSTEM ANALYTICS ── */}
            {activeTab === 'analytics' && data.analytics && (
              <div className="p-6 space-y-8 overflow-y-auto max-h-[75vh]">
                
                {/* Government Official dashboard KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="glass-panel p-5 border-t-4 border-t-blue-500 rounded-xl shadow-sm flex items-center justify-between">
                    <div>
                      <div className="text-tn-text-muted text-[10px] font-bold uppercase mb-1">Total Passes</div>
                      <div className="text-2xl font-black text-slate-800">{data.analytics.stats.total_passes}</div>
                    </div>
                    <Award className="h-8 w-8 text-blue-500/20" />
                  </div>
                  
                  <div className="glass-panel p-5 border-t-4 border-t-amber-500 rounded-xl shadow-sm flex items-center justify-between">
                    <div>
                      <div className="text-tn-text-muted text-[10px] font-bold uppercase mb-1">Pending Approvals</div>
                      <div className="text-2xl font-black text-amber-600">{data.analytics.stats.pending_approvals}</div>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-amber-500/20" />
                  </div>

                  <div className="glass-panel p-5 border-t-4 border-t-red-500 rounded-xl shadow-sm flex items-center justify-between">
                    <div>
                      <div className="text-tn-text-muted text-[10px] font-bold uppercase mb-1">Rejected Apps</div>
                      <div className="text-2xl font-black text-red-600">{data.analytics.stats.rejected_applications}</div>
                    </div>
                    <XCircle className="h-8 w-8 text-red-500/20" />
                  </div>

                  <div className="glass-panel p-5 border-t-4 border-t-emerald-500 rounded-xl shadow-sm flex items-center justify-between">
                    <div>
                      <div className="text-tn-text-muted text-[10px] font-bold uppercase mb-1">Active Routes</div>
                      <div className="text-2xl font-black text-slate-800">{data.analytics.stats.active_routes}</div>
                    </div>
                    <Bus className="h-8 w-8 text-emerald-500/20" />
                  </div>

                  <div className="glass-panel p-5 border-t-4 border-t-indigo-500 rounded-xl shadow-sm flex items-center justify-between col-span-2 lg:col-span-1">
                    <div>
                      <div className="text-tn-text-muted text-[10px] font-bold uppercase mb-1">Daily Bookings</div>
                      <div className="text-2xl font-black text-indigo-600">{data.analytics.stats.daily_bookings}</div>
                    </div>
                    <Ticket className="h-8 w-8 text-indigo-500/20" />
                  </div>
                </div>

                {/* Additional Stats: Users & Revenue */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 p-4 border border-slate-200/60 rounded-xl shadow-inner">
                  <div className="flex items-center justify-between px-6 py-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Registered Users</span>
                    <span className="text-xl font-bold font-mono text-slate-800">{data.analytics.stats.total_users} Users</span>
                  </div>
                  <div className="flex items-center justify-between px-6 py-2 border-t sm:border-t-0 sm:border-l border-slate-200">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Revenue Generated</span>
                    <span className="text-xl font-bold font-mono text-emerald-600">₹{(data.analytics.stats.total_revenue || 0).toLocaleString()}</span>
                  </div>
                </div>

                {/* Grid 1: Daily load trends */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Daily User Registrations Trend */}
                  <div className="glass-panel p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                    <h3 className="text-xs font-bold text-tn-text-secondary uppercase tracking-wider mb-4">Daily Registrations Trend (Last 7 Days)</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={data.analytics.weekly_users}
                          margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                        >
                          <defs>
                            <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Area type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" name="New Users" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Weekly Booking Load */}
                  <div className="glass-panel p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                    <h3 className="text-xs font-bold text-tn-text-secondary uppercase tracking-wider mb-4">Weekly Ticket Booking Load</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={data.analytics.weekly_bookings}
                          margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                        >
                          <defs>
                            <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Area type="monotone" dataKey="bookings" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorBookings)" name="Booked Tickets" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Grid 2: Distribution & Routes */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Pass Type Distribution (Monthly, Quarterly, Annual) */}
                  <div className="glass-panel p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                    <h3 className="text-xs font-bold text-tn-text-secondary uppercase tracking-wider mb-4">Pass Type Duration Distribution</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={Object.keys(data.analytics.pass_type_distribution || {}).map(k => ({
                            type: k.charAt(0).toUpperCase() + k.slice(1),
                            count: data.analytics.pass_type_distribution[k]
                          }))}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="type" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="count" fill="#4f46e5" name="Count" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Popular Routes */}
                  <div className="glass-panel p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                    <h3 className="text-xs font-bold text-tn-text-secondary uppercase tracking-wider mb-4">Popular Routes (Passenger Bookings Volume)</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={data.analytics.popular_routes}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="route" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="count" fill="#ec4899" name="Bookings Count" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Pass Category Breakdown */}
                  <div className="glass-panel p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                    <h3 className="text-xs font-bold text-tn-text-secondary uppercase tracking-wider mb-4">Pass Category Breakdown</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={Object.keys(data.analytics.pass_category_distribution).map(k => ({
                            category: k.charAt(0).toUpperCase() + k.slice(1).replace('_', ' '),
                            count: data.analytics.pass_category_distribution[k]
                          }))}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="category" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="count" fill="#eab308" name="Applications" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Recent Applications Log */}
                  <div className="glass-panel p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                    <h3 className="text-xs font-bold text-tn-text-secondary uppercase tracking-wider mb-4">Recent Registrations Log</h3>
                    <div className="overflow-auto max-h-64">
                      <table className="data-table !text-xs">
                        <thead>
                          <tr>
                            <th>Applicant</th>
                            <th>Category</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.analytics.recent_passes.map(p => (
                            <tr key={p.id}>
                              <td className="font-semibold">{p.user_name}</td>
                              <td className="capitalize">{p.category.replace('_', ' ')}</td>
                              <td>
                                <span className={`badge ${p.status === 'approved' ? 'badge-success' : p.status === 'pending' ? 'badge-warning' : 'badge-danger'}`}>
                                  {p.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── AI PREDICTIONS TAB ── */}
            {activeTab === 'ai_predictions' && (
              <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)] min-h-0 items-start overflow-y-auto">
                
                {/* Control Panel: Route Occupancy Predicter */}
                <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-6">
                  <div className="space-y-1">
                    <h3 className="font-display font-bold text-slate-800 text-base flex items-center gap-1.5">
                      <Zap className="h-5 w-5 text-amber-500 fill-amber-500" />
                      Passenger Prediction
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">Predict expected occupancy load using AI demand forecasting model.</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="form-label text-xs">Target Route</label>
                      <select
                        value={selectedPredictionRoute}
                        onChange={(e) => setSelectedPredictionRoute(e.target.value)}
                        className="form-select w-full text-xs py-2.5 font-semibold text-slate-700 bg-slate-50 border border-slate-200"
                      >
                        {data.buses.map(b => (
                          <option key={b.id} value={b.route_number || b.bus_number}>
                            Route {b.route_number || b.bus_number} — {b.source}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="form-label text-xs">Target Time Window</label>
                      <select
                        value={targetTime}
                        onChange={(e) => setTargetTime(e.target.value)}
                        className="form-select w-full text-xs py-2.5 font-semibold text-slate-700 bg-slate-50 border border-slate-200"
                      >
                        <option value="morning">Tomorrow Morning</option>
                        <option value="afternoon">Tomorrow Afternoon</option>
                        <option value="evening">Tomorrow Evening</option>
                      </select>
                    </div>

                    <button
                      onClick={handleCalculateForecast}
                      className="btn-primary w-full py-3 text-xs bg-tn-primary font-bold shadow hover:bg-red-700 flex items-center justify-center gap-1"
                    >
                      <Zap className="h-4 w-4" />
                      <span>Forecast Expected Occupancy</span>
                    </button>
                  </div>

                  {/* Occupancy Indicator details */}
                  <div className="border-t pt-5 space-y-4">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Expected Occupancy</span>
                      <div className="flex items-center gap-3 mt-1.5">
                        <div className="flex-grow bg-slate-100 h-3 rounded-full overflow-hidden border">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              predictedOccupancy > 80 
                                ? 'bg-red-500' 
                                : predictedOccupancy > 60 
                                  ? 'bg-amber-500' 
                                  : 'bg-emerald-500'
                            }`}
                            style={{ width: `${predictedOccupancy}%` }}
                          />
                        </div>
                        <span className={`text-xl font-extrabold shrink-0 ${
                          predictedOccupancy > 80 
                            ? 'text-red-600' 
                            : predictedOccupancy > 60 
                              ? 'text-amber-600' 
                              : 'text-emerald-600'
                        }`}>
                          {predictedOccupancy}%
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Peak Hour Detection</span>
                        <span className="font-bold text-slate-700 text-xs block mt-0.5">{peakHours}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Demand State</span>
                        <span className={`badge ${
                          demandLevel === 'Critical' 
                            ? 'badge-danger animate-pulse' 
                            : demandLevel === 'High' 
                              ? 'badge-warning' 
                              : 'badge-success'
                        } text-[10px] font-bold mt-0.5`}>
                          {demandLevel} Demand
                        </span>
                      </div>
                    </div>

                    {/* AI Recommendation Panel */}
                    <div className={`p-3.5 rounded-xl border text-[11px] font-medium leading-normal ${
                      predictedOccupancy > 80 
                        ? 'bg-red-50 border-red-200 text-red-800' 
                        : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    }`}>
                      <strong>AI Dispatch Advisory:</strong>{' '}
                      {predictedOccupancy > 80 
                        ? `Heavy congestion predicted. Recommendation: Deploy an extra support bus on Route ${selectedPredictionRoute} during ${peakHours} peak window.`
                        : `Normal traffic loads expected. Standard bus capacity schedules are optimal for this window.`
                      }
                    </div>
                  </div>
                </div>

                {/* AI Demand Factor & Peak Hour Charts */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Peak Hour Demand chart */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col">
                    <h3 className="text-xs font-bold text-tn-text-secondary uppercase tracking-wider mb-4 flex items-center gap-1">
                      <Clock className="h-4 w-4 text-tn-primary" /> Hourly Demand Prediction Load Profile
                    </h3>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={[
                            { hour: '6 AM', demand: 35 },
                            { hour: '8 AM', demand: 88 },
                            { hour: '10 AM', demand: 76 },
                            { hour: '12 PM', demand: 42 },
                            { hour: '2 PM', demand: 48 },
                            { hour: '4 PM', demand: 62 },
                            { hour: '6 PM', demand: 92 },
                            { hour: '8 PM', demand: 54 }
                          ]}
                          margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                          <XAxis dataKey="hour" />
                          <YAxis />
                          <Tooltip formatter={(value) => `${value}% Capacity`} />
                          <Bar 
                            dataKey="demand" 
                            fill="#f59e0b" 
                            name="Capacity Load Forecast" 
                            radius={[6, 6, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Popular Route Forecast Ranking */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <h3 className="text-xs font-bold text-tn-text-secondary uppercase tracking-wider mb-4 flex items-center gap-1">
                      <Compass className="h-4 w-4 text-blue-600" /> AI Forecast Demand Route Ranking
                    </h3>
                    <div className="space-y-2">
                      {[
                        { rank: 1, route: '102', description: 'ISLAND GROUND - KELAMBAKKAM', score: '94% Demand Factor', color: 'bg-red-500' },
                        { rank: 2, route: '101CT', description: 'ROYAPURAM B.S - POONAMALLEE', score: '82% Demand Factor', color: 'bg-amber-500' },
                        { rank: 3, route: '101', description: 'THIRUVOTRIYUR - POONAMALLEE', score: '75% Demand Factor', color: 'bg-amber-500' },
                        { rank: 4, route: '102CT', description: 'THIRUVANMIYUR - SIRUSERI I.T.PARK', score: '62% Demand Factor', color: 'bg-emerald-500' },
                        { rank: 5, route: '101X', description: 'ROYAPURAM B.S - THIRUMAZHISAI', score: '48% Demand Factor', color: 'bg-emerald-500' },
                      ].map((item) => (
                        <div key={item.rank} className="p-3 bg-slate-50 border rounded-xl flex items-center justify-between text-xs font-medium">
                          <div className="flex items-center gap-3">
                            <span className="font-black text-slate-400 w-4">{item.rank}.</span>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold bg-slate-200 text-slate-800 px-2 py-0.5 rounded text-[10px]">Route {item.route}</span>
                              <span className="text-slate-500 text-[10px] hidden sm:inline">{item.description}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-600 font-bold">{item.score}</span>
                            <div className={`w-2 h-2 rounded-full ${item.color}`} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selectedPass && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-display font-bold text-lg text-tn-text">Review Pass Application #{selectedPass.id}</h3>
              <button onClick={() => setSelectedPass(null)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Applicant Name details */}
              <div className="bg-emerald-55/50 p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex justify-between items-center text-xs">
                <div>
                  <p className="text-tn-text-muted font-bold uppercase">Applicant Name</p>
                  <p className="font-bold text-sm text-tn-text mt-0.5">{selectedPass.user?.full_name || `User #${selectedPass.user_id}`}</p>
                </div>
                <div className="text-right">
                  <p className="text-tn-text-muted font-bold uppercase">Contact</p>
                  <p className="font-medium text-tn-text mt-0.5">{selectedPass.user?.phone || selectedPass.user?.email || 'N/A'}</p>
                </div>
              </div>

              {/* AI Verification & Match Score */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <p className="text-[10px] text-tn-text-muted font-bold uppercase mb-1">Details</p>
                  <p className="font-bold text-sm capitalize">{selectedPass.category.replace('_', ' ')} Pass</p>
                  <p className="text-xs text-tn-text-secondary mt-1">Type: {selectedPass.pass_type}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <p className="text-[10px] text-tn-text-muted font-bold uppercase mb-1">AI Verification Level</p>
                  <p className="font-bold text-xs text-indigo-600 mt-1 uppercase tracking-wider">{selectedPass.verification_level || "Level 3 — Fraud Detection"}</p>
                  <p className="text-[10px] text-tn-text-secondary mt-0.5">Eligibility Match: {(selectedPass.ml_eligibility_score * 100).toFixed(0)}%</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <p className="text-[10px] text-tn-text-muted font-bold uppercase mb-1">Match Score</p>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className={`text-2xl font-extrabold ${(selectedPass.verification_score || 0) >= 80 ? 'text-emerald-600' : 'text-amber-500'}`}>
                      {(selectedPass.verification_score || 0)}%
                    </span>
                    <span className="text-[10px] text-tn-text-secondary font-semibold">Match</span>
                  </div>
                </div>
              </div>

              {/* Cross-Validation Table */}
              <div className="space-y-2">
                <p className="text-xs text-tn-text-muted font-bold uppercase">Cross-Validation Check</p>
                <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                  <table className="min-w-full divide-y divide-slate-100 text-xs">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">Field</th>
                        <th className="px-4 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">User Input</th>
                        <th className="px-4 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">OCR Extracted</th>
                        <th className="px-4 py-2 text-center font-bold text-slate-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                      <tr>
                        <td className="px-4 py-2.5 font-semibold text-slate-600">Name</td>
                        <td className="px-4 py-2.5 font-medium text-slate-900">{selectedPass.user?.full_name}</td>
                        <td className="px-4 py-2.5 font-mono text-slate-700">{selectedPass.ocr_name || "N/A"}</td>
                        <td className="px-4 py-2.5 text-center">
                          {selectedPass.ocr_name && selectedPass.user?.full_name && 
                           (selectedPass.ocr_name.toLowerCase().includes(selectedPass.user?.full_name.split(' ')[0].toLowerCase()) || 
                            selectedPass.user?.full_name.toLowerCase().includes(selectedPass.ocr_name.split(' ')[0].toLowerCase())) ? (
                            <Check className="h-4 w-4 text-emerald-600 mx-auto" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-red-500 mx-auto" />
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 font-semibold text-slate-600">DOB</td>
                        <td className="px-4 py-2.5 font-medium text-slate-900">
                          {selectedPass.user?.date_of_birth ? new Date(selectedPass.user.date_of_birth).toLocaleDateString('en-GB') : "N/A"}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-slate-700">{selectedPass.ocr_dob || "N/A"}</td>
                        <td className="px-4 py-2.5 text-center">
                          {selectedPass.ocr_dob && selectedPass.user?.date_of_birth &&
                           (selectedPass.ocr_dob.replace(/\//g, '-') === new Date(selectedPass.user.date_of_birth).toLocaleDateString('en-GB').replace(/\//g, '-').replace(/\b(\d)\b/g, '0$1') ||
                            selectedPass.ocr_dob.slice(-4) === new Date(selectedPass.user.date_of_birth).getFullYear().toString()) ? (
                            <Check className="h-4 w-4 text-emerald-600 mx-auto" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-red-500 mx-auto" />
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 font-semibold text-slate-600">Aadhaar</td>
                        <td className="px-4 py-2.5 font-medium text-slate-900">
                          {selectedPass.user?.aadhaar_number ? `XXXX XXXX ${selectedPass.user.aadhaar_number.slice(-4)}` : "Not Verified"}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-slate-700">{selectedPass.ocr_aadhaar || "N/A"}</td>
                        <td className="px-4 py-2.5 text-center">
                          {selectedPass.ocr_aadhaar && selectedPass.user?.aadhaar_number &&
                           selectedPass.ocr_aadhaar.slice(-4) === selectedPass.user.aadhaar_number.slice(-4) ? (
                            <Check className="h-4 w-4 text-emerald-600 mx-auto" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-red-500 mx-auto" />
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Multi-Document Verification Status (Level 5 — Student Pass Only) */}
              {selectedPass.category === 'student' && (
                <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-2 text-xs animate-fade-in">
                  <p className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider flex items-center gap-1">
                    <Shield className="h-3.5 w-3.5" /> Level 5 AI Multi-Document Verification Checks
                  </p>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm flex items-center justify-between">
                      <div>
                        <span className="text-slate-500 block text-[9px] font-medium uppercase">Aadhaar to College ID Match</span>
                        <span className="font-semibold text-slate-800">
                          {selectedPass.admin_remarks?.includes("Student Name Mismatch") ? "Name: Mismatch" : "Name Match: Verified"}
                        </span>
                      </div>
                      {selectedPass.admin_remarks?.includes("Student Name Mismatch") ? (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      ) : (
                        <Check className="h-4 w-4 text-emerald-600" />
                      )}
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm flex items-center justify-between">
                      <div>
                        <span className="text-slate-500 block text-[9px] font-medium uppercase">College ID to Bonafide Match</span>
                        <span className="font-semibold text-slate-800">
                          {selectedPass.admin_remarks?.includes("College Mismatch") ? "College: Mismatch" : "College & Name: Match"}
                        </span>
                      </div>
                      {selectedPass.admin_remarks?.includes("College Mismatch") ? (
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      ) : (
                        <Check className="h-4 w-4 text-emerald-600" />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Fraud Flags Alert Panel */}
              {(selectedPass.fraud_risk_score >= 0.5 || (selectedPass.admin_remarks && selectedPass.admin_remarks.includes("Flags:") || selectedPass.admin_remarks?.includes("Fraud:"))) && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2 text-red-800 animate-pulse-glow">
                  <p className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert className="h-4 w-4 text-red-600" /> Security & Fraud Detection Alert
                  </p>
                  <div className="text-xs space-y-1 pl-2 list-none font-medium">
                    {selectedPass.admin_remarks?.includes("Duplicate Aadhaar") && (
                      <p>• <strong>Duplicate Aadhaar Flagged:</strong> Aadhaar number has already been registered or used by another passenger.</p>
                    )}
                    {selectedPass.admin_remarks?.includes("Multiple Applications") && (
                      <p>• <strong>Multiple Applications Alert:</strong> Same Aadhaar is registered with a different mobile number.</p>
                    )}
                    {selectedPass.admin_remarks?.includes("Name Mismatch") && (
                      <p>• <strong>Identity Mismatch:</strong> Name extracted via OCR does not match passenger profile registration.</p>
                    )}
                    {selectedPass.admin_remarks?.includes("DOB Mismatch") && (
                      <p>• <strong>DOB Mismatch:</strong> Date of birth does not match government document record.</p>
                    )}
                    {selectedPass.admin_remarks?.includes("College Mismatch") && (
                      <p>• <strong>Institution Mismatch:</strong> Student card college name does not match bonafide certificate.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Uploaded Documents link */}
              <div>
                <p className="text-xs text-tn-text-muted font-bold uppercase mb-2">Uploaded Document Verification</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  {selectedPass.document_url && (
                    <a
                      href={`http://localhost:8000${selectedPass.document_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 p-3 rounded-xl border border-slate-200 hover:border-tn-primary bg-slate-50 flex items-center justify-between text-xs text-tn-text font-semibold transition-all hover:bg-slate-100"
                    >
                      <span>📄 View ID Card / Aadhaar</span>
                      <span className="text-[10px] text-tn-primary hover:underline">Open tab →</span>
                    </a>
                  )}
                  {selectedPass.category === 'student' && selectedPass.bonafide_url && (
                    <a
                      href={`http://localhost:8000${selectedPass.bonafide_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 p-3 rounded-xl border border-slate-200 hover:border-tn-primary bg-slate-50 flex items-center justify-between text-xs text-tn-text font-semibold transition-all hover:bg-slate-100"
                    >
                      <span>📄 View Bonafide Certificate</span>
                      <span className="text-[10px] text-tn-primary hover:underline">Open tab →</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Fraud detector details */}
              {selectedPass.fraud_risk_score !== undefined && (
                <div className={`p-4 rounded-xl border ${selectedPass.fraud_risk_score >= 0.5 ? 'bg-red-50 border-red-200 text-red-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'} space-y-2`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                      <Shield className="h-4 w-4" /> ML Fraud Risk Shield
                    </span>
                    <span className="text-sm font-bold">{(selectedPass.fraud_risk_score * 100).toFixed(0)}% Risk</span>
                  </div>
                  <p className="text-xs font-semibold">
                    {selectedPass.admin_remarks || (selectedPass.fraud_risk_score >= 0.5 ? "Flagged for manual officer verification." : "Passed initial machine learning scans.")}
                  </p>
                </div>
              )}
              
              <div>
                <p className="text-xs text-tn-text-muted font-bold uppercase mb-2">OCR Extracted Text (From ID Card)</p>
                <div className="bg-slate-900 text-emerald-400 font-mono text-xs p-4 rounded-xl h-32 overflow-y-auto">
                  {selectedPass.ocr_extracted_text || 'No text available'}
                </div>
              </div>
              
              <div>
                <label className="form-label">Officer Remarks</label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Enter rejection reason or approval notes..."
                  className="form-input !rounded-xl min-h-[80px] resize-none"
                />
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => handleReview('rejected')} className="btn-secondary !text-red-600 hover:!bg-red-50 hover:!border-red-200">
                Reject Application
              </button>
              <button onClick={() => handleReview('approved')} className="btn-primary !bg-emerald-600 hover:!bg-emerald-700">
                Approve & Issue QR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
