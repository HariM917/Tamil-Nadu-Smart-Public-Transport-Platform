import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator, 
  Image, 
  SafeAreaView, 
  StatusBar 
} from 'react-native';
import { apiService, mobileAuth } from './src/services/api';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('Login');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  
  // Auth Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Dashboard state
  const [passes, setPasses] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [dashLoading, setDashLoading] = useState(false);

  // Bus Pass Application State
  const [passCategory, setPassCategory] = useState('student');
  const [passType, setPassType] = useState('monthly');
  const [docType, setDocType] = useState('student_id');
  const [fileSimulated, setFileSimulated] = useState(false);
  const [passLoading, setPassLoading] = useState(false);

  // Booking State
  const [bookSource, setBookSource] = useState('');
  const [bookDest, setBookDest] = useState('');
  const [buses, setBuses] = useState([]);
  const [selectedBus, setSelectedBus] = useState(null);
  const [selectedSeat, setSelectedSeat] = useState('');
  const [bookLoading, setBookLoading] = useState(false);
  const [activeTicket, setActiveTicket] = useState(null);

  // Tracking State
  const [trackBusesList, setTrackBusesList] = useState([]);
  const [selectedTrackBus, setSelectedTrackBus] = useState(null);
  const [telemetry, setTelemetry] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingInterval, setTrackingInterval] = useState(null);

  // Clear tracking interval on screen change
  useEffect(() => {
    if (currentScreen !== 'Tracking') {
      if (trackingInterval) {
        clearInterval(trackingInterval);
        setTrackingInterval(null);
      }
    }
  }, [currentScreen]);

  // Load Dashboard Data
  const loadDashboardData = async () => {
    setDashLoading(true);
    try {
      const p = await apiService.getMyPasses();
      const b = await apiService.getBookingHistory();
      setPasses(p);
      setBookings(b);
    } catch (err) {
      console.log('Dash Load error:', err);
    } finally {
      setDashLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!username || !password) return;
    setAuthLoading(true);
    setAuthError('');
    try {
      const data = await apiService.login(username, password);
      setUser(data.user);
      setIsAuthenticated(true);
      setCurrentScreen('Dashboard');
      // Load initial dash data
      loadDashboardData();
    } catch (err) {
      setAuthError(err.message || 'Login failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    mobileAuth.setToken(null);
    mobileAuth.setUser(null);
    setIsAuthenticated(false);
    setUser(null);
    setCurrentScreen('Login');
  };

  // Submit Bus Pass Application
  const handleApplyPass = async () => {
    if (!fileSimulated) {
      alert('Please upload/attach a supporting verification document');
      return;
    }
    setPassLoading(true);
    try {
      await apiService.applyForPass(
        passCategory,
        passType,
        docType,
        'simulated-base64-data',
        `${passCategory}_doc_upload.jpg`
      );
      alert('Pass submitted successfully! Running OCR & ML verification model.');
      setFileSimulated(false);
      loadDashboardData();
      setCurrentScreen('Dashboard');
    } catch (err) {
      alert(err.message || 'Application failed');
    } finally {
      setPassLoading(false);
    }
  };

  // Search Booking Routes
  const handleSearchBuses = async () => {
    if (!bookSource || !bookDest) return;
    setBookLoading(true);
    try {
      const results = await apiService.searchBuses(bookSource, bookDest);
      setBuses(results);
      if (results.length === 0) {
        alert('No routes found. Try searching: Chennai and Madurai');
      }
    } catch (err) {
      alert(err.message || 'Search failed');
    } finally {
      setBookLoading(false);
    }
  };

  // Confirm seat booking
  const handleConfirmBooking = async () => {
    if (!selectedSeat) {
      alert('Please enter a seat number');
      return;
    }
    setBookLoading(true);
    try {
      const booking = await apiService.createBooking(
        selectedBus.id,
        selectedBus.source,
        selectedBus.destination,
        selectedSeat,
        new Date().toISOString()
      );
      
      // Simulate payment
      const mockTx = 'TXN-M-' + Math.random().toString(36).substr(2, 6).toUpperCase();
      const paid = await apiService.confirmPayment(booking.id, mockTx);
      
      setActiveTicket(paid);
      setSelectedBus(null);
      setSelectedSeat('');
      loadDashboardData();
    } catch (err) {
      alert(err.message || 'Booking failed');
    } finally {
      setBookLoading(false);
    }
  };

  // Load Bus Tracking Telemetry
  const startTracking = async (bus) => {
    setSelectedTrackBus(bus);
    setTrackingLoading(true);
    try {
      const res = await apiService.trackBus(bus.id);
      setTelemetry(res.tracking);
      
      // Poll coordinates every 4 seconds
      const timer = setInterval(async () => {
        const tick = await apiService.trackBus(bus.id);
        setTelemetry(tick.tracking);
      }, 4000);
      
      setTrackingInterval(timer);
    } catch (err) {
      console.log(err);
    } finally {
      setTrackingLoading(false);
    }
  };

  const loadTrackingBuses = async () => {
    try {
      const res = await apiService.searchBusesByQuery || []; // Use standard list
      const list = await fetch(`http://${Platform.OS === 'android' ? '10.0.2.2' : 'localhost'}:8000/api/buses/list`).then(r => r.json());
      setTrackBusesList(list);
    } catch (err) {
      // Fallback seed
      setTrackBusesList([
        { id: 1, bus_number: 'TN-01-AN-1234', bus_name: 'Chennai-Madurai Superfast', status: 'idle' }
      ]);
    }
  };

  useEffect(() => {
    if (currentScreen === 'Tracking') {
      loadTrackingBuses();
    }
  }, [currentScreen]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080c21" />

      {/* Header bar */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🚌 Chennai One Transit</Text>
        {isAuthenticated && (
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutBtnText}>Logout</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Content wrapper */}
      <View style={styles.content}>
        
        {/* Screen 1: Login */}
        {currentScreen === 'Login' && (
          <ScrollView contentContainerStyle={styles.centerContainer}>
            <Text style={styles.title}>Sign In</Text>
            <Text style={styles.subtitle}>Smart Transport ID Officer Check</Text>

            {authError ? <Text style={styles.errorText}>{authError}</Text> : null}

            <TextInput
              placeholder="Email or Phone Number"
              placeholderTextColor="#889"
              value={username}
              onChangeText={setUsername}
              style={styles.input}
              autoCapitalize="none"
            />

            <TextInput
              placeholder="Password"
              placeholderTextColor="#889"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              style={styles.input}
            />

            <TouchableOpacity 
              onPress={handleLogin} 
              style={styles.primaryBtn}
              disabled={authLoading}
            >
              {authLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Login</Text>
              )}
            </TouchableOpacity>

            {/* Quick selectors */}
            <View style={styles.demoBox}>
              <Text style={styles.demoTitle}>Demo Sign-In Shortcuts</Text>
              <TouchableOpacity 
                style={styles.demoLink}
                onPress={() => { setUsername('user@gmail.com'); setPassword('user1234'); }}
              >
                <Text style={styles.demoLinkText}>Passenger (user@gmail.com / user1234)</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {/* Screen 2: Dashboard */}
        {currentScreen === 'Dashboard' && (
          <ScrollView style={styles.scroll}>
            <View style={styles.welcomeBox}>
              <Text style={styles.welcomeText}>Vanakkam, {user?.full_name || 'Passenger'}</Text>
              <Text style={styles.welcomeSub}>Manage tickets and digital passes</Text>
            </View>

            {/* Navigation Tiles */}
            <View style={styles.navRow}>
              <TouchableOpacity 
                style={[styles.tile, { backgroundColor: '#0f4c8115', borderColor: '#0f4c8140' }]}
                onPress={() => setCurrentScreen('BusPass')}
              >
                <Text style={styles.tileEmoji}>🎫</Text>
                <Text style={styles.tileText}>Bus Pass</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.tile, { backgroundColor: '#10b98115', borderColor: '#10b98140' }]}
                onPress={() => setCurrentScreen('Booking')}
              >
                <Text style={styles.tileEmoji}>🎟️</Text>
                <Text style={styles.tileText}>Book Seats</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.tile, { backgroundColor: '#eab30815', borderColor: '#eab30840' }]}
                onPress={() => setCurrentScreen('Tracking')}
              >
                <Text style={styles.tileEmoji}>📍</Text>
                <Text style={styles.tileText}>Live GPS</Text>
              </TouchableOpacity>
            </View>

            {/* Active Passes */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your Bus Passes</Text>
            </View>

            {dashLoading ? (
              <ActivityIndicator color="#0f4c81" style={{ marginVertical: 12 }} />
            ) : passes.length > 0 ? (
              passes.map((pass) => (
                <View key={pass.id} style={styles.passCard}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{pass.category.toUpperCase()} Pass ({pass.pass_type})</Text>
                    <Text style={styles.cardStatus}>{pass.status.toUpperCase()}</Text>
                  </View>
                  
                  {pass.status === 'approved' && pass.qr_code_url ? (
                    <View style={styles.qrRow}>
                      <Image source={{ uri: pass.qr_code_url }} style={styles.qrImage} />
                      <View style={{ flex: 1, paddingLeft: 12 }}>
                        <Text style={styles.qrDesc}>Conductor Scan Code:</Text>
                        <Text style={styles.qrCodeText}>{pass.qr_code_data}</Text>
                      </View>
                    </View>
                  ) : (
                    <Text style={styles.cardInfo}>Document verification status: {pass.ml_verification_status}</Text>
                  )}
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No bus passes found.</Text>
            )}
          </ScrollView>
        )}

        {/* Screen 3: BusPass */}
        {currentScreen === 'BusPass' && (
          <ScrollView style={styles.scroll}>
            <Text style={styles.screenTitle}>Apply for Digital Bus Pass</Text>

            <View style={styles.formBox}>
              <Text style={styles.label}>Select Category</Text>
              <View style={styles.selectRow}>
                {['student', 'general', 'senior_citizen'].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.selectBtn, passCategory === cat && styles.selectActive]}
                    onPress={() => setPassCategory(cat)}
                  >
                    <Text style={[styles.selectBtnText, passCategory === cat && styles.selectActiveText]}>
                      {cat.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Select Validity Type</Text>
              <View style={styles.selectRow}>
                {['monthly', 'quarterly', 'annual'].map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.selectBtn, passType === t && styles.selectActive]}
                    onPress={() => setPassType(t)}
                  >
                    <Text style={[styles.selectBtnText, passType === t && styles.selectActiveText]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity 
                style={[styles.uploadBtn, fileSimulated && { borderColor: '#10b981' }]}
                onPress={() => setFileSimulated(true)}
              >
                <Text style={styles.uploadText}>
                  {fileSimulated ? '✓ document_attached.jpg' : '📎 Attach Supporting ID Document'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.primaryBtn} 
                onPress={handleApplyPass}
                disabled={passLoading}
              >
                {passLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Apply Pass</Text>}
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => setCurrentScreen('Dashboard')} style={styles.backBtn}>
              <Text style={styles.backBtnText}>&larr; Back to Dashboard</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* Screen 4: Booking */}
        {currentScreen === 'Booking' && (
          <ScrollView style={styles.scroll}>
            <Text style={styles.screenTitle}>Book Bus Tickets</Text>

            {activeTicket ? (
              <View style={styles.ticketBox}>
                <Text style={styles.ticketTitle}>Ticket Booked Successfully!</Text>
                <Image source={{ uri: activeTicket.ticket?.qr_code_url }} style={styles.bigQr} />
                <Text style={styles.ticketRoute}>{activeTicket.source} to {activeTicket.destination}</Text>
                <Text style={styles.ticketSeat}>Seat: {activeTicket.seat_number} • Cost: ₹{activeTicket.amount}</Text>
                <TouchableOpacity onPress={() => setActiveTicket(null)} style={styles.secondaryBtn}>
                  <Text style={styles.secondaryBtnText}>Book Another Seat</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <View style={styles.formBox}>
                  <TextInput
                    placeholder="Enter Source (e.g. Chennai)"
                    placeholderTextColor="#889"
                    value={bookSource}
                    onChangeText={setBookSource}
                    style={styles.input}
                  />
                  <TextInput
                    placeholder="Enter Destination (e.g. Madurai)"
                    placeholderTextColor="#889"
                    value={bookDest}
                    onChangeText={setBookDest}
                    style={styles.input}
                  />
                  <TouchableOpacity onPress={handleSearchBuses} style={styles.primaryBtn} disabled={bookLoading}>
                    {bookLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Search Buses</Text>}
                  </TouchableOpacity>
                </View>

                {/* Display searched buses */}
                {buses.map((bus) => (
                  <TouchableOpacity 
                    key={bus.id} 
                    style={[styles.busItem, selectedBus?.id === bus.id && styles.busActive]}
                    onPress={() => setSelectedBus(bus)}
                  >
                    <Text style={styles.busName}>{bus.bus_name || bus.bus_number}</Text>
                    <Text style={styles.busRoute}>{bus.source} to {bus.destination}</Text>
                    <Text style={styles.busFare}>Fare: ₹{bus.base_fare}</Text>
                  </TouchableOpacity>
                ))}

                {selectedBus && (
                  <View style={styles.formBox}>
                    <Text style={styles.label}>Enter Seat Number (1-40)</Text>
                    <TextInput
                      placeholder="e.g. 12"
                      placeholderTextColor="#889"
                      value={selectedSeat}
                      onChangeText={setSelectedSeat}
                      keyboardType="numeric"
                      style={styles.input}
                    />
                    <TouchableOpacity onPress={handleConfirmBooking} style={styles.confirmBtn} disabled={bookLoading}>
                      <Text style={styles.btnText}>Confirm & Book</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            <TouchableOpacity onPress={() => setCurrentScreen('Dashboard')} style={styles.backBtn}>
              <Text style={styles.backBtnText}>&larr; Back to Dashboard</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* Screen 5: Tracking */}
        {currentScreen === 'Tracking' && (
          <ScrollView style={styles.scroll}>
            <Text style={styles.screenTitle}>Live Bus Tracking</Text>

            {selectedTrackBus && telemetry ? (
              <View style={styles.trackingBox}>
                <Text style={styles.trackingName}>{selectedTrackBus.bus_name || selectedTrackBus.bus_number}</Text>
                
                <View style={styles.telemetryGrid}>
                  <View style={styles.telemetryItem}>
                    <Text style={styles.telLabel}>Speed</Text>
                    <Text style={styles.telVal}>{telemetry.current_speed_kmh} km/h</Text>
                  </View>
                  <View style={styles.telemetryItem}>
                    <Text style={styles.telLabel}>Distance Left</Text>
                    <Text style={styles.telVal}>{telemetry.distance_km} km</Text>
                  </View>
                  <View style={styles.telemetryItem}>
                    <Text style={styles.telLabel}>ETA</Text>
                    <Text style={[styles.telVal, { color: '#10b981' }]}>{telemetry.eta_minutes} mins</Text>
                  </View>
                </View>

                <TouchableOpacity 
                  onPress={() => { setSelectedTrackBus(null); setTelemetry(null); }} 
                  style={styles.secondaryBtn}
                >
                  <Text style={styles.secondaryBtnText}>Choose Another Bus</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <Text style={styles.label}>Select Bus to Track:</Text>
                {trackBusesList.map((bus) => (
                  <TouchableOpacity 
                    key={bus.id} 
                    style={styles.busItem}
                    onPress={() => startTracking(bus)}
                  >
                    <Text style={styles.busName}>{bus.bus_name || bus.bus_number}</Text>
                    <Text style={styles.busRoute}>{bus.source} to {bus.destination}</Text>
                    <Text style={styles.trackingStatus}>Status: {bus.status}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TouchableOpacity onPress={() => setCurrentScreen('Dashboard')} style={styles.backBtn}>
              <Text style={styles.backBtnText}>&larr; Back to Dashboard</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    height: 60,
    backgroundColor: '#0f4c81',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#00000010',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutBtn: {
    padding: 6,
    backgroundColor: '#ffffff20',
    borderRadius: 8,
  },
  logoutBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  centerContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  scroll: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 14,
    color: '#1e293b',
    fontSize: 14,
    marginBottom: 16,
  },
  primaryBtn: {
    backgroundColor: '#0f4c81',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  secondaryBtn: {
    backgroundColor: '#e2e8f0',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  secondaryBtnText: {
    color: '#334155',
    fontSize: 15,
    fontWeight: 'bold',
  },
  confirmBtn: {
    backgroundColor: '#10b981',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  btnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '600',
  },
  demoBox: {
    marginTop: 30,
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  demoTitle: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  demoLink: {
    paddingVertical: 8,
  },
  demoLinkText: {
    color: '#0f4c81',
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  welcomeBox: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  welcomeText: {
    color: '#1e293b',
    fontSize: 20,
    fontWeight: 'bold',
  },
  welcomeSub: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 4,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  tile: {
    flex: 1,
    marginHorizontal: 4,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  tileEmoji: {
    fontSize: 22,
  },
  tileText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 6,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#1e293b',
    fontSize: 16,
    fontWeight: 'bold',
  },
  passCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    color: '#1e293b',
    fontSize: 13,
    fontWeight: 'bold',
  },
  cardStatus: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: 'bold',
  },
  cardInfo: {
    color: '#64748b',
    fontSize: 11,
  },
  qrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 12,
  },
  qrImage: {
    width: 60,
    height: 60,
    backgroundColor: '#fff',
    borderRadius: 6,
  },
  qrDesc: {
    color: '#64748b',
    fontSize: 10,
  },
  qrCodeText: {
    color: '#334155',
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 20,
  },
  formBox: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  label: {
    color: '#334155',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  selectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  selectBtn: {
    flex: 1,
    marginHorizontal: 3,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    alignItems: 'center',
  },
  selectActive: {
    borderColor: '#0f4c81',
    backgroundColor: '#0f4c8110',
  },
  selectBtnText: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: 'bold',
  },
  selectActiveText: {
    color: '#0f4c81',
  },
  uploadBtn: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  uploadText: {
    color: '#64748b',
    fontSize: 12,
  },
  backBtn: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  backBtnText: {
    color: '#64748b',
    fontSize: 13,
  },
  busItem: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  busActive: {
    borderColor: '#10b981',
  },
  busName: {
    color: '#1e293b',
    fontSize: 14,
    fontWeight: 'bold',
  },
  busRoute: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  busFare: {
    color: '#10b981',
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 6,
  },
  ticketBox: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#10b98140',
  },
  ticketTitle: {
    color: '#10b981',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  bigQr: {
    width: 140,
    height: 140,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
  },
  ticketRoute: {
    color: '#1e293b',
    fontSize: 15,
    fontWeight: 'bold',
  },
  ticketSeat: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 4,
  },
  trackingBox: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  trackingName: {
    color: '#1e293b',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  telemetryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  telemetryItem: {
    flex: 1,
    alignItems: 'center',
  },
  telLabel: {
    color: '#64748b',
    fontSize: 11,
  },
  telVal: {
    color: '#1e293b',
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 4,
  },
  trackingStatus: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 6,
  }
});
