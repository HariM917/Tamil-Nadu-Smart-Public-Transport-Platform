import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, TouchableOpacity, 
  RefreshControl, Image
} from 'react-native';
import { apiService, mobileAuth } from '../services/api';

export default function DashboardScreen({ navigation }) {
  const [user, setUser] = useState(mobileAuth.getUser());
  const [passes, setPasses] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [passList, bookingList] = await Promise.all([
        apiService.getMyPasses(),
        apiService.getBookingHistory(),
      ]);
      setPasses(passList || []);
      setBookings(bookingList || []);
    } catch (e) {
      console.log('Dashboard fetch error', e);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    await mobileAuth.logout();
    navigation.replace('Login');
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Vanakkam,</Text>
          <Text style={styles.name}>{user?.full_name || 'Passenger'}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={[styles.actionCard, { borderColor: '#bfdbfe', backgroundColor: '#eff6ff' }]}
          onPress={() => navigation.navigate('BusPass')}
        >
          <Text style={styles.actionEmoji}>🎟️</Text>
          <Text style={styles.actionTitle}>Bus Pass</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionCard, { borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' }]}
          onPress={() => navigation.navigate('Booking')}
        >
          <Text style={styles.actionEmoji}>🚌</Text>
          <Text style={styles.actionTitle}>Book Ticket</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionCard, { borderColor: '#fef08a', backgroundColor: '#fefce8' }]}
          onPress={() => navigation.navigate('Tracking')}
        >
          <Text style={styles.actionEmoji}>📍</Text>
          <Text style={styles.actionTitle}>Live Track</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Bus Passes</Text>
        {passes.length > 0 ? (
          passes.map(pass => (
            <View key={pass.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{pass.category.replace('_', ' ').toUpperCase()}</Text>
                <View style={[styles.badge, pass.status === 'approved' ? styles.badgeSuccess : styles.badgeWarning]}>
                  <Text style={[styles.badgeText, pass.status === 'approved' ? styles.badgeSuccessText : styles.badgeWarningText]}>
                    {pass.status}
                  </Text>
                </View>
              </View>
              
              {pass.status === 'approved' && pass.qr_code_url ? (
                <View style={styles.qrContainer}>
                  <Image source={{ uri: pass.qr_code_url }} style={styles.qrImage} />
                  <Text style={styles.qrSubtext}>Valid until: {new Date(pass.valid_until).toLocaleDateString()}</Text>
                </View>
              ) : (
                <Text style={styles.pendingText}>Pending officer review (OCR matched)</Text>
              )}
            </View>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No active bus passes.</Text>
            <TouchableOpacity onPress={() => navigation.navigate('BusPass')}>
              <Text style={styles.linkText}>Apply for a pass →</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Bookings</Text>
        {bookings.length > 0 ? (
          bookings.slice(0, 3).map(booking => (
            <View key={booking.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.routeText}>{booking.source} → {booking.destination}</Text>
                <Text style={styles.priceText}>₹{booking.amount}</Text>
              </View>
              <Text style={styles.dateText}>
                {new Date(booking.travel_date).toLocaleDateString()} • Seat {booking.seat_number}
              </Text>
            </View>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No recent bookings.</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Booking')}>
              <Text style={styles.linkText}>Book a ticket →</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 24,
    paddingTop: 40,
    backgroundColor: '#0f4c81',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  greeting: {
    color: '#93c5fd',
    fontSize: 14,
    fontWeight: '600',
  },
  name: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  logoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  logoutText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  quickActions: {
    flexDirection: 'row',
    padding: 20,
    justifyContent: 'space-between',
    marginTop: -10,
  },
  actionCard: {
    width: '31%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  actionEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
  },
  section: {
    padding: 20,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f4c81',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeSuccess: { backgroundColor: '#dcfce7' },
  badgeSuccessText: { color: '#16a34a', fontSize: 10, fontWeight: 'bold' },
  badgeWarning: { backgroundColor: '#fef3c7' },
  badgeWarningText: { color: '#d97706', fontSize: 10, fontWeight: 'bold' },
  qrContainer: {
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  qrImage: {
    width: 100,
    height: 100,
  },
  qrSubtext: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 8,
  },
  pendingText: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
  },
  routeText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  priceText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#16a34a',
  },
  dateText: {
    fontSize: 12,
    color: '#64748b',
  },
  emptyCard: {
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
    marginBottom: 8,
  },
  linkText: {
    color: '#0f4c81',
    fontWeight: 'bold',
    fontSize: 14,
  }
});
