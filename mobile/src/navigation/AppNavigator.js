import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import DashboardScreen from '../screens/DashboardScreen';
import BusPassScreen from '../screens/BusPassScreen';
import BookingScreen from '../screens/BookingScreen';
import TrackingScreen from '../screens/TrackingScreen';
import LoginScreen from '../screens/LoginScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0f4c81',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#e2e8f0',
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          paddingBottom: 4,
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        }
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={DashboardScreen} 
        options={{ tabBarIcon: () => <Text style={{fontSize: 20}}>🏠</Text> }}
      />
      <Tab.Screen 
        name="BusPass" 
        component={BusPassScreen} 
        options={{ title: 'Bus Pass', tabBarIcon: () => <Text style={{fontSize: 20}}>🎟️</Text> }}
      />
      <Tab.Screen 
        name="Booking" 
        component={BookingScreen} 
        options={{ title: 'Book Ticket', tabBarIcon: () => <Text style={{fontSize: 20}}>🚌</Text> }}
      />
      <Tab.Screen 
        name="Tracking" 
        component={TrackingScreen} 
        options={{ title: 'Live Track', tabBarIcon: () => <Text style={{fontSize: 20}}>📍</Text> }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="MainTabs" component={MainTabs} />
    </Stack.Navigator>
  );
}
