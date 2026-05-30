import React, { useState } from 'react';

export default function Fares() {
  const [activeTab, setActiveTab] = useState('Ordinary Services');

  const ordinaryFares = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 15, 16, 16, 17, 17, 18, 18, 19, 19, 20, 20, 21, 21, 22, 22, 23, 23, 24, 24];
  const expressFares = [7, 9, 10, 12, 13, 15, 16, 18, 19, 21, 22, 22, 24, 24, 25, 25, 27, 27, 28, 28, 30, 30, 31, 31, 33, 33, 34, 34, 35, 35];
  const deluxeFares = [11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 31, 33, 33, 35, 35, 37, 37, 39, 39, 41, 41, 43, 43, 45, 45, 47, 47, 49, 49];
  const smallFares = [7, 9, 10, 12, 13, 15, 16, 18, 19, 21, 22, 22, 24, 24, 25, 25, 27, 27, 28, 28, 30, 30, 31, 31, 33, 33, 34, 34, 35, 35];
  const nightFares = [11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 31, 33, 33, 35, 35, 37, 37, 39, 39, 41, 41, 43, 43, 45, 45, 47, 47, 49, 49];
  const evDeluxeFares = [11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 31, 33, 33, 35, 35, 37, 37, 39, 39, 41, 41, 43, 43, 45, 45, 47, 47, 49, 49];
  const evAcFares = [15, 15, 20, 20, 20, 30, 30, 30, 40, 40, 40, 40, 40, 40, 50, 50, 50, 50, 60, 60, 60, 60, 60, 70, 70, 70, 70, 80, 80, 80];
  const chennaiUlaVintageFares = [11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 31, 33, 33, 35, 35, 37, 37, 39, 39, 41, 41, 43, 43, 45, 45, 47, 47, 49, 49];
  const pinkFares = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 15, 16, 16, 17, 17, 18, 18, 19, 19, 20, 20, 21, 21, 22, 22, 23, 23, 24, 24];
  const chennaiUlaAcFares = [15, 15, 20, 20, 20, 30, 30, 30, 40, 40, 40, 40, 40, 40, 50, 50, 50, 50, 60, 60, 60, 60, 60, 70, 70, 70, 70, 80, 80, 80];
  const premiumFares = [50, 75, 100, 125, 150];

  const services = [
    { name: 'Ordinary Services', fares: ordinaryFares },
    { name: 'Express Services', fares: expressFares },
    { name: 'Deluxe Services', fares: deluxeFares },
    { name: 'Small', fares: smallFares },
    { name: 'Night services', fares: nightFares },
    { name: 'E/V Deluxe Service', fares: evDeluxeFares },
    { name: 'E/V A/C Service', fares: evAcFares },
    { name: 'Chennai Ula Vintage Services', fares: chennaiUlaVintageFares },
    { name: 'Pink Services', fares: pinkFares },
    { name: 'Chennai Ula A/C Services', fares: chennaiUlaAcFares },
    { name: 'Premium Services', fares: premiumFares }
  ];

  const activeData = services.find(s => s.name === activeTab)?.fares || [];

  return (
    <div className="w-full bg-white flex flex-col min-h-[calc(100vh-4rem)] p-4 sm:p-8 font-sans">
      <div className="max-w-6xl mx-auto w-full space-y-8 animate-fade-in-up">
        
        {/* Header section */}
        <div className="text-center space-y-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#e04543] uppercase tracking-wide">
            BUS FARES
          </h1>
          
          <div className="flex flex-col sm:flex-row justify-between items-end gap-2 text-sm text-slate-700 font-medium pb-2 border-b-0">
            <div className="text-left">
              <h2 className="text-xl text-black font-semibold">Stage-wise fare (For 1 Adult)</h2>
              <p>[Effective from 29-01-2018]</p>
            </div>
            <div className="text-right">
              <p>[G.O (Ms.) No.48 Dated 28.01.2018]</p>
            </div>
          </div>
        </div>

        {/* Tabbed interface and Container */}
        <div className="border border-red-400 rounded-lg overflow-hidden shadow-sm">
          {/* Tabs */}
          <div className="bg-[#ee5555] p-2 flex flex-wrap gap-1 items-end pt-4 px-4">
            {services.map(service => (
              <button
                key={service.name}
                onClick={() => setActiveTab(service.name)}
                className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-colors ${
                  activeTab === service.name 
                  ? 'bg-white text-slate-700' 
                  : 'bg-transparent text-white hover:bg-white/20'
                }`}
              >
                {service.name}
              </button>
            ))}
          </div>

          {/* Table content (Horizontal scroll for stages) */}
          <div className="p-6 bg-white overflow-x-auto">
            <div className="flex items-center min-w-max">
              {/* Start block */}
              <div className="flex flex-col border border-red-500 rounded-l-xl overflow-hidden shadow-sm">
                <div className="bg-[#ee5555] text-white font-bold px-6 py-2 text-center text-sm border-b border-red-500">Start</div>
                <div className="bg-[#ee5555] text-blue-300 font-bold px-6 py-3 text-center text-lg">₹</div>
              </div>

              {/* Stages blocks */}
              {activeData.map((fare, index) => (
                <div key={index} className="flex flex-col border-y border-r border-slate-200">
                  <div className="bg-slate-100 text-black font-bold px-6 py-2 text-center text-sm border-b border-slate-200">
                    {index + 1}
                  </div>
                  <div className="bg-slate-50 text-[#3b82f6] font-bold px-6 py-3 text-center text-sm">
                    {fare === null ? '-' : `₹${fare.toFixed(2)}`}
                  </div>
                </div>
              ))}

              {/* End block */}
              <div className="flex flex-col border border-red-500 rounded-r-xl overflow-hidden shadow-sm -ml-[1px]">
                <div className="bg-[#ee5555] text-white font-bold px-6 py-2 text-center text-sm border-b border-red-500">End</div>
                <div className="bg-[#ee5555] text-blue-300 font-bold px-6 py-3 text-center text-lg">₹</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer note */}
        <div className="pt-2 text-sm font-bold text-[#1f4e79]">
          <p>
            Note: In Chennai Ula services, a special single-day pass priced at ₹50 for vintage services and ₹100 for A/C services permits unlimited boarding and alighting at all stops.
          </p>
        </div>

      </div>
    </div>
  );
}
