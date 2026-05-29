import React from 'react';
import { Link } from 'react-router-dom';
import { Bus, Heart, MapPin, Ticket, Award, Shield } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full border-t border-slate-200 bg-white mt-12">
      {/* Gradient accent line */}
      <div className="h-0.5 bg-gradient-to-r from-tn-primary via-blue-500 to-emerald-500" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1 space-y-3">
            <div className="flex items-center space-x-2">
              <div className="bg-gradient-to-br from-tn-primary to-blue-600 p-1.5 rounded-lg">
                <Bus className="h-4 w-4 text-white" />
              </div>
              <span className="font-display font-bold text-base text-tn-text">
                Chennai One Transit
              </span>
            </div>
            <p className="text-xs text-tn-text-secondary leading-relaxed">
              The next-generation AI-powered smart public transport platform for the citizens of Tamil Nadu.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-tn-text uppercase tracking-wider">Services</h4>
            <div className="flex flex-col space-y-2">
              <Link to="/tracking" className="flex items-center gap-1.5 text-xs text-tn-text-secondary hover:text-tn-primary transition-colors font-medium">
                <MapPin className="h-3.5 w-3.5" /> Live Bus Tracking
              </Link>
              <Link to="/booking" className="flex items-center gap-1.5 text-xs text-tn-text-secondary hover:text-tn-primary transition-colors font-medium">
                <Ticket className="h-3.5 w-3.5" /> Ticket Booking
              </Link>
              <Link to="/bus-pass" className="flex items-center gap-1.5 text-xs text-tn-text-secondary hover:text-tn-primary transition-colors font-medium">
                <Award className="h-3.5 w-3.5" /> Digital Bus Pass
              </Link>
            </div>
          </div>

          {/* Resources */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-tn-text uppercase tracking-wider">Platform</h4>
            <div className="flex flex-col space-y-2">
              <Link to="/login" className="text-xs text-tn-text-secondary hover:text-tn-primary transition-colors font-medium">
                Passenger Login
              </Link>
              <Link to="/register" className="text-xs text-tn-text-secondary hover:text-tn-primary transition-colors font-medium">
                Register Account
              </Link>
              <span className="flex items-center gap-1.5 text-xs text-tn-text-secondary font-medium">
                <Shield className="h-3.5 w-3.5" /> Officer Admin Portal
              </span>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-tn-text uppercase tracking-wider">Contact</h4>
            <div className="flex flex-col space-y-2 text-xs text-tn-text-secondary">
              <p className="font-medium">Tamil Nadu State Transport Corp.</p>
              <p>No. 7, Anna Salai</p>
              <p>Chennai, Tamil Nadu 600002</p>
              <p className="font-semibold text-tn-primary">helpdesk@transport.tn.gov.in</p>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-1 text-xs text-tn-text-muted">
            <span>Made with</span>
            <Heart className="h-3.5 w-3.5 text-red-400 fill-red-400" />
            <span>for the citizens of Tamil Nadu</span>
          </div>

          <div className="text-xs text-tn-text-muted">
            &copy; {new Date().getFullYear()} Government of Tamil Nadu. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
