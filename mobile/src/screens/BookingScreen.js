import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, TouchableOpacity, 
  TextInput, ActivityIndicator, Alert
} from 'react-native';
import { apiService } from '../services/api';

export default function BookingScreen() {
  const [source, setSource] = useState('Chennai');
  const [destination, setDestination] = useState('Madurai');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedBus, setSelectedBus] = useState(null);
  
  const handleSearch = async () => {
    setLoading(true);
    setSelectedBus(null);
    try {
      const results = await apiService.searchBuses(source, destination);
      setBuses(results);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async (bus) => {
    try {
      Alert.alert(
        'Confirm Booking', 
        `Book a ticket on ${bus.bus_name} for ₹${bus.base_fare}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Confirm & Pay', 
            onPress: async () => {
              try {
                const res = await apiService.createBooking(bus.id, bus.source, bus.destination, '1A', date);
                await apiService.confirmPayment(res.id, 'TXN_APP_' + Math.floor(Math.random()*1000));
                Alert.alert('Success', 'Ticket booked successfully!');
                handleSearch(); // refresh
              } catch(e) {
                Alert.alert('Payment Error', e.message);
              }
            }
          }
        ]
      );
    } catch (e) {
      console.log(e);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Book Tickets</Text>
      </View>

      <View style={styles.searchBox}>
        <TextInput
          style={styles.input}
          placeholder="From (e.g. Chennai)"
          value={source}
          onChangeText={setSource}
        />
        <TextInput
          style={styles.input}
          placeholder="To (e.g. Madurai)"
          value={destination}
          onChangeText={setDestination}
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.searchBtnText}>Search Buses</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.resultsList} contentContainerStyle={styles.listContent}>
        {buses.length > 0 ? (
          <Text style={styles.resultsHeader}>Available Routes</Text>
        ) : null}
        
        {buses.map(bus => (
          <View key={bus.id} style={styles.busCard}>
            <View style={styles.busCardHeader}>
              <Text style={styles.busName}>{bus.bus_name}</Text>
              <Text style={styles.price}>₹{bus.base_fare}</Text>
            </View>
            <View style={styles.routeRow}>
              <Text style={styles.routeText}>{bus.source}</Text>
              <Text style={styles.arrow}>→</Text>
              <Text style={styles.routeText}>{bus.destination}</Text>
            </View>
            <TouchableOpacity style={styles.bookBtn} onPress={() => handleBook(bus)}>
              <Text style={styles.bookBtnText}>Select Seat</Text>
            </TouchableOpacity>
          </View>
        ))}
        
        {!loading && buses.length === 0 ? (
          <Text style={styles.emptyText}>No routes found. Try searching.</Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 20,
    backgroundColor: '#0f4c81',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  searchBox: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  input: {
    backgroundColor: '#f1f5f9',
    padding: 14,
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 15,
  },
  searchBtn: {
    backgroundColor: '#0f4c81',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  searchBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  resultsList: {
    flex: 1,
  },
  listContent: {
    padding: 20,
  },
  resultsHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },
  busCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  busCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  busName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#16a34a',
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  routeText: {
    fontSize: 14,
    color: '#64748b',
  },
  arrow: {
    marginHorizontal: 8,
    color: '#cbd5e1',
  },
  bookBtn: {
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  bookBtnText: {
    color: '#0f4c81',
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    color: '#94a3b8',
    marginTop: 40,
  }
});
