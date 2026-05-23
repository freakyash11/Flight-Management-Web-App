'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error
    console.error('Global Error Boundary caught:', error);
  }, [error]);

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-red-100 shadow-xl p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
          ⚠️
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Something went wrong</h2>
        <p className="text-sm text-slate-500 mb-8 leading-relaxed">
          {error.message || 'An unexpected error occurred while processing your request. Please try again.'}
        </p>
        
        <div className="flex flex-col gap-3">
          <button
            onClick={() => reset()}
            className="w-full px-6 py-3 rounded-xl font-semibold text-sm
                       bg-gradient-to-r from-[#0a1628] to-[#1e3a5f] text-white
                       hover:from-[#0d1f3c] hover:to-[#243f6a] transition-all
                       shadow-lg shadow-[#0a1628]/20"
          >
            Try again
          </button>
          <Link
            href="/"
            className="w-full px-6 py-3 rounded-xl font-semibold text-sm
                       border-2 border-slate-200 text-slate-600
                       hover:bg-slate-50 transition-all"
          >
            Go back home
          </Link>
        </div>
      </div>
    </div>
  );
}
