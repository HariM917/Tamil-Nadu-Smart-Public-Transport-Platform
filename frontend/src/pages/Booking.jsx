import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { Ticket, MapPin, Calendar, Users, ArrowRight, Loader2, CreditCard, CheckCircle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export default function Booking() {
  const { user } = useAuthStore();
  const [source, setSource] = useState('Chennai');
  const [destination, setDestination] = useState('Madurai');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [selectedBus, setSelectedBus] = useState(null);
  const [bookedSeats, setBookedSeats] = useState([]);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [ticket, setTicket] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setTicket(null);
    setSelectedBus(null);

    try {
      const results = await apiService.searchBuses(source, destination);
      setBuses(results);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectBus = async (bus) => {
    setSelectedBus(bus);
    setSelectedSeat(null);
    try {
      const seats = await apiService.getBookedSeats(bus.id, date);
      setBookedSeats(seats || []);
    } catch (err) {
      console.error(err);
      setBookedSeats([]);
    }
  };

  const handleBook = async () => {
    if (!selectedSeat) return;
    setBookingLoading(true);
    
    try {
      const bookingData = {
        bus_id: selectedBus.id,
        source: selectedBus.source,
        destination: selectedBus.destination,
        travel_date: new Date(date).toISOString(),
        seat_number: selectedSeat,
        passengers: 1
      };
      
      const res = await apiService.createBooking(bookingData);
      
      // Simulate payment delay
      setTimeout(async () => {
        try {
          const finalTicket = await apiService.payBooking(res.id, `TXN_${Math.floor(Math.random()*1000000)}`);
          setTicket(finalTicket);
        } catch (err) {
          setError('Payment failed: ' + err.message);
        } finally {
          setBookingLoading(false);
        }
      }, 1500);

    } catch (err) {
      setError(err.message);
      setBookingLoading(false);
    }
  };

  // Generate 40 seats layout
  const renderSeats = () => {
    const seats = [];
    for (let i = 1; i <= 40; i++) {
      const isBooked = bookedSeats.includes(i.toString());
      const isSelected = selectedSeat === i.toString();
      
      seats.push(
        <button
          key={i}
          disabled={isBooked}
          onClick={() => setSelectedSeat(i.toString())}
          className={`h-12 w-12 rounded-xl flex items-center justify-center font-bold text-sm transition-all
            ${isBooked 
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-none' 
              : isSelected
                ? 'bg-tn-primary text-white shadow-md transform scale-105 border-none'
                : 'bg-white border-2 border-slate-200 text-tn-text hover:border-tn-primary hover:text-tn-primary cursor-pointer'
            }
          `}
        >
          {i}
        </button>
      );
    }
    return seats;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="animate-fade-in">
        <h1 className="section-title flex items-center gap-2">
          <Ticket className="h-8 w-8 text-emerald-600" />
          Seat Reservation
        </h1>
        <p className="section-subtitle">
          Search routes, select your seat, and generate a QR ticket instantly.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Search Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-panel p-6 rounded-2xl animate-fade-in-up">
            <h2 className="font-display font-bold text-lg text-tn-text mb-4">Find Buses</h2>
            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <label className="form-label">From</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="form-input"
                  />
                  <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-tn-text-muted" />
                </div>
              </div>
              
              <div>
                <label className="form-label">To</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="form-input"
                  />
                  <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-tn-text-muted" />
                </div>
              </div>

              <div>
                <label className="form-label">Date</label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="form-input"
                  />
                  <Calendar className="absolute left-3 top-3.5 h-4 w-4 text-tn-text-muted" />
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                {loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : 'Search Routes'}
              </button>
            </form>
          </div>

          {/* Results List */}
          {buses.length > 0 && !ticket && (
            <div className="space-y-3 animate-fade-in">
              <h3 className="font-bold text-tn-text">Available Routes</h3>
              {buses.map((bus) => (
                <div 
                  key={bus.id} 
                  onClick={() => selectBus(bus)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedBus?.id === bus.id 
                      ? 'border-tn-primary bg-tn-primary/5 shadow-md' 
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-tn-text">{bus.bus_name || bus.bus_number}</h4>
                    <span className="badge badge-success">₹{bus.base_fare}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-tn-text-secondary">
                    <span>{bus.source}</span>
                    <ArrowRight className="h-3 w-3" />
                    <span>{bus.destination}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Seat Selection & Ticket Panel */}
        <div className="lg:col-span-2">
          {error && (
            <div className="alert alert-error mb-4">
              <span>{error}</span>
            </div>
          )}

          {ticket ? (
            // Success Ticket
            <div className="glass-panel p-8 rounded-2xl flex flex-col items-center text-center animate-scale-in max-w-md mx-auto">
              <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-emerald-600" />
              </div>
              <h2 className="font-display font-bold text-2xl text-tn-text">Booking Confirmed!</h2>
              <p className="text-sm text-tn-text-secondary mt-1 mb-6">Have your QR code ready for the conductor.</p>
              
              <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-tn-primary to-emerald-500" />
                <div className="pt-2 text-center">
                  <p className="text-xs text-tn-text-secondary font-mono tracking-wider font-semibold">TICKET ID: {ticket.ticket?.ticket_number || `TN-TKT-${ticket.id}`}</p>
                </div>
                <img src={ticket.ticket?.qr_code_url} alt="Ticket QR" className="mx-auto h-40 w-40 my-4 p-1 bg-white border border-slate-100 rounded-lg shadow-sm" />
                <div className="border-t border-dashed border-slate-200 pt-4 space-y-2 text-left">
                  <div className="flex justify-between text-sm">
                    <span className="text-tn-text-muted">Passenger</span>
                    <span className="font-bold text-tn-text">{user?.full_name || 'Passenger'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-tn-text-muted">Bus No</span>
                    <span className="font-bold text-tn-primary font-mono">{ticket.bus?.bus_number || `TN-01-N-${1000 + ticket.bus_id}`}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-tn-text-muted">Route</span>
                    <span className="font-bold text-tn-text">{ticket.source} to {ticket.destination}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-tn-text-muted">Date</span>
                    <span className="font-bold text-tn-text">{new Date(ticket.travel_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-tn-text-muted">Seat Number</span>
                    <span className="font-bold text-tn-text">Seat {ticket.seat_number}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-slate-100 pt-2">
                    <span className="text-tn-text-muted">Amount Paid</span>
                    <span className="font-bold text-emerald-600">₹{ticket.amount}</span>
                  </div>
                </div>
              </div>
              
              <button onClick={() => { setTicket(null); setSelectedBus(null); setBuses([]); }} className="btn-secondary w-full mt-6">
                Book Another Ticket
              </button>
            </div>
          ) : selectedBus ? (
            // Seat Selection
            <div className="glass-panel p-6 sm:p-8 rounded-2xl animate-fade-in-up">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 pb-6 border-b border-slate-100">
                <div>
                  <h2 className="font-display font-bold text-xl text-tn-text">Select your seat</h2>
                  <p className="text-sm text-tn-text-secondary">{selectedBus.source} to {selectedBus.destination}</p>
                </div>
                <div className="flex gap-4 text-xs font-medium">
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-white border-2 border-slate-200" /> Available</div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-slate-100" /> Booked</div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-tn-primary" /> Selected</div>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 sm:p-10 max-w-md mx-auto relative overflow-hidden">
                {/* Driver Area Indicator */}
                <div className="absolute top-0 inset-x-0 h-12 bg-slate-200/50 flex justify-end px-8 items-center rounded-t-3xl border-b border-slate-200">
                  <div className="w-8 h-8 rounded-full bg-slate-300 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-slate-500">DRV</span>
                  </div>
                </div>
                
                <div className="pt-16 seats-grid">
                  {renderSeats()}
                </div>
              </div>

              {selectedSeat && (
                <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-4 animate-scale-in">
                  <div>
                    <p className="text-sm text-tn-text-secondary">Selected Seat: <span className="font-bold text-tn-text text-lg">{selectedSeat}</span></p>
                    <p className="text-xs text-tn-text-secondary">Total Fare: <span className="font-bold text-emerald-600">₹{selectedBus.base_fare}</span></p>
                  </div>
                  <button onClick={handleBook} disabled={bookingLoading} className="btn-primary w-full sm:w-auto">
                    {bookingLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                    <span>Pay & Confirm</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full min-h-[400px] border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center p-6 bg-slate-50/50">
              <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <Ticket className="h-8 w-8 text-slate-300" />
              </div>
              <h3 className="font-display font-bold text-lg text-tn-text-secondary">No route selected</h3>
              <p className="text-sm text-tn-text-muted mt-1 max-w-sm">
                Search for a route on the left panel and select a bus to view available seats.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
