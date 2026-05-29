import { create } from 'zustand';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

/**
 * Validate stored token format (basic check — not a full JWT decode).
 */
function isValidStoredToken(token) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  return parts.length === 3;
}

// Validate stored auth on initial load
const storedToken = localStorage.getItem('tn_token');
const storedUser = (() => {
  try {
    return JSON.parse(localStorage.getItem('tn_user'));
  } catch {
    return null;
  }
})();

const isValidSession = isValidStoredToken(storedToken) && storedUser;

// Clear invalid sessions
if (!isValidSession) {
  localStorage.removeItem('tn_token');
  localStorage.removeItem('tn_user');
}

export const useAuthStore = create((set, get) => ({
  user: isValidSession ? storedUser : null,
  token: isValidSession ? storedToken : null,
  isAuthenticated: isValidSession,
  loading: false,
  error: null,

  login: async (username, password) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/auth/login/json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: username.includes('@') ? username : null,
          phone: !username.includes('@') ? username : null,
          password: password,
          full_name: 'Login Form Placeholder',
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Login failed');
      }

      localStorage.setItem('tn_token', data.access_token);
      localStorage.setItem('tn_user', JSON.stringify(data.user));

      set({
        token: data.access_token,
        user: data.user,
        isAuthenticated: true,
        loading: false,
      });
      return data.user;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  register: async (fullName, email, phone, password, dob, gender, address, city) => {
    set({ loading: true, error: null });
    try {
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
          date_of_birth: dob ? new Date(dob).toISOString() : null,
          gender: gender || null,
          address: address || null,
          city: city || 'Chennai'
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Registration failed');
      }

      set({ loading: false });
      return data;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem('tn_token');
    localStorage.removeItem('tn_user');
    set({ token: null, user: null, isAuthenticated: false, error: null });
  },

  updateProfile: async (profileData) => {
    const { token } = get();
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(profileData),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Profile update failed');
      }

      localStorage.setItem('tn_user', JSON.stringify(data));
      set({ user: data, loading: false });
      return data;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));
