import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { Award, Users, Ticket, Bus, BarChart3, ShieldAlert, Check, X, Trash2, Plus, Edit3, Loader2 } from 'lucide-react';
// Recharts imports
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('passes');
  const [passes, setPasses] = useState([]);
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [buses, setBuses] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);

  // Bus form state
  const [showBusModal, setShowBusModal] = useState(false);
  const [editingBus, setEditingBus] = useState(null);
  const [busNumber, setBusNumber] = useState('');
  const [busName, setBusName] = useState('');
  const [busType, setBusType] = useState('ordinary');
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');

  useEffect(() => {
    fetchAdminData();
  }, [activeTab]);

  async function fetchAdminData() {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'passes') {
        const data = await apiService.adminGetPasses();
        setPasses(data);
      } else if (activeTab === 'users') {
        const data = await apiService.adminGetUsers();
        setUsers(data);
      } else if (activeTab === 'bookings') {
        const data = await apiService.adminGetBookings();
        setBookings(data);
      } else if (activeTab === 'buses') {
        const data = await apiService.listBuses();
        setBuses(data);
      } else if (activeTab === 'analytics') {
        const data = await apiService.adminGetAnalytics();
        setAnalytics(data);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch admin resources');
    } finally {
      setLoading(false);
    }
  }

  const handleReview = async (passId, status) => {
    setActionLoading(true);
    try {
      const remarks = status === 'approved' 
        ? 'Approved by Admin Officer. Document verification passed.'
        : 'Rejected: Document image verification failed. Extracted OCR names did not match profile details.';
      
      await apiService.adminReviewPass(passId, { status, admin_remarks: remarks });
      // Refresh passes list
      const data = await apiService.adminGetPasses();
      setPasses(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBusSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    
    const busData = {
      bus_number: busNumber,
      bus_name: busName,
      bus_type: busType,
      source,
      destination,
      total_seats: 40,
      base_fare: 100.0,
      per_km_fare: 1.5
    };

    try {
      if (editingBus) {
        await apiService.adminUpdateBus(editingBus.id, busData);
      } else {
        await apiService.adminCreateBus(busData);
      }
      setShowBusModal(false);
      setEditingBus(null);
      // Reset form
      setBusNumber('');
      setBusName('');
      setBusType('ordinary');
      setSource('');
      setDestination('');
      // Refresh list
      const data = await apiService.listBuses();
      setBuses(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditBus = (bus) => {
    setEditingBus(bus);
    setBusNumber(bus.bus_number);
    setBusName(bus.bus_name || '');
    setBusType(bus.bus_type);
    setSource(bus.source);
    setDestination(bus.destination);
    setShowBusModal(true);
  };

  const handleDeleteBus = async (busId) => {
    if (!window.confirm('Are you sure you want to delete this bus route?')) return;
    setActionLoading(true);
    try {
      await apiService.adminDeleteBus(busId);
      const data = await apiService.listBuses();
      setBuses(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="font-display font-bold text-3xl text-white">Admin Officer Dashboard</h1>
        <p className="text-sm text-slate-400 mt-1">Review applications, query system databases, compile analytics and schedule transits.</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-white/5 pb-4">
        {[
          { id: 'passes', label: 'Pass Applications', icon: Award },
          { id: 'users', label: 'Registered Users', icon: Users },
          { id: 'bookings', label: 'Booking Records', icon: Ticket },
          { id: 'buses', label: 'Manage Buses', icon: Bus },
          { id: 'analytics', label: 'Transit Analytics', icon: BarChart3 },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-neon'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center gap-2">
          <ShieldAlert className="h-4.5 w-4.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-24 flex justify-center">
          <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Tab 1: Pass Review list */}
          {activeTab === 'passes' && (
            <div className="space-y-4">
              {passes.length > 0 ? (
                passes.map((pass) => (
                  <div key={pass.id} className="glass-panel p-6 rounded-2xl flex flex-col md:flex-row gap-6 justify-between border border-white/5">
                    <div className="space-y-4 flex-grow">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-white capitalize">{pass.category.replace('_', ' ')} Pass Application</h4>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider ${
                            pass.ml_verification_status === 'passed' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'
                          }`}>
                            ML Status: {pass.ml_verification_status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Application ID: TN-PASS-{pass.id} • Applied by User #{pass.user_id}</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div className="p-3 bg-slate-950/40 rounded-xl space-y-1">
                          <span className="text-slate-500">Extracted Document Text (OCR)</span>
                          <p className="text-slate-300 font-mono text-[10px] break-words line-clamp-3 overflow-y-auto max-h-16">
                            {pass.ocr_extracted_text || 'Unable to scan textual content.'}
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-slate-500">Eligibility ML Score:</span>
                            <span className="text-slate-200 font-bold">{(pass.ml_eligibility_score || 0).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-slate-500">Fraud Risk Score:</span>
                            <span className={`font-bold ${pass.fraud_risk_score >= 0.5 ? 'text-red-400' : 'text-emerald-400'}`}>
                              {(pass.fraud_risk_score || 0).toFixed(2)}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 italic">
                            Remarks: {pass.admin_remarks || 'None'}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row md:flex-col justify-center gap-2 items-center flex-shrink-0">
                      {pass.status === 'pending' ? (
                        <>
                          <button
                            onClick={() => handleReview(pass.id, 'approved')}
                            disabled={actionLoading}
                            className="w-full sm:w-28 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                          >
                            <Check className="h-4.5 w-4.5" /> Approve
                          </button>
                          <button
                            onClick={() => handleReview(pass.id, 'rejected')}
                            disabled={actionLoading}
                            className="w-full sm:w-28 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                          >
                            <X className="h-4.5 w-4.5" /> Reject
                          </button>
                        </>
                      ) : (
                        <div className="text-center">
                          <span className={`px-3 py-1 rounded-xl text-xs font-extrabold border uppercase ${
                            pass.status === 'approved' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
                          }`}>
                            {pass.status}
                          </span>
                        </div>
                      )}
                      
                      {pass.document_url && (
                        <a
                          href={`http://localhost:8000${pass.document_url}`}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 text-[10px] text-blue-500 underline hover:text-blue-400"
                        >
                          View Document Image
                        </a>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-16 border border-dashed border-white/5 rounded-2xl">
                  <p className="text-slate-500 text-sm">No applications found in database.</p>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Users list */}
          {activeTab === 'users' && (
            <div className="glass-panel rounded-2xl overflow-hidden overflow-x-auto border border-white/5">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900/60 border-b border-white/5 text-slate-400 font-bold">
                    <th className="p-4">User ID</th>
                    <th className="p-4">Name</th>
                    <th className="p-4">Contact</th>
                    <th className="p-4">Registered Location</th>
                    <th className="p-4">Account Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/20">
                      <td className="p-4 font-mono">#{u.id}</td>
                      <td className="p-4 font-bold text-white">{u.full_name}</td>
                      <td className="p-4">{u.email || u.phone}</td>
                      <td className="p-4">{u.city || 'Tamil Nadu'}</td>
                      <td className="p-4 capitalize">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          u.role === 'admin' ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab 3: Bookings list */}
          {activeTab === 'bookings' && (
            <div className="glass-panel rounded-2xl overflow-hidden overflow-x-auto border border-white/5">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900/60 border-b border-white/5 text-slate-400 font-bold">
                    <th className="p-4">Booking ID</th>
                    <th className="p-4">User ID</th>
                    <th className="p-4">Route Details</th>
                    <th className="p-4">Seats No</th>
                    <th className="p-4">Paid Cost</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {bookings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-800/20">
                      <td className="p-4 font-mono">#{b.id}</td>
                      <td className="p-4 font-mono">#{b.user_id}</td>
                      <td className="p-4 font-semibold text-white">{b.source} &rarr; {b.destination}</td>
                      <td className="p-4 font-mono">{b.seat_number || 'General'}</td>
                      <td className="p-4 font-bold text-emerald-400">₹{b.amount}</td>
                      <td className="p-4 uppercase">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          b.payment_status === 'paid' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                        }`}>
                          {b.payment_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab 4: Buses CRUD */}
          {activeTab === 'buses' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button
                  onClick={() => { setEditingBus(null); setShowBusModal(true); }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-neon"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add New Bus Route</span>
                </button>
              </div>

              {/* Grid of buses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {buses.map((bus) => (
                  <div key={bus.id} className="glass-panel p-5 rounded-2xl border border-white/5 flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white font-mono">{bus.bus_number}</span>
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 uppercase font-semibold">
                          {bus.bus_type}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white">{bus.bus_name || bus.route_name}</h4>
                      <p className="text-xs text-slate-400">{bus.source} &rarr; {bus.destination}</p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditBus(bus)}
                        className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/40"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteBus(bus.id)}
                        className="p-2 text-red-400 hover:text-red-300 rounded-lg hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add/Edit Modal */}
              {showBusModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                  <div className="glass-panel p-6 rounded-2xl max-w-md w-full space-y-6">
                    <h3 className="font-display font-bold text-lg text-white">
                      {editingBus ? 'Modify Bus Details' : 'Add New Bus'}
                    </h3>
                    
                    <form onSubmit={handleBusSubmit} className="space-y-4 text-xs">
                      <div>
                        <label className="block text-slate-400">Bus Registration Number</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. TN-01-AN-1234"
                          value={busNumber}
                          onChange={(e) => setBusNumber(e.target.value)}
                          className="mt-1 w-full px-4 py-2.5 bg-[#0c102b] border border-white/10 rounded-xl focus:outline-none focus:border-blue-500 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400">Bus Route Display Name</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Chennai-Madurai Superfast"
                          value={busName}
                          onChange={(e) => setBusName(e.target.value)}
                          className="mt-1 w-full px-4 py-2.5 bg-[#0c102b] border border-white/10 rounded-xl focus:outline-none focus:border-blue-500 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400">Bus Service Type</label>
                        <select
                          value={busType}
                          onChange={(e) => setBusType(e.target.value)}
                          className="mt-1 w-full px-4 py-2.5 bg-[#0c102b] border border-white/10 rounded-xl focus:outline-none focus:border-blue-500 text-white"
                        >
                          <option value="ordinary">Ordinary</option>
                          <option value="express">Express</option>
                          <option value="deluxe">Deluxe</option>
                          <option value="ac">AC Sleeper</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-slate-400">Source Station</label>
                          <input
                            type="text"
                            required
                            placeholder="Chennai"
                            value={source}
                            onChange={(e) => setSource(e.target.value)}
                            className="mt-1 w-full px-4 py-2.5 bg-[#0c102b] border border-white/10 rounded-xl focus:outline-none focus:border-blue-500 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400">Destination Station</label>
                          <input
                            type="text"
                            required
                            placeholder="Madurai"
                            value={destination}
                            onChange={(e) => setDestination(e.target.value)}
                            className="mt-1 w-full px-4 py-2.5 bg-[#0c102b] border border-white/10 rounded-xl focus:outline-none focus:border-blue-500 text-white"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 pt-4">
                        <button
                          type="button"
                          onClick={() => { setShowBusModal(false); setEditingBus(null); }}
                          className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-semibold"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold shadow-neon"
                        >
                          Save Route
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 5: Analytics Recharts */}
          {activeTab === 'analytics' && analytics && (
            <div className="space-y-8">
              {/* Stat panel */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-1">
                  <span className="text-slate-500 text-xs font-semibold">Aggregate Platform Turnover</span>
                  <p className="text-2xl font-extrabold text-emerald-400">₹{analytics.stats.total_revenue.toLocaleString()}</p>
                </div>
                <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-1">
                  <span className="text-slate-500 text-xs font-semibold">Total Passenger Pass Claims</span>
                  <p className="text-2xl font-extrabold text-blue-400">{analytics.stats.total_passes}</p>
                </div>
                <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-1">
                  <span className="text-slate-500 text-xs font-semibold">Seats Booked</span>
                  <p className="text-2xl font-extrabold text-indigo-400">{analytics.stats.total_bookings}</p>
                </div>
              </div>

              {/* Chart Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Bookings bar chart */}
                <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
                  <h3 className="font-bold text-white text-xs uppercase tracking-wider">Weekly Ticket Booking Trend</h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.weekly_bookings}>
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} />
                        <YAxis stroke="#94a3b8" fontSize={10} />
                        <Tooltip contentStyle={{ backgroundColor: '#111736', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }} />
                        <Bar dataKey="bookings" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Categories pie chart */}
                <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
                  <h3 className="font-bold text-white text-xs uppercase tracking-wider">Pass Category Distribution</h3>
                  <div className="h-64 w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={Object.entries(analytics.pass_category_distribution).map(([name, value]) => ({ name: name.replace('_', ' '), value }))}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {Object.entries(analytics.pass_category_distribution).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#111736', border: 'none', borderRadius: 8 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
