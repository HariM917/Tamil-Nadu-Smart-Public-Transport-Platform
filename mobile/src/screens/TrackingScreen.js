import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, TouchableOpacity, 
  ActivityIndicator, RefreshControl
} from 'react-native';
import { apiService } from '../services/api';

export default function TrackingScreen() {
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [trackingData, setTrackingData] = useState(null);
  const [selectedBus, setSelectedBus] = useState(null);

  useEffect(() => {
    loadBuses();
  }, []);

  const loadBuses = async () => {
    try {
      const data = await apiService.listBuses();
      setBuses(data);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBuses();
    setRefreshing(false);
  };

  const trackBus = async (bus) => {
    setSelectedBus(bus);
    setTrackingData(null);
    try {
      const data = await apiService.trackBus(bus.id);
      setTrackingData(data.tracking);
    } catch (e) {
      console.log(e);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Live Bus Tracking</Text>
      </View>

      {selectedBus && trackingData && (
        <View style={styles.telemetryBox}>
          <View style={styles.telemetryHeader}>
            <Text style={styles.telemetryTitle}>{selectedBus.bus_name}</Text>
            <TouchableOpacity onPress={() => setSelectedBus(null)}>
              <Text style={styles.closeBtn}>Close</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.metricsRow}>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Speed</Text>
              <Text style={styles.metricValue}>{trackingData.current_speed_kmh} <Text style={styles.metricUnit}>km/h</Text></Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Distance Left</Text>
              <Text style={styles.metricValue}>{trackingData.distance_km} <Text style={styles.metricUnit}>km</Text></Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>ETA</Text>
              <Text style={[styles.metricValue, { color: '#16a34a' }]}>{trackingData.eta_minutes} <Text style={[styles.metricUnit, { color: '#16a34a' }]}>mins</Text></Text>
            </View>
          </View>

          <View style={styles.mapPlaceholder}>
            <Text style={styles.mapText}>📍 Map View</Text>
            <Text style={styles.mapSubtext}>{trackingData.current_lat}, {trackingData.current_lng}</Text>
          </View>
        </View>
      )}

      <ScrollView 
        style={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.listHeader}>Active Buses</Text>
        
        {loading ? <ActivityIndicator style={{ marginTop: 40 }} /> : null}

        {buses.map(bus => (
          <TouchableOpacity 
            key={bus.id} 
            style={[styles.busItem, selectedBus?.id === bus.id && styles.busItemSelected]}
            onPress={() => trackBus(bus)}
          >
            <View>
              <Text style={[styles.busName, selectedBus?.id === bus.id && styles.busNameSelected]}>
                {bus.bus_name}
              </Text>
              <Text style={[styles.busRoute, selectedBus?.id === bus.id && styles.busRouteSelected]}>
                {bus.source} → {bus.destination}
              </Text>
            </View>
            <View style={[styles.statusBadge, bus.is_active ? styles.badgeActive : styles.badgeInactive]}>
              <Text style={[styles.statusText, bus.is_active ? styles.textActive : styles.textInactive]}>
                {bus.status}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
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
  telemetryBox: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    elevation: 4,
  },
  telemetryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  telemetryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  closeBtn: {
    color: '#ef4444',
    fontWeight: 'bold',
    fontSize: 14,
  },
  metricsRow: {
    flexDirection: 'row',
    padding: 16,
    justifyContent: 'space-between',
  },
  metric: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  metricUnit: {
    fontSize: 12,
    fontWeight: 'normal',
  },
  metricDivider: {
    width: 1,
    backgroundColor: '#e2e8f0',
  },
  mapPlaceholder: {
    backgroundColor: '#f1f5f9',
    height: 120,
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  mapText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#64748b',
  },
  mapSubtext: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  list: {
    flex: 1,
    padding: 20,
  },
  listHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },
  busItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  busItemSelected: {
    backgroundColor: '#0f4c81',
    borderColor: '#0f4c81',
  },
  busName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  busNameSelected: {
    color: '#fff',
  },
  busRoute: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  busRouteSelected: {
    color: '#bfdbfe',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeActive: { backgroundColor: '#dcfce7' },
  textActive: { color: '#16a34a', fontSize: 10, fontWeight: 'bold' },
  badgeInactive: { backgroundColor: '#fef3c7' },
  textInactive: { color: '#d97706', fontSize: 10, fontWeight: 'bold' }
});
