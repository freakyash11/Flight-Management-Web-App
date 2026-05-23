'use client';

import { useUserStore } from '@/store/useUserStore';

export default function OfflinePage() {
  const session = useUserStore((s) => s.session);

  return (
    <div className="min-h-screen bg-[#0a1628] text-white flex flex-col items-center justify-center p-4">
      <div className="mb-6">
        <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
          <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.2-1.1.5l-1.3 2.5c-.3.5.1 1.2.6 1.4l5.6 2.3-2.1 2.1L3.8 14c-.3-.1-.6 0-.8.2L1.8 15.4c-.4.4-.2 1.1.3 1.3L5.4 18l1.3 3.3c.2.5.9.7 1.3.3l1.2-1.2c.2-.2.3-.5.2-.8L8.1 16l2.1-2.1 2.3 5.6c.2.5.9.9 1.4.6l2.5-1.3c.3-.2.6-.6.5-1.1z"/>
          <line x1="2" y1="2" x2="22" y2="22"/>
        </svg>
      </div>
      <h1 className="text-4xl font-bold mb-4">You are offline</h1>
      <p className="text-lg text-slate-300 mb-8 text-center max-w-md">
        It looks like you've lost your internet connection. Don't worry, some features might still be available.
      </p>
      
      {session ? (
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 w-full max-w-md">
          <div className="flex items-center gap-3 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <h2 className="text-xl font-semibold">Cached Bookings</h2>
          </div>
          <p className="text-slate-400">
            Check your booked flights (if previously cached) from your dashboard when the connection is unstable.
          </p>
        </div>
      ) : (
        <p className="text-slate-400">Please connect to the internet to book and manage flights.</p>
      )}
    </div>
  );
}
