import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { User, Mail, Phone, Lock, Calendar, AlertCircle, Loader2, Eye, EyeOff, CheckCircle } from 'lucide-react';

export default function Register() {
  const { register, isAuthenticated, loading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Chennai');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    clearError();
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await register(fullName, email, phone, password, dob, gender, address, city);
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      // Error handled in store state
    }
  };

  // Password strength
  const getPasswordStrength = () => {
    if (!password) return { width: '0%', color: 'bg-slate-200', label: '' };
    if (password.length < 4) return { width: '25%', color: 'bg-red-500', label: 'Weak' };
    if (password.length < 6) return { width: '50%', color: 'bg-amber-500', label: 'Fair' };
    if (password.length < 8) return { width: '75%', color: 'bg-blue-500', label: 'Good' };
    return { width: '100%', color: 'bg-emerald-500', label: 'Strong' };
  };

  const strength = getPasswordStrength();

  return (
    <div className="min-h-[85vh] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative">
      <div className="absolute inset-0 gradient-mesh -z-10" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md animate-fade-in-up">
        <h2 className="text-center font-display font-extrabold text-3xl text-tn-text tracking-tight">
          Create transit ID
        </h2>
        <p className="mt-2 text-center text-sm text-tn-text-secondary">
          Or{' '}
          <Link to="/login" className="font-semibold text-tn-primary hover:text-tn-primary-dark transition-colors">
            sign in to existing account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl px-4 sm:px-0 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        <div className="glass-panel p-8 rounded-2xl">
          {error && (
            <div className="alert alert-error mb-6">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="alert alert-success mb-6">
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
              <span>Registration successful! Redirecting to login...</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="form-label">Full Name *</label>
                <div className="relative">
                  <input
                    id="register-name"
                    type="text"
                    required
                    placeholder="Karthik Rajan"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="form-input"
                  />
                  <User className="absolute left-3 top-3.5 h-4 w-4 text-tn-text-muted" />
                </div>
              </div>

              <div>
                <label className="form-label">Email Address</label>
                <div className="relative">
                  <input
                    id="register-email"
                    type="email"
                    placeholder="john@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-input"
                  />
                  <Mail className="absolute left-3 top-3.5 h-4 w-4 text-tn-text-muted" />
                </div>
              </div>

              <div>
                <label className="form-label">Phone Number (+91)</label>
                <div className="relative">
                  <input
                    id="register-phone"
                    type="tel"
                    placeholder="9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="form-input"
                  />
                  <Phone className="absolute left-3 top-3.5 h-4 w-4 text-tn-text-muted" />
                </div>
              </div>

              <div>
                <label className="form-label">Password *</label>
                <div className="relative">
                  <input
                    id="register-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Min 6 characters"
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
                {password && (
                  <div className="mt-2 space-y-1">
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${strength.color} rounded-full transition-all duration-300`} style={{ width: strength.width }} />
                    </div>
                    <p className="text-[10px] font-semibold text-tn-text-muted">{strength.label}</p>
                  </div>
                )}
              </div>

              <div>
                <label className="form-label">Date of Birth</label>
                <div className="relative">
                  <input
                    id="register-dob"
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="form-input"
                  />
                  <Calendar className="absolute left-3 top-3.5 h-4 w-4 text-tn-text-muted" />
                </div>
              </div>

              <div>
                <label className="form-label">Gender</label>
                <select
                  id="register-gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="form-select"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="form-label">City</label>
                <input
                  id="register-city"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="form-input !pl-4"
                />
              </div>

              <div>
                <label className="form-label">Address</label>
                <input
                  id="register-address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="form-input !pl-4"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                id="register-submit"
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Registering...</span>
                  </>
                ) : (
                  <span>Create Account</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
