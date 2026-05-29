import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

// Providers
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './components/ToastProvider';

// Layout
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import BusPass from './pages/BusPass';
import Booking from './pages/Booking';
import LiveTracking from './pages/LiveTracking';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';

// Route Guards
function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
}

// Page title updater
const PAGE_TITLES = {
  '/': 'TN Smart Transport — Tamil Nadu Smart Public Transit',
  '/login': 'Sign In — TN Smart Transport',
  '/register': 'Create Account — TN Smart Transport',
  '/dashboard': 'Dashboard — TN Smart Transport',
  '/bus-pass': 'Digital Bus Pass — TN Smart Transport',
  '/booking': 'Book Tickets — TN Smart Transport',
  '/tracking': 'Live Tracking — TN Smart Transport',
  '/profile': 'My Profile — TN Smart Transport',
  '/admin': 'Admin Panel — TN Smart Transport',
};

function PageTitleUpdater() {
  const location = useLocation();

  useEffect(() => {
    const title = PAGE_TITLES[location.pathname] || 'TN Smart Transport';
    document.title = title;
  }, [location.pathname]);

  return null;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <Router>
          <PageTitleUpdater />
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-grow">
              <Routes>
                {/* Public */}
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Passenger routes */}
                <Route
                  path="/dashboard"
                  element={
                    <PrivateRoute>
                      <Dashboard />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/bus-pass"
                  element={
                    <PrivateRoute>
                      <BusPass />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/booking"
                  element={
                    <PrivateRoute>
                      <Booking />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/tracking"
                  element={
                    <PrivateRoute>
                      <LiveTracking />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <PrivateRoute>
                      <Profile />
                    </PrivateRoute>
                  }
                />

                {/* Admin routes */}
                <Route
                  path="/admin"
                  element={
                    <AdminRoute>
                      <AdminDashboard />
                    </AdminRoute>
                  }
                />

                {/* Catch-all */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </Router>
      </ToastProvider>
    </ErrorBoundary>
  );
}
