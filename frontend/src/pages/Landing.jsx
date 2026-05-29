import React from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Bus, MapPin, Ticket, Award, Cpu, ArrowRight, Shield, Zap, Users } from 'lucide-react';

export default function Landing() {
  const { isAuthenticated } = useAuthStore();

  const features = [
    {
      title: 'Digital Bus Pass System',
      description: 'Apply for Student, General, or Senior Citizen passes online. Tesseract OCR analysis and ML scoring make approvals instant.',
      icon: Award,
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      title: 'Real-Time Bus Tracking',
      description: 'Track bus locations live on interactive maps. View speed, bearing, and exact ETA updates every 4 seconds.',
      icon: MapPin,
      gradient: 'from-emerald-500 to-teal-500',
    },
    {
      title: 'Seamless Ticket Booking',
      description: 'Reserve seats on interactive grids, pay online, and receive instant QR-code validation tickets for conductors.',
      icon: Ticket,
      gradient: 'from-amber-500 to-orange-500',
    },
  ];

  const stats = [
    { value: '4,200+', label: 'Active Buses', icon: Bus },
    { value: '38M+', label: 'Daily Riders', icon: Users },
    { value: '99.7%', label: 'Uptime SLA', icon: Zap },
    { value: '12', label: 'Districts Covered', icon: Shield },
  ];

  const steps = [
    { step: '01', title: 'Create Account', description: 'Register with your email or phone to get a Smart Transit ID.' },
    { step: '02', title: 'Apply for Pass', description: 'Upload your ID document. Our AI verifies eligibility in seconds.' },
    { step: '03', title: 'Book & Travel', description: 'Search routes, reserve seats, and scan your QR ticket on the bus.' },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background gradient mesh */}
      <div className="absolute inset-0 gradient-mesh -z-10" />
      <div className="absolute top-[-10%] left-[-15%] w-[600px] h-[600px] rounded-full bg-blue-500/[0.04] blur-[120px] -z-10" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-500/[0.04] blur-[100px] -z-10" />

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="text-center max-w-3xl mx-auto space-y-8 animate-fade-in-up">
          {/* Tag */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-tn-primary/10 border border-tn-primary/15 text-xs font-bold text-tn-primary">
            <Cpu className="h-3.5 w-3.5" />
            <span>AI-Powered Smart Transit Platform</span>
          </div>

          {/* Heading */}
          <h1 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl tracking-tight text-tn-text leading-[1.1]">
            Chennai One Smart{' '}
            <span className="text-gradient">Public Transport</span>{' '}
            Platform
          </h1>

          {/* Subheading */}
          <p className="text-base sm:text-lg text-tn-text-secondary leading-relaxed font-medium max-w-2xl mx-auto">
            The next-generation transit solution for Greater Chennai and Tamil Nadu. Live GPS bus tracking, seamless seat reservations, and automated AI eligibility-checked digital bus passes.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {isAuthenticated ? (
              <Link to="/dashboard" className="btn-primary px-8 py-4 text-base">
                Go to Dashboard
                <ArrowRight className="h-5 w-5" />
              </Link>
            ) : (
              <>
                <Link to="/register" className="btn-primary px-8 py-4 text-base">
                  Get Started Free
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link to="/login" className="btn-secondary px-8 py-4 text-base">
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="glass-panel-elevated rounded-2xl p-6 grid grid-cols-2 md:grid-cols-4 gap-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          {stats.map((stat, idx) => (
            <div key={idx} className="text-center space-y-1">
              <div className="inline-flex p-2 rounded-lg bg-tn-primary/5 text-tn-primary mb-1">
                <stat.icon className="h-5 w-5" />
              </div>
              <div className="font-display font-extrabold text-2xl text-tn-text">{stat.value}</div>
              <div className="text-xs font-semibold text-tn-text-muted uppercase tracking-wider">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Feature Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="text-center mb-12">
          <h2 className="font-display font-bold text-2xl sm:text-3xl text-tn-text">
            Everything you need for transit
          </h2>
          <p className="text-sm text-tn-text-secondary mt-2 max-w-lg mx-auto">
            A unified platform powering bus passes, seat bookings, and live tracking — all AI-enhanced.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feat, idx) => (
            <div
              key={idx}
              className="glass-panel glass-panel-hover p-6 rounded-2xl flex flex-col justify-between animate-fade-in-up"
              style={{ animationDelay: `${0.1 * (idx + 1)}s` }}
            >
              <div className="space-y-4">
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-tr ${feat.gradient} shadow-md`}>
                  <feat.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-display font-bold text-xl text-tn-text">{feat.title}</h3>
                <p className="text-sm text-tn-text-secondary leading-relaxed">{feat.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How it Works */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="text-center mb-12">
          <h2 className="font-display font-bold text-2xl sm:text-3xl text-tn-text">
            How it works
          </h2>
          <p className="text-sm text-tn-text-secondary mt-2">Get started in three simple steps</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((item, idx) => (
            <div key={idx} className="text-center space-y-3 animate-fade-in-up" style={{ animationDelay: `${0.15 * (idx + 1)}s` }}>
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-tn-primary/10 text-tn-primary font-display font-extrabold text-lg">
                {item.step}
              </div>
              <h3 className="font-display font-bold text-lg text-tn-text">{item.title}</h3>
              <p className="text-sm text-tn-text-secondary">{item.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
