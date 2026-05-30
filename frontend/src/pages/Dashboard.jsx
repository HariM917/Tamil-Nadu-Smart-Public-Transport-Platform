import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { apiService } from '../services/api';
import { Award, Ticket, MapPin, ArrowRight, CheckCircle, Calendar, IndianRupee } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuthStore();
  const [passes, setPasses] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [passList, bookingList] = await Promise.all([
          apiService.getMyPasses(),
          apiService.getBookingHistory(),
        ]);
        setPasses(passList);
        setBookings(bookingList);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const actionCards = [
    {
      title: 'Apply / Renew Bus Pass',
      description: 'Request a monthly, quarterly, or annual pass. Get eligibility scored instantly.',
      icon: Award,
      path: '/bus-pass',
      iconBg: 'bg-blue-50 text-blue-600 border-blue-100',
    },
    {
      title: 'Book Tickets',
      description: 'Search buses, select your seat, and generate a QR-code ticket for scanning.',
      icon: Ticket,
      path: '/booking',
      iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    },
    {
      title: 'Live Tracking',
      description: 'Track state transit buses on the live map and estimate arrival times.',
      icon: MapPin,
      path: '/tracking',
      iconBg: 'bg-amber-50 text-amber-600 border-amber-100',
    },
    {
      title: 'View Bus Fares',
      description: 'Check the latest stage-wise ticket prices for all MTC bus services.',
      icon: IndianRupee,
      path: '/fares',
      iconBg: 'bg-purple-50 text-purple-600 border-purple-100',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="relative glass-panel gradient-border rounded-3xl p-6 sm:p-8 overflow-hidden animate-fade-in">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] rounded-full bg-tn-primary/5 blur-[60px] -z-10" />
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center sm:text-left">
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-tn-text">
              Vanakkam, {user?.full_name}! 🙏
            </h1>
            <p className="text-sm text-tn-text-secondary font-medium">
              Welcome to the Smart Public Transport Portal. Manage your passes and bookings.
            </p>
          </div>
          <div className="badge badge-info text-xs">
            📍 {user?.city || 'Tamil Nadu'}
          </div>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {actionCards.map((card, idx) => (
          <Link
            key={idx}
            to={card.path}
            className="glass-panel glass-panel-hover p-5 rounded-2xl flex flex-col justify-between group animate-fade-in-up"
            style={{ animationDelay: `${0.05 * (idx + 1)}s` }}
          >
            <div className="space-y-3">
              <div className={`inline-flex p-2.5 rounded-xl border ${card.iconBg}`}>
                <card.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display font-bold text-base text-tn-text group-hover:text-tn-primary transition-colors">
                {card.title}
              </h3>
              <p className="text-xs text-tn-text-secondary leading-relaxed">{card.description}</p>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-tn-primary mt-4 group-hover:translate-x-1 transition-transform">
              <span>Access Portal</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </Link>
        ))}
      </div>

      {/* Main sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Bus Passes */}
        <div className="glass-panel p-6 rounded-2xl space-y-5 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <h2 className="font-display font-bold text-lg text-tn-text flex items-center gap-2">
            <Award className="h-5 w-5 text-tn-primary" />
            <span>Your Digital Bus Passes</span>
          </h2>

          {loading ? (
            <div className="space-y-3">
              <div className="skeleton h-24" />
              <div className="skeleton h-24" />
            </div>
          ) : passes.length > 0 ? (
            <div className="space-y-3">
              {passes.slice(0, 2).map((pass) => (
                <div key={pass.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-tn-text-muted uppercase tracking-wider">Pass Category</span>
                      <h4 className="text-sm font-bold text-tn-text capitalize">{pass.category.replace('_', ' ')} ({pass.pass_type})</h4>
                    </div>
                    <span className={`badge ${
                      pass.status === 'approved' ? 'badge-success' :
                      pass.status === 'pending' ? 'badge-warning' : 'badge-danger'
                    }`}>
                      {pass.status}
                    </span>
                  </div>

                  {pass.status === 'approved' && pass.qr_code_url && (
                    <div className="flex flex-col sm:flex-row items-center gap-4 pt-3 border-t border-slate-100">
                      <img src={pass.qr_code_url} alt="QR Code" className="h-20 w-20 rounded-lg border border-slate-200 bg-white p-1 shadow-sm" />
                      <div className="text-xs space-y-1">
                        <p className="text-tn-text-secondary">Valid: <span className="text-tn-text font-semibold">{new Date(pass.valid_from).toLocaleDateString()} — {new Date(pass.valid_until).toLocaleDateString()}</span></p>
                        <p className="text-emerald-600 font-bold flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" /> Ready for conductor scan
                        </p>
                      </div>
                    </div>
                  )}

                  {pass.status === 'pending' && (
                    <p className="text-xs text-tn-text-secondary pt-2 border-t border-slate-100">
                      Document verified via OCR. Pending officer review.
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl">
              <p className="text-sm text-tn-text-secondary">No active bus passes.</p>
              <Link to="/bus-pass" className="inline-block mt-3 text-xs font-semibold text-tn-primary hover:underline">Apply for a pass →</Link>
            </div>
          )}
        </div>

        {/* Booking History */}
        <div className="glass-panel p-6 rounded-2xl space-y-5 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <h2 className="font-display font-bold text-lg text-tn-text flex items-center gap-2">
            <Ticket className="h-5 w-5 text-emerald-600" />
            <span>Recent Bookings</span>
          </h2>

          {loading ? (
            <div className="space-y-3">
              <div className="skeleton h-20" />
              <div className="skeleton h-20" />
            </div>
          ) : bookings.length > 0 ? (
            <div className="space-y-3">
              {bookings.slice(0, 3).map((booking) => (
                <div key={booking.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-tn-text">{booking.source}</span>
                      <span className="text-xs text-tn-text-muted">→</span>
                      <span className="text-sm font-bold text-tn-text">{booking.destination}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-tn-text-secondary">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-tn-text-muted" />
                        {new Date(booking.travel_date).toLocaleDateString()}
                      </span>
                      <span>Seat: <span className="font-semibold text-tn-text">{booking.seat_number || 'General'}</span></span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-tn-text">₹{booking.amount}</div>
                    <span className={`badge ${booking.payment_status === 'paid' ? 'badge-success' : 'badge-warning'}`}>
                      {booking.payment_status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl">
              <p className="text-sm text-tn-text-secondary">No bookings yet.</p>
              <Link to="/booking" className="inline-block mt-3 text-xs font-semibold text-emerald-600 hover:underline">Book a seat now →</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
