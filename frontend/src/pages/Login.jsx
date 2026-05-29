import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Mail, Lock, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';

const SHOW_DEMO = import.meta.env.VITE_SHOW_DEMO_CREDENTIALS === 'true';

export default function Login() {
  const { login, isAuthenticated, loading, error, clearError } = useAuthStore();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    clearError();
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) return;

    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err) {
      // Handled by store state
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative">
      <div className="absolute inset-0 gradient-mesh -z-10" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md animate-fade-in-up">
        <h2 className="text-center font-display font-extrabold text-3xl text-tn-text tracking-tight">
          Sign in to your account
        </h2>
        <p className="mt-2 text-center text-sm text-tn-text-secondary">
          Or{' '}
          <Link to="/register" className="font-semibold text-tn-primary hover:text-tn-primary-dark transition-colors">
            register a new smart transit ID
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        <div className="glass-panel p-8 rounded-2xl">
          {error && (
            <div className="alert alert-error mb-6">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="form-label">Email Address or Phone Number</label>
              <div className="relative">
                <input
                  id="login-username"
                  type="text"
                  required
                  placeholder="e.g. admin@tn.gov.in"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="form-input"
                />
                <Mail className="absolute left-3 top-3.5 h-4 w-4 text-tn-text-muted" />
              </div>
            </div>

            <div>
              <label className="form-label">Password</label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input pr-10"
                />
                <Lock className="absolute left-3 top-3.5 h-4 w-4 text-tn-text-muted" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 p-0.5 text-tn-text-muted hover:text-tn-text transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>

          {/* Demo credentials */}
          {SHOW_DEMO && (
            <div className="mt-8 pt-6 border-t border-slate-100 space-y-2">
              <h4 className="text-xs font-bold text-tn-text-muted uppercase tracking-wider">Demo Credentials</h4>
              <div className="flex flex-col gap-2 text-xs">
                <button
                  id="demo-admin"
                  onClick={() => { setUsername('admin@tn.gov.in'); setPassword('admin_password_123'); }}
                  className="w-full px-3 py-2.5 rounded-lg bg-violet-50 border border-violet-100 text-violet-700 hover:bg-violet-100 text-left font-semibold transition-colors"
                >
                  Officer Portal (admin@tn.gov.in)
                </button>
                <button
                  id="demo-user"
                  onClick={() => { setUsername('user@gmail.com'); setPassword('user1234'); }}
                  className="w-full px-3 py-2.5 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 hover:bg-emerald-100 text-left font-semibold transition-colors"
                >
                  Passenger Portal (user@gmail.com)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
