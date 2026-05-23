'use client';

import Link from 'next/link';
import { useUserStore } from '@/store/useUserStore';
import { BookingCard } from '@/components/bookings';
import { useEffect, useState } from 'react';

export default function OfflinePage() {
  const cachedBookings = useUserStore((s) => s.cachedBookings);
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="bg-slate-800 border-b border-slate-700 pb-8 pt-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
            📡
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
            You're offline
          </h1>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            It looks like you've lost your internet connection. Some functionality is unavailable, but you can still view your recently cached bookings below.
          </p>
          
          <div className="mt-6">
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              Try to reconnect
            </button>
          </div>
        </div>
      </div>

      {/* ── Cached Bookings ──────────────────────────────────────────────── */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-1">
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-slate-300 inline-block"></span>
          Cached Bookings
        </h2>
        
        {!isClient ? (
          <div className="text-center py-10 text-slate-500">Loading offline data...</div>
        ) : cachedBookings.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center shadow-sm">
            <p className="text-slate-500">No cached bookings found.</p>
            <p className="text-xs text-slate-400 mt-2">
              Bookings will appear here after you view them while online.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-2 flex gap-3 text-sm text-blue-800">
              <span className="shrink-0 text-blue-500">ℹ️</span>
              <p>
                You are viewing an offline copy of your bookings. Cancellations or changes cannot be made until you reconnect.
              </p>
            </div>
            
            {cachedBookings.map((booking) => (
              <div key={booking.id} className="opacity-90 grayscale-[0.2] pointer-events-none">
                <BookingCard booking={booking} />
              </div>
            ))}
          </div>
        )}
      </main>
      
      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="py-6 text-center text-xs text-slate-400 border-t border-slate-200">
        <p>SkyBook Offline Mode</p>
      </footer>
    </div>
  );
}
