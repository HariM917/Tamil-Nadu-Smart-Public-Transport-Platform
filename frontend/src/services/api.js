const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const getHeaders = () => {
  const token = localStorage.getItem('tn_token');
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

/**
 * Centralized API request handler with timeout and error handling.
 */
async function apiRequest(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      // Handle 401 - token expired
      if (response.status === 401) {
        localStorage.removeItem('tn_token');
        localStorage.removeItem('tn_user');
        window.location.href = '/login';
        throw new Error('Session expired. Please log in again.');
      }
      throw new Error(data?.detail || `Request failed (${response.status})`);
    }

    return data;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export const apiService = {
  // ── Bus Pass ────────────────────────────
  applyForPass: async (formData) => {
    const token = localStorage.getItem('tn_token');
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/bus-pass/apply`, {
      method: 'POST',
      headers,
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Bus pass application failed');
    return data;
  },

  getMyPasses: () =>
    apiRequest(`${API_URL}/bus-pass/my-passes`, { headers: getHeaders() }),

  renewPass: (passId) =>
    apiRequest(`${API_URL}/bus-pass/renew/${passId}`, {
      method: 'POST',
      headers: getHeaders(),
    }),

  payPass: (passId) =>
    apiRequest(`${API_URL}/bus-pass/${passId}/pay`, {
      method: 'POST',
      headers: getHeaders(),
    }),

  // ── Booking ─────────────────────────────
  searchBuses: (source, destination) =>
    apiRequest(
      `${API_URL}/booking/search?source=${encodeURIComponent(source)}&destination=${encodeURIComponent(destination)}`,
      { headers: getHeaders() }
    ),

  getBookedSeats: (busId, travelDate) =>
    apiRequest(
      `${API_URL}/booking/seats?bus_id=${busId}&travel_date=${travelDate}`,
      { headers: getHeaders() }
    ),

  createBooking: (bookingData) =>
    apiRequest(`${API_URL}/booking/create`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(bookingData),
    }),

  payBooking: (bookingId, transactionId) =>
    apiRequest(
      `${API_URL}/booking/${bookingId}/pay?transaction_id=${encodeURIComponent(transactionId)}`,
      { method: 'POST', headers: getHeaders() }
    ),

  cancelBooking: (bookingId) =>
    apiRequest(`${API_URL}/booking/${bookingId}/cancel`, {
      method: 'POST',
      headers: getHeaders(),
    }),

  getBookingHistory: () =>
    apiRequest(`${API_URL}/booking/history`, { headers: getHeaders() }),

  // ── Live Tracking ───────────────────────
  listBuses: () =>
    apiRequest(`${API_URL}/buses/list`, { headers: getHeaders() }),

  searchBusesByQuery: (query) =>
    apiRequest(
      `${API_URL}/buses/search?query=${encodeURIComponent(query)}`,
      { headers: getHeaders() }
    ),

  trackBus: async (busId, destination = '') => {
    let url = `${API_URL}/buses/track/${busId}`;
    if (destination) {
      url += `?destination=${encodeURIComponent(destination)}`;
    }
    return apiRequest(url, { headers: getHeaders() });
  },

  // ── Admin ───────────────────────────────
  adminGetPasses: (statusFilter = '') => {
    let url = `${API_URL}/admin/passes`;
    if (statusFilter) url += `?status=${statusFilter}`;
    return apiRequest(url, { headers: getHeaders() });
  },

  adminReviewPass: (passId, reviewData) =>
    apiRequest(`${API_URL}/admin/passes/${passId}/review`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(reviewData),
    }),

  adminGetUsers: () =>
    apiRequest(`${API_URL}/admin/users`, { headers: getHeaders() }),

  adminGetBookings: () =>
    apiRequest(`${API_URL}/admin/bookings`, { headers: getHeaders() }),

  adminGetAnalytics: () =>
    apiRequest(`${API_URL}/admin/analytics`, { headers: getHeaders() }),

  adminCreateBus: (busData) =>
    apiRequest(`${API_URL}/admin/buses`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(busData),
    }),

  adminUpdateBus: (busId, busData) =>
    apiRequest(`${API_URL}/admin/buses/${busId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(busData),
    }),

  adminDeleteBus: async (busId) => {
    const response = await fetch(`${API_URL}/admin/buses/${busId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.detail || 'Failed to delete bus');
    }
    return true;
  },

  verifyAadhaar: async (aadhaarNumber, file) => {
    const token = localStorage.getItem('tn_token');
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const formData = new FormData();
    formData.append('aadhaar_number', aadhaarNumber);
    formData.append('file', file);

    const response = await fetch(`${API_URL}/auth/verify-aadhaar`, {
      method: 'POST',
      headers,
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Aadhaar verification failed');
    return data;
  },

  adminGetFleetAnalytics: () =>
    apiRequest(`${API_URL}/admin/fleet-analytics`, { headers: getHeaders() }),
};
