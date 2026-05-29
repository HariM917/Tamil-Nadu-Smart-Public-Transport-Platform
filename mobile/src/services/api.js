import { Platform } from 'react-native';

// For Android emulator, 10.0.2.2 points to localhost of host machine
// For iOS simulator, localhost works
// For physical devices, you should use your host machine's local IP (e.g. 192.168.x.x)
const API_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
const API_URL = `http://${API_HOST}:8000/api`;

let userToken = null;
let userData = null;

export const mobileAuth = {
  getToken: () => userToken,
  getUser: () => userData,
  setToken: (token) => { userToken = token; },
  setUser: (user) => { userData = user; },
};

const getHeaders = () => {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (userToken) {
    headers['Authorization'] = `Bearer ${userToken}`;
  }
  return headers;
};

export const apiService = {
  login: async (username, password) => {
    const response = await fetch(`${API_URL}/auth/login/json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: username.includes('@') ? username : null,
        phone: !username.includes('@') ? username : null,
        password: password,
        full_name: 'Mobile Client'
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Login failed');
    userToken = data.access_token;
    userData = data.user;
    return data;
  },

  register: async (fullName, email, phone, password) => {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        full_name: fullName,
        email: email || null,
        phone: phone || null,
        password: password,
        city: 'Chennai'
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Registration failed');
    return data;
  },

  getMyPasses: async () => {
    const response = await fetch(`${API_URL}/bus-pass/my-passes`, {
      headers: getHeaders(),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Failed to fetch passes');
    return data;
  },

  applyForPass: async (category, passType, docType, fileBase64, fileName) => {
    const token = mobileAuth.getToken();
    // Native mobile handles multipart upload by building FormData
    const formData = new FormData();
    formData.append('category', category);
    formData.append('pass_type', passType);
    formData.append('document_type', docType);
    
    // Simulate mobile file wrapper object
    formData.append('file', {
      uri: 'file://mock-path/' + fileName,
      type: 'image/jpeg',
      name: fileName
    });

    const response = await fetch(`${API_URL}/bus-pass/apply`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Failed to submit pass');
    return data;
  },

  searchBuses: async (source, destination) => {
    const response = await fetch(`${API_URL}/booking/search?source=${encodeURIComponent(source)}&destination=${encodeURIComponent(destination)}`, {
      headers: getHeaders(),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Search failed');
    return data;
  },

  createBooking: async (busId, source, destination, seatNumber, date) => {
    const response = await fetch(`${API_URL}/booking/create`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        bus_id: busId,
        source,
        destination,
        travel_date: new Date(date).toISOString(),
        seat_number: seatNumber,
        passengers: 1
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Booking failed');
    return data;
  },

  confirmPayment: async (bookingId, transactionId) => {
    const response = await fetch(`${API_URL}/booking/${bookingId}/pay?transaction_id=${transactionId}`, {
      method: 'POST',
      headers: getHeaders(),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Failed to confirm payment');
    return data;
  },

  getBookingHistory: async () => {
    const response = await fetch(`${API_URL}/booking/history`, {
      headers: getHeaders(),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Failed to fetch history');
    return data;
  },

  trackBus: async (busId) => {
    const response = await fetch(`${API_URL}/buses/track/${busId}`, {
      headers: getHeaders(),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Tracking request failed');
    return data;
  }
};
