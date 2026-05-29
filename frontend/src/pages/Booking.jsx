import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { Ticket, Search, User, Calendar, Check, AlertCircle, Loader2 } from 'lucide-react';

export default function Booking() {
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [travelDate, setTravelDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [buses, setBuses] = useState([]);
  const [selectedBus, setSelectedBus] = useState(null);
  
  const [bookedSeats, setBookedSeats] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successBooking, setSuccessBooking] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!source || !destination) return;
    setLoading(true);
    setError(null);
    setSelectedBus(null);
    setSelectedSeats([]);
    
    try {
      const results = await apiService.searchBuses(source, destination);
      setBuses(results);
      if (results.length === 0) {
        setError('No buses found for this route. Try: Chennai & Madurai, Coimbatore & Salem, or Chennai & Pondicherry.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBus = async (bus) => {
    setSelectedBus(bus);
    setSelectedSeats([]);
    setError(null);
    try {
      const seats = await apiService.getBookedSeats(bus.id, travelDate);
      setBookedSeats(seats);
    } catch (err) {
      setError('Failed to load booked seats.');
    }
  };

  const toggleSeat = (seatNum) => {
    if (selectedSeats.includes(seatNum)) {
      setSelectedSeats(selectedSeats.filter(s => s !== seatNum));
    } else {
      setSelectedSeats([...selectedSeats, seatNum]);
    }
  };

  const handleBook = async () => {
    if (selectedSeats.length === 0) {
      setError('Please select at least one seat');
      return;
    }

    setBookingLoading(true);
    setError(null);

    try {
      const bookingData = {
        bus_id: selectedBus.id,
        source: selectedBus.source,
        destination: selectedBus.destination,
        travel_date: new Date(travelDate).toISOString(),
        seat_number: selectedSeats.join(','),
        passengers: selectedSeats.length,
        payment_method: 'upi'
      };

      const booking = await apiService.createBooking(bookingData);
      
      // Simulate payment processing
      const mockTxId = 'TXN-' + Math.random().toString(36).substr(2, 9).toUpperCase();
      const paidBooking = await apiService.payBooking(booking.id, mockTxId);
      
      setSuccessBooking(paidBooking);
      setSelectedBus(null);
      setSelectedSeats([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBookingLoading(false);
    }
  };

  // Generate 40 seats
  const totalSeatsCount = 40;
  const seatsList = Array.from({ length: totalSeatsCount }, (_, i) => String(i + 1));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="font-display font-bold text-3xl text-white flex items-center gap-2">
          <Ticket className="h-8 w-8 text-emerald-500" />
          <span>Online Bus Ticket Booking</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Reserve seats, complete payments in a click, and obtain instant conductors scanning QR tickets.
        </p>
      </div>

      {successBooking && (
        <div className="glass-panel p-6 rounded-2xl border border-emerald-500/20 max-w-xl mx-auto space-y-6 text-center">
          <div className="inline-flex p-3 rounded-full bg-emerald-500/10 text-emerald-400">
            <Check className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h2 className="font-display font-bold text-xl text-white">Booking Confirmed!</h2>
            <p className="text-sm text-slate-400">Your transaction ref: {successBooking.transaction_id}</p>
          </div>

          <div className="flex flex-col items-center gap-4 py-4 border-y border-white/5">
            <img src={successBooking.ticket?.qr_code_url} alt="Ticket QR" className="h-44 w-44 bg-white p-2 rounded-xl" />
            <div className="text-xs space-y-1 font-mono text-slate-300">
              <p>Ticket Code: {successBooking.ticket?.ticket_number}</p>
              <p>Route: {successBooking.source} to {successBooking.destination}</p>
              <p>Seats Reserved: {successBooking.seat_number}</p>
            </div>
          </div>

          <button
            onClick={() => setSuccessBooking(null)}
            className="px-6 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold"
          >
            Book Another Ticket
          </button>
        </div>
      )}

      {!successBooking && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left panel: Search and Buses */}
          <div className="lg:col-span-2 space-y-6">
            {/* Search form */}
            <div className="glass-panel p-6 rounded-2xl">
              <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Source</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Chennai"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="mt-1 w-full px-4 py-3 bg-[#0c102b] border border-white/10 rounded-xl focus:outline-none focus:border-blue-500 text-white text-sm"
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Destination</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Madurai"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="mt-1 w-full px-4 py-3 bg-[#0c102b] border border-white/10 rounded-xl focus:outline-none focus:border-blue-500 text-white text-sm"
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</label>
                  <input
                    type="date"
                    required
                    value={travelDate}
                    onChange={(e) => setTravelDate(e.target.value)}
                    className="mt-1 w-full px-4 py-3 bg-[#0c102b] border border-white/10 rounded-xl focus:outline-none focus:border-blue-500 text-white text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="sm:col-span-1 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  <span>Search Route</span>
                </button>
              </form>
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center gap-2">
                <AlertCircle className="h-4.5 w-4.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* List buses */}
            <div className="space-y-4">
              {buses.map((bus) => (
                <div
                  key={bus.id}
                  onClick={() => handleSelectBus(bus)}
                  className={`glass-panel p-5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                    selectedBus?.id === bus.id ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/5 hover:border-white/15'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] uppercase font-bold tracking-wider">
                        {bus.bus_type}
                      </span>
                      <h4 className="text-sm font-bold text-white">{bus.bus_name || bus.bus_number}</h4>
                    </div>
                    
                    <div className="text-xs text-slate-400 space-y-1">
                      <p>Route: <span className="text-slate-200">{bus.source} &rarr; {bus.destination}</span></p>
                      <p>Schedules: <span className="text-slate-200">{bus.departure_time} - {bus.arrival_time}</span></p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-500">Seat Fare</span>
                    <p className="text-lg font-extrabold text-emerald-400">₹{bus.base_fare}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right panel: Seat Grid and Confirmation */}
          <div className="lg:col-span-1">
            {selectedBus ? (
              <div className="glass-panel p-6 rounded-2xl space-y-6">
                <div>
                  <h3 className="font-display font-bold text-lg text-white">Select Seats</h3>
                  <p className="text-xs text-slate-400">{selectedBus.bus_name || selectedBus.bus_number}</p>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 text-xs text-slate-400 justify-center">
                  <div className="flex items-center gap-1.5">
                    <div className="h-4 w-4 rounded border border-white/10" />
                    <span>Available</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-4 w-4 rounded bg-red-500/20 border border-red-500/30" />
                    <span>Booked</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-4 w-4 rounded bg-emerald-500" />
                    <span>Selected</span>
                  </div>
                </div>

                {/* Grid */}
                <div className="p-4 rounded-xl bg-slate-950/40 border border-white/5">
                  {/* Front label */}
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 mb-4 px-2">
                    <span>FRONT / DRIVER</span>
                    <span>BACK</span>
                  </div>
                  <div className="seats-grid">
                    {seatsList.map((seat) => {
                      const isBooked = bookedSeats.includes(seat);
                      const isSelected = selectedSeats.includes(seat);

                      return (
                        <button
                          key={seat}
                          disabled={isBooked}
                          onClick={() => toggleSeat(seat)}
                          className={`h-9 rounded-lg flex items-center justify-center text-xs font-semibold transition-all ${
                            isBooked ? 'bg-red-500/10 border border-red-500/20 text-red-500/40 cursor-not-allowed' :
                            isSelected ? 'bg-emerald-500 text-white font-bold shadow-neon border border-emerald-500' :
                            'border border-white/10 text-slate-300 hover:border-blue-500/50 hover:text-blue-400'
                          }`}
                        >
                          {seat}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Payment checkout recap */}
                {selectedSeats.length > 0 && (
                  <div className="space-y-4 pt-4 border-t border-white/5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Selected Seats:</span>
                      <span className="text-white font-bold font-mono">{selectedSeats.join(', ')}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Total Price:</span>
                      <span className="text-emerald-400 font-extrabold text-base">₹{selectedBus.base_fare * selectedSeats.length}</span>
                    </div>

                    <button
                      onClick={handleBook}
                      disabled={bookingLoading}
                      className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl shadow-neon flex items-center justify-center gap-2"
                    >
                      {bookingLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Issuing QR Tickets...</span>
                        </>
                      ) : (
                        <span>Simulate Pay & Confirm</span>
                      )}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="glass-panel p-8 text-center rounded-2xl border border-dashed border-white/10 flex flex-col items-center justify-center h-48">
                <User className="h-8 w-8 text-slate-500 mb-2" />
                <p className="text-xs text-slate-400">Select a bus route to view seating layouts.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
