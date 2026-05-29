import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Bus, User, LogOut, LayoutDashboard, Ticket, MapPin, Award, Menu, X, Home } from 'lucide-react';

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const isActive = (path) => location.pathname === path;

  // Track scroll for glassmorphism effect
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    setIsOpen(false);
    navigate('/');
  };

  const navLinks = [
    { label: 'Dashboard', path: '/dashboard', icon: Home },
    { label: 'Live Tracking', path: '/tracking', icon: MapPin },
    { label: 'Book Tickets', path: '/booking', icon: Ticket },
    { label: 'Bus Pass', path: '/bus-pass', icon: Award },
  ];

  return (
    <nav
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        isScrolled
          ? 'bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm'
          : 'bg-white border-b border-slate-200/80'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link to={isAuthenticated ? '/dashboard' : '/'} className="flex items-center space-x-2.5 group">
              <div className="bg-gradient-to-br from-tn-primary to-blue-600 p-2 rounded-xl shadow-md group-hover:shadow-glow transition-shadow duration-300">
                <Bus className="h-5 w-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-display font-bold text-lg tracking-tight text-tn-text leading-none">
                  Chennai One
                </span>
                <span className="text-[10px] font-semibold text-tn-text-muted tracking-wider uppercase leading-none mt-0.5">
                  Smart Transit
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-1">
            {isAuthenticated && navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`relative flex items-center space-x-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActive(link.path)
                    ? 'bg-tn-primary/10 text-tn-primary'
                    : 'text-tn-text-secondary hover:bg-slate-100 hover:text-tn-text'
                }`}
              >
                <link.icon className="h-4 w-4" />
                <span>{link.label}</span>
                {isActive(link.path) && (
                  <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-tn-primary rounded-full" />
                )}
              </Link>
            ))}

            {isAuthenticated && user?.role === 'admin' && (
              <Link
                to="/admin"
                className={`relative flex items-center space-x-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActive('/admin')
                    ? 'bg-tn-primary/10 text-tn-primary'
                    : 'text-tn-text-secondary hover:bg-slate-100 hover:text-tn-text'
                }`}
              >
                <LayoutDashboard className="h-4 w-4" />
                <span>Admin</span>
                {isActive('/admin') && (
                  <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-tn-primary rounded-full" />
                )}
              </Link>
            )}
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-3">
            {isAuthenticated ? (
              <div className="flex items-center space-x-3">
                <Link
                  to="/profile"
                  className="flex items-center space-x-2.5 px-2 py-1.5 rounded-xl hover:bg-slate-50 transition-colors group"
                >
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-tn-primary to-blue-600 flex items-center justify-center font-bold text-white text-sm border-2 border-white shadow-sm">
                    {user?.full_name?.charAt(0) || 'U'}
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-semibold text-tn-text leading-none group-hover:text-tn-primary transition-colors">
                      {user?.full_name?.split(' ')[0]}
                    </div>
                    <div className="text-[10px] text-tn-text-muted capitalize leading-none mt-0.5">
                      {user?.role}
                    </div>
                  </div>
                </Link>
                <button
                  onClick={handleLogout}
                  className="p-2 text-tn-text-muted hover:text-red-500 hover:bg-red-50 rounded-xl transition-all duration-200"
                  title="Logout"
                >
                  <LogOut className="h-4.5 w-4.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="btn-secondary text-sm py-2 px-4"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="btn-primary text-sm py-2 px-4"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-xl text-tn-text-secondary hover:text-tn-text hover:bg-slate-100 transition-all duration-200"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-out-expo ${
          isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="bg-white border-t border-slate-100 px-4 pt-2 pb-4 space-y-1">
          {isAuthenticated && navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                isActive(link.path)
                  ? 'bg-tn-primary/10 text-tn-primary'
                  : 'text-tn-text-secondary hover:bg-slate-50 hover:text-tn-text'
              }`}
            >
              <link.icon className="h-5 w-5" />
              <span>{link.label}</span>
            </Link>
          ))}

          {isAuthenticated && user?.role === 'admin' && (
            <Link
              to="/admin"
              className={`flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                isActive('/admin')
                  ? 'bg-tn-primary/10 text-tn-primary'
                  : 'text-tn-text-secondary hover:bg-slate-50 hover:text-tn-text'
              }`}
            >
              <LayoutDashboard className="h-5 w-5" />
              <span>Admin Panel</span>
            </Link>
          )}

          {isAuthenticated ? (
            <div className="pt-3 mt-2 border-t border-slate-100 space-y-2">
              <Link
                to="/profile"
                className="flex items-center space-x-3 px-3 py-2.5 rounded-xl hover:bg-slate-50"
              >
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-tn-primary to-blue-600 flex items-center justify-center font-bold text-white">
                  {user?.full_name?.charAt(0) || 'U'}
                </div>
                <div>
                  <div className="text-sm font-bold text-tn-text">{user?.full_name}</div>
                  <div className="text-xs text-tn-text-muted">{user?.email || user?.phone}</div>
                </div>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-5 w-5" />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <div className="pt-3 mt-2 border-t border-slate-100 flex flex-col space-y-2">
              <Link to="/login" className="btn-secondary w-full text-center text-sm">
                Login
              </Link>
              <Link to="/register" className="btn-primary w-full text-center text-sm">
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
