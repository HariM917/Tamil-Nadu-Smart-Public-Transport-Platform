import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { Users, Bus, Ticket, Award, CheckCircle, XCircle, Search, Eye, Filter, TrendingUp, ShieldAlert, Zap, Users2 } from 'lucide-react';
import { useToast } from '../components/ToastProvider';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, BarChart, Bar } from 'recharts';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('passes'); // passes, users, buses, analytics
  const [data, setData] = useState({ passes: [], users: [], buses: [], analytics: null, fleetAnalytics: null });
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const [selectedPass, setSelectedPass] = useState(null); // For review modal
  const [reviewNotes, setReviewNotes] = useState('');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'passes') {
        const passes = await apiService.adminGetPasses();
        setData(prev => ({ ...prev, passes }));
      } else if (activeTab === 'users') {
        const users = await apiService.adminGetUsers();
        setData(prev => ({ ...prev, users }));
      } else if (activeTab === 'buses') {
        const buses = await apiService.listBuses();
        setData(prev => ({ ...prev, buses }));
      } else if (activeTab === 'analytics') {
        const [analytics, fleetAnalytics] = await Promise.all([
          apiService.adminGetAnalytics().catch(() => null),
          apiService.adminGetFleetAnalytics().catch(() => null)
        ]);
        setData(prev => ({ ...prev, analytics, fleetAnalytics }));
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
      await apiService.adminReviewPass(selectedPass.id, { status, admin_notes: reviewNotes });
      toast.success(`Pass ${status} successfully`);
      setSelectedPass(null);
      setReviewNotes('');
      fetchData();
    } catch (err) {
      toast.error('Review failed: ' + err.message);
    }
  };

  const tabs = [
    { id: 'passes', label: 'Pass Approvals', icon: Award },
    { id: 'buses', label: 'Fleet Management', icon: Bus },
    { id: 'users', label: 'User Directory', icon: Users },
    { id: 'analytics', label: 'System Analytics', icon: Filter },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex-shrink-0 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-fade-in">
        <div>
          <h1 className="section-title text-tn-primary">Officer Portal</h1>
          <p className="section-subtitle">Manage operations, fleet, and approve digital passes.</p>
        </div>

        {/* Desktop Tabs */}
        <div className="hidden md:flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
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
              {tab.label}
            </button>
          ))}
        </div>

        {/* Mobile Tabs */}
        <div className="w-full md:hidden flex overflow-x-auto gap-2 pb-2 hide-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === tab.id 
                  ? 'bg-tn-primary text-white' 
                  : 'bg-white border border-slate-200 text-tn-text-secondary'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
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
              <table className="data-table">
                <thead className="sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th>ID</th>
                    <th>Applicant</th>
                    <th>Category</th>
                    <th>ML Score</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.passes.length === 0 ? (
                    <tr><td colSpan="6" className="text-center py-8 text-tn-text-secondary">No passes found.</td></tr>
                  ) : data.passes.map(pass => (
                    <tr key={pass.id}>
                      <td className="font-mono text-xs">#{pass.id}</td>
                      <td className="font-semibold">{pass.user_id}</td>
                      <td className="capitalize">{pass.category.replace('_', ' ')}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-slate-200 rounded-full">
                            <div className={`h-full rounded-full ${pass.ml_eligibility_score > 0.5 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${pass.ml_eligibility_score * 100}%` }} />
                          </div>
                          <span className="text-xs font-mono">{(pass.ml_eligibility_score || 0).toFixed(2)}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${pass.status === 'pending' ? 'badge-warning' : pass.status === 'approved' ? 'badge-success' : 'badge-danger'}`}>
                          {pass.status}
                        </span>
                      </td>
                      <td>
                        <button 
                          onClick={() => setSelectedPass(pass)}
                          className="p-1.5 text-tn-primary hover:bg-tn-primary/10 rounded-lg transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* ── USERS TAB ── */}
            {activeTab === 'users' && (
              <table className="data-table">
                <thead className="sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Contact</th>
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
                      <td><span className={`badge ${u.role === 'admin' ? 'badge-purple' : 'badge-info'}`}>{u.role}</span></td>
                      <td className="text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* ── FLEET TAB ── */}
            {activeTab === 'buses' && (
              <table className="data-table">
                <thead className="sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th>Bus No</th>
                    <th>Route</th>
                    <th>Capacity</th>
                    <th>Fare</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.buses.map(b => (
                    <tr key={b.id}>
                      <td className="font-bold text-tn-primary">{b.bus_number}</td>
                      <td className="text-xs font-medium">{b.source} → {b.destination}</td>
                      <td>{b.capacity} seats</td>
                      <td className="font-semibold text-emerald-600">₹{b.base_fare}</td>
                      <td><span className={`badge ${b.is_active ? 'badge-success' : 'badge-danger'}`}>{b.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            
            {/* ── ANALYTICS TAB ── */}
            {activeTab === 'analytics' && data.analytics && (
              <div className="p-6 space-y-8 overflow-y-auto max-h-[75vh]">
                {/* System KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="glass-panel p-6 border-t-4 border-t-blue-500 rounded-xl shadow-sm flex items-center justify-between">
                    <div>
                      <div className="text-tn-text-secondary text-xs font-bold uppercase mb-1">Total Users</div>
                      <div className="text-3xl font-display font-bold text-tn-text">{data.analytics.total_users}</div>
                    </div>
                    <Users2 className="h-10 w-10 text-blue-500/20" />
                  </div>
                  <div className="glass-panel p-6 border-t-4 border-t-emerald-500 rounded-xl shadow-sm flex items-center justify-between">
                    <div>
                      <div className="text-tn-text-secondary text-xs font-bold uppercase mb-1">Active Passes</div>
                      <div className="text-3xl font-display font-bold text-tn-text">{data.analytics.total_passes}</div>
                    </div>
                    <Award className="h-10 w-10 text-emerald-500/20" />
                  </div>
                  <div className="glass-panel p-6 border-t-4 border-t-amber-500 rounded-xl shadow-sm flex items-center justify-between">
                    <div>
                      <div className="text-tn-text-secondary text-xs font-bold uppercase mb-1">Total Bookings</div>
                      <div className="text-3xl font-display font-bold text-tn-text">{data.analytics.total_bookings}</div>
                    </div>
                    <Ticket className="h-10 w-10 text-amber-500/20" />
                  </div>
                  <div className="glass-panel p-6 border-t-4 border-t-purple-500 rounded-xl shadow-sm flex items-center justify-between">
                    <div>
                      <div className="text-tn-text-secondary text-xs font-bold uppercase mb-1">Revenue (Est)</div>
                      <div className="text-3xl font-display font-bold text-tn-text">₹{(data.analytics.total_revenue || data.analytics.total_bookings * 150).toLocaleString()}</div>
                    </div>
                    <Zap className="h-10 w-10 text-purple-500/20" />
                  </div>
                </div>

                {/* Fleet Historical Analytics (dataset.csv) */}
                {data.fleetAnalytics && data.fleetAnalytics.by_year && (
                  <div className="space-y-6">
                    <div className="border-t border-slate-100 pt-6">
                      <h3 className="text-base font-bold text-tn-primary font-display flex items-center gap-2 mb-1">
                        <TrendingUp className="h-5 w-5" />
                        State Bus Fleet Analytics (dataset.csv)
                      </h3>
                      <p className="text-xs text-tn-text-muted">Historical operational performance and audit logs from Chennai transit dataset.</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Chart 1: Passenger Traffic */}
                      <div className="glass-panel p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                        <h4 className="text-xs font-bold text-tn-text uppercase tracking-wider">Passenger Volume (Lakhs/Day)</h4>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.fleetAnalytics.by_year} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <defs>
                                <linearGradient id="colorPassengers" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#059669" stopOpacity={0.8}/>
                                  <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis dataKey="year" stroke="#94a3b8" fontSize={10} tickLine={false} />
                              <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                              <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                              <Area type="monotone" dataKey="passengers_lakhs_day" stroke="#059669" fillOpacity={1} fill="url(#colorPassengers)" name="Passengers (Lakhs)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Chart 2: Fleet Size vs Utilization */}
                      <div className="glass-panel p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                        <h4 className="text-xs font-bold text-tn-text uppercase tracking-wider">Fleet Size & Utilization</h4>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.fleetAnalytics.by_year} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis dataKey="year" stroke="#94a3b8" fontSize={10} tickLine={false} />
                              <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                              <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                              <Legend wrapperStyle={{ fontSize: '10px' }} />
                              <Bar dataKey="total_fleet" fill="#3b82f6" name="Total Fleet" radius={[4, 4, 0, 0]} />
                              <Bar dataKey="fleet_utilization_pct" fill="#10b981" name="Utilization %" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Chart 3: Breakdowns & Accidents */}
                      <div className="glass-panel p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                        <h4 className="text-xs font-bold text-tn-text uppercase tracking-wider flex items-center gap-1.5">
                          <ShieldAlert className="h-4 w-4 text-rose-500" />
                          Breakdowns & Accidents (Rate per Unit)
                        </h4>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data.fleetAnalytics.by_year} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis dataKey="year" stroke="#94a3b8" fontSize={10} tickLine={false} />
                              <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                              <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                              <Legend wrapperStyle={{ fontSize: '10px' }} />
                              <Line type="monotone" dataKey="breakdowns" stroke="#f43f5e" strokeWidth={2} name="Total Breakdowns" dot={{ r: 4 }} activeDot={{ r: 6 }} />
                              <Line type="monotone" dataKey="accidents_per_100k" stroke="#ea580c" strokeWidth={2} name="Accidents/100k km" dot={{ r: 4 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Chart 4: Efficiency & Occupancy */}
                      <div className="glass-panel p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                        <h4 className="text-xs font-bold text-tn-text uppercase tracking-wider">Efficiency & Occupancy %</h4>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.fleetAnalytics.by_year} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis dataKey="year" stroke="#94a3b8" fontSize={10} tickLine={false} />
                              <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                              <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                              <Legend wrapperStyle={{ fontSize: '10px' }} />
                              <Bar dataKey="km_efficiency_pct" fill="#6366f1" name="KM Efficiency %" radius={[4, 4, 0, 0]} />
                              <Bar dataKey="occupancy_pct" fill="#ec4899" name="Occupancy %" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    {/* Tabular Dataset Representation */}
                    <div className="glass-panel rounded-2xl border border-slate-100 shadow-sm overflow-hidden mt-6">
                      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
                        <h4 className="text-xs font-bold text-tn-text uppercase tracking-wider">Complete Performance Dataset Table</h4>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-100 text-tn-text font-bold border-b border-slate-200">
                              <th className="p-3">Performance Indicator</th>
                              {years.map(yr => (
                                <th key={yr} className="p-3 text-center">{yr}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {data.fleetAnalytics.by_item.map((item, idx) => (
                              <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="p-3 font-medium text-tn-text">{item.item}</td>
                                {years.map(yr => (
                                  <td key={yr} className="p-3 text-center font-mono text-tn-text-secondary">
                                    {typeof item.values[yr] === 'number' && item.values[yr] > 1000 
                                      ? item.values[yr].toLocaleString() 
                                      : item.values[yr]}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
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
              <div className="flex gap-4">
                <div className="flex-1 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <p className="text-xs text-tn-text-muted font-bold uppercase mb-1">Details</p>
                  <p className="font-bold text-sm">{selectedPass.category.replace('_', ' ')} Pass</p>
                  <p className="text-xs text-tn-text-secondary mt-1">Type: {selectedPass.pass_type}</p>
                </div>
                <div className="flex-1 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <p className="text-xs text-tn-text-muted font-bold uppercase mb-1">ML Score</p>
                  <p className={`font-bold text-lg ${selectedPass.ml_eligibility_score > 0.5 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {(selectedPass.ml_eligibility_score * 100).toFixed(0)}% Match
                  </p>
                </div>
              </div>
              
              <div>
                <p className="text-xs text-tn-text-muted font-bold uppercase mb-2">OCR Extracted Text</p>
                <div className="bg-slate-900 text-emerald-400 font-mono text-xs p-4 rounded-xl h-32 overflow-y-auto">
                  {selectedPass.ocr_extracted_text || 'No text available'}
                </div>
              </div>
              
              <div>
                <label className="form-label">Officer Notes</label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Enter rejection reason or approval notes..."
                  className="form-input !rounded-xl min-h-[100px] resize-none"
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
