'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUserStore } from '@/store/useUserStore';

export default function Navbar() {
  const router = useRouter();
  const session = useUserStore((s) => s.session);
  const clearSession = useUserStore((s) => s.clearSession);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      clearSession();
      router.push('/login');
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <nav className="sticky top-0 z-50 w-full bg-[#0a1628]/90 backdrop-blur-lg border-b border-white/8 shadow-lg shadow-black/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href="/"
            id="navbar-logo"
            className="flex items-center gap-2 group select-none"
          >
            <span className="text-2xl transition-transform duration-300 group-hover:rotate-12">✈</span>
            <span className="font-bold text-lg tracking-wide">
              <span className="text-white">Sky</span>
              <span className="text-[#c8a84b]">Book</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-1">
            {session ? (
              <>
                {/* User email pill */}
                <span className="text-sm text-slate-400 mr-2 max-w-[180px] truncate" title={session.email}>
                  {session.email}
                </span>

                <Link
                  href="/my-bookings"
                  id="navbar-my-bookings"
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300
                             hover:text-white hover:bg-white/8 transition-all duration-150"
                >
                  My Bookings
                </Link>

                <button
                  id="navbar-logout"
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="ml-1 px-4 py-2 rounded-lg text-sm font-medium
                             border border-white/15 text-slate-300 hover:text-white
                             hover:border-red-500/40 hover:bg-red-500/8 hover:text-red-300
                             transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loggingOut ? 'Signing out…' : 'Log Out'}
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  id="navbar-login"
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300
                             hover:text-white hover:bg-white/8 transition-all duration-150"
                >
                  Sign In
                </Link>

                <Link
                  href="/register"
                  id="navbar-register"
                  className="ml-1 px-4 py-2 rounded-lg text-sm font-semibold
                             bg-gradient-to-r from-[#c8a84b] to-[#e2c068] text-[#0a1628]
                             hover:from-[#d4b55e] hover:to-[#eacf7a]
                             transition-all duration-150 shadow-md shadow-[#c8a84b]/20"
                >
                  Register
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            id="navbar-mobile-toggle"
            type="button"
            className="sm:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/8 transition-all"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle navigation menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="sm:hidden border-t border-white/8 bg-[#0a1628]/95 backdrop-blur-lg px-4 pb-4 pt-2 space-y-1">
          {session ? (
            <>
              <p className="text-xs text-slate-500 px-3 py-1 truncate">{session.email}</p>

              <Link
                href="/my-bookings"
                id="navbar-mobile-my-bookings"
                className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-300
                           hover:text-white hover:bg-white/8 transition-all"
                onClick={() => setMobileOpen(false)}
              >
                My Bookings
              </Link>

              <button
                id="navbar-mobile-logout"
                type="button"
                onClick={() => { setMobileOpen(false); handleLogout(); }}
                disabled={loggingOut}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium
                           text-slate-300 hover:text-red-300 hover:bg-red-500/8 transition-all
                           disabled:opacity-50"
              >
                {loggingOut ? 'Signing out…' : 'Log Out'}
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                id="navbar-mobile-login"
                className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-300
                           hover:text-white hover:bg-white/8 transition-all"
                onClick={() => setMobileOpen(false)}
              >
                Sign In
              </Link>

              <Link
                href="/register"
                id="navbar-mobile-register"
                className="block px-3 py-2 rounded-lg text-sm font-semibold text-[#c8a84b]
                           hover:text-[#e2c068] hover:bg-[#c8a84b]/8 transition-all"
                onClick={() => setMobileOpen(false)}
              >
                Register
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
