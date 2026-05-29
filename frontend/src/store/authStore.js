import { create } from 'zustand';
import { supabase } from '../services/supabaseClient';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

/**
 * Basic check for token presence.
 */
function isValidStoredToken(token) {
  return token && typeof token === 'string' && token.length > 10;
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
      // 1. Sign in with Supabase Auth
      const { data, error: sbError } = await supabase.auth.signInWithPassword({
        email: username,
        password: password,
      });

      if (sbError) {
        throw new Error(sbError.message);
      }

      const token = data.session.access_token;

      // 2. Fetch/Provision user profile from public backend using the Supabase JWT
      const response = await fetch(`${API_URL}/auth/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const profileData = await response.json();
      if (!response.ok) {
        throw new Error(profileData.detail || 'Failed to fetch user profile');
      }

      localStorage.setItem('tn_token', token);
      localStorage.setItem('tn_user', JSON.stringify(profileData));

      set({
        token: token,
        user: profileData,
        isAuthenticated: true,
        loading: false,
      });
      return profileData;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  register: async (fullName, email, phone, password, dob, gender, address, city) => {
    set({ loading: true, error: null });
    try {
      // 1. Sign up with Supabase Auth
      const { data, error: sbError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            full_name: fullName,
            phone: phone,
            city: city || 'Chennai',
            address: address,
            dob: dob,
            gender: gender,
          },
        },
      });

      if (sbError) {
        throw new Error(sbError.message);
      }

      // 2. Also register in the backend database (for immediate seeding/consistency)
      // This is a backup register call to ensure the record exists in the public DB immediately.
      try {
        await fetch(`${API_URL}/auth/register`, {
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
            city: city || 'Chennai',
          }),
        });
      } catch (backendErr) {
        console.warn('Backend sync failed on register (profile will auto-create on login):', backendErr);
      }

      set({ loading: false });
      return data.user;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  logout: async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Supabase signOut failed:', err);
    }
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

  syncUser: async () => {
    const { token } = get();
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('tn_user', JSON.stringify(data));
        set({ user: data });
      }
    } catch (err) {
      console.warn('Failed to sync user profile:', err);
    }
  },

  clearError: () => set({ error: null }),
}));
