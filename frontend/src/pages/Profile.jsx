import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { User, Mail, Phone, Calendar, MapPin, CheckCircle, Loader2 } from 'lucide-react';

export default function Profile() {
  const { user, updateProfile } = useAuthStore();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [dob, setDob] = useState(user?.date_of_birth ? new Date(user.date_of_birth).toISOString().split('T')[0] : '');
  const [gender, setGender] = useState(user?.gender || '');
  const [address, setAddress] = useState(user?.address || '');
  const [city, setCity] = useState(user?.city || 'Chennai');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setError(null);

    try {
      await updateProfile({
        full_name: fullName,
        email: email || null,
        phone: phone || null,
        date_of_birth: dob ? new Date(dob).toISOString() : null,
        gender: gender || null,
        address: address || null,
        city: city
      });
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Profile update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="font-display font-bold text-3xl text-white flex items-center gap-2">
          <User className="h-8 w-8 text-blue-500" />
          <span>User Profile Management</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">Keep your identity credentials up-to-date for pass eligibility scans.</p>
      </div>

      <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-white/5">
        {success && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2">
            <CheckCircle className="h-4.5 w-4.5" />
            <span>Profile details updated successfully!</span>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-slate-400">Full Name</label>
              <div className="mt-1 relative">
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#0c102b] border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500"
                />
                <User className="absolute left-3 top-3.5 h-4.5 w-4.5 text-slate-500" />
              </div>
            </div>

            <div>
              <label className="block text-slate-400">Email Address</label>
              <div className="mt-1 relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#0c102b] border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500"
                />
                <Mail className="absolute left-3 top-3.5 h-4.5 w-4.5 text-slate-500" />
              </div>
            </div>

            <div>
              <label className="block text-slate-400">Phone Number</label>
              <div className="mt-1 relative">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#0c102b] border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500"
                />
                <Phone className="absolute left-3 top-3.5 h-4.5 w-4.5 text-slate-500" />
              </div>
            </div>

            <div>
              <label className="block text-slate-400">Date of Birth</label>
              <div className="mt-1 relative">
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#0c102b] border border-white/10 rounded-xl text-white focus:outline-none"
                />
                <Calendar className="absolute left-3 top-3.5 h-4.5 w-4.5 text-slate-500" />
              </div>
            </div>

            <div>
              <label className="block text-slate-400">Registered City</label>
              <div className="mt-1 relative">
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#0c102b] border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500"
                />
                <MapPin className="absolute left-3 top-3.5 h-4.5 w-4.5 text-slate-500" />
              </div>
            </div>

            <div>
              <label className="block text-slate-400">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="mt-1 w-full px-4 py-3 bg-[#0c102b] border border-white/10 rounded-xl text-white focus:outline-none"
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-400">Home Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-1 w-full px-4 py-3 bg-[#0c102b] border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-neon flex items-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>Save Profile</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
