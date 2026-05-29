import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { User, Mail, Phone, Calendar, Loader2, Save, MapPin } from 'lucide-react';
import { useToast } from '../components/ToastProvider';

export default function Profile() {
  const { user, updateProfile, loading } = useAuthStore();
  const toast = useToast();
  
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    date_of_birth: user?.date_of_birth ? new Date(user.date_of_birth).toISOString().split('T')[0] : '',
    gender: user?.gender || '',
    address: user?.address || '',
    city: user?.city || '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateProfile(formData);
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to update profile');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Profile Header */}
      <div className="glass-panel p-8 rounded-3xl relative overflow-hidden animate-fade-in-up">
        <div className="absolute top-0 right-0 w-64 h-64 bg-tn-primary/5 rounded-full blur-[50px] -z-10 translate-x-1/2 -translate-y-1/2" />
        
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="relative">
            <div className="h-24 w-24 rounded-full bg-gradient-to-br from-tn-primary to-blue-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg border-4 border-white">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="absolute bottom-0 right-0 bg-emerald-500 h-5 w-5 rounded-full border-2 border-white" />
          </div>
          
          <div className="text-center sm:text-left space-y-1">
            <h1 className="font-display font-bold text-2xl text-tn-text">{user?.full_name}</h1>
            <p className="text-sm font-medium text-tn-text-secondary capitalize">{user?.role} Account</p>
            <div className="flex flex-wrap justify-center sm:justify-start gap-3 mt-3">
              <span className="badge badge-info bg-tn-primary/5 border-tn-primary/10">Member since {new Date(user?.created_at).getFullYear()}</span>
              {user?.is_active && <span className="badge badge-success">Active Status</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Form */}
      <div className="glass-panel p-8 rounded-3xl animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        <h2 className="font-display font-bold text-lg text-tn-text mb-6">Personal Information</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="form-label">Full Name</label>
              <div className="relative">
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
                <User className="absolute left-3 top-3.5 h-4 w-4 text-tn-text-muted" />
              </div>
            </div>

            <div>
              <label className="form-label">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="form-input"
                />
                <Mail className="absolute left-3 top-3.5 h-4 w-4 text-tn-text-muted" />
              </div>
            </div>

            <div>
              <label className="form-label">Phone Number</label>
              <div className="relative">
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="form-input"
                />
                <Phone className="absolute left-3 top-3.5 h-4 w-4 text-tn-text-muted" />
              </div>
            </div>

            <div>
              <label className="form-label">Date of Birth</label>
              <div className="relative">
                <input
                  type="date"
                  name="date_of_birth"
                  value={formData.date_of_birth}
                  onChange={handleChange}
                  className="form-input"
                />
                <Calendar className="absolute left-3 top-3.5 h-4 w-4 text-tn-text-muted" />
              </div>
            </div>

            <div>
              <label className="form-label">Gender</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="form-select"
              >
                <option value="">Prefer not to say</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="form-label">City</label>
              <div className="relative">
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="form-input"
                />
                <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-tn-text-muted" />
              </div>
            </div>
            
            <div className="sm:col-span-2">
              <label className="form-label">Full Address</label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows="3"
                className="w-full p-3 bg-tn-card-hover border border-tn-border rounded-xl text-tn-text text-sm focus:border-tn-primary focus:ring-2 focus:ring-tn-primary/10 transition-all outline-none resize-none"
              ></textarea>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
