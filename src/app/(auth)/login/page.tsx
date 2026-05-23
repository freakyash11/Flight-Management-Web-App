'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useUserStore } from '@/store/useUserStore';

export default function LoginPage() {
  const router = useRouter();
  const setSession = useUserStore((s) => s.setSession);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  console.log('SUPABASE URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
  async function handleSubmit() {
    setError(null);

    if (!email.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword(
        { email: email.trim(), password },
      );

      if (authError) {
        setError(authError.message);
        return;
      }

      if (data.session) {
        setSession({
          accessToken: data.session.access_token,
          userId: data.session.user.id,
          email: data.session.user.email ?? '',
        });
        router.push('/');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a1628] via-[#0d1f3c] to-[#0a1628] px-4">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-[#c8a84b]/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-[#1e3a5f]/40 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8 space-y-6">
          {/* Logo */}
          <div className="text-center space-y-1">
            <div className="text-4xl mb-2">✈</div>
            <h1 className="text-2xl font-bold text-white tracking-wide">
              Welcome back
            </h1>
            <p className="text-sm text-slate-400">Sign in to your SkyBook account</p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 flex items-start gap-2">
              <span className="text-red-400 mt-0.5 shrink-0">⚠</span>
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* Fields */}
          <div className="space-y-4">
            <div className="space-y-1">
              <label
                htmlFor="login-email"
                className="block text-xs font-semibold uppercase tracking-widest text-slate-400"
              >
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                disabled={loading}
                className="w-full px-4 py-3 rounded-lg bg-white/8 border border-white/15 text-white placeholder-slate-500
                           focus:outline-none focus:border-[#c8a84b]/60 focus:bg-white/10 focus:ring-1 focus:ring-[#c8a84b]/30
                           transition-all duration-200 disabled:opacity-50 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="login-password"
                className="block text-xs font-semibold uppercase tracking-widest text-slate-400"
              >
                Password
              </label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                disabled={loading}
                className="w-full px-4 py-3 rounded-lg bg-white/8 border border-white/15 text-white placeholder-slate-500
                           focus:outline-none focus:border-[#c8a84b]/60 focus:bg-white/10 focus:ring-1 focus:ring-[#c8a84b]/30
                           transition-all duration-200 disabled:opacity-50 text-sm"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            id="login-submit"
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3 px-6 rounded-lg font-semibold text-sm tracking-wide
                       bg-gradient-to-r from-[#c8a84b] to-[#e2c068] text-[#0a1628]
                       hover:from-[#d4b55e] hover:to-[#eacf7a] active:scale-[0.98]
                       transition-all duration-200 shadow-lg shadow-[#c8a84b]/20
                       disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100
                       flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Signing in…
              </>
            ) : (
              'Sign In'
            )}
          </button>

          {/* Footer link */}
          <p className="text-center text-sm text-slate-400">
            Don&apos;t have an account?{' '}
            <Link
              href="/register"
              className="text-[#c8a84b] hover:text-[#e2c068] font-medium transition-colors duration-150"
            >
              Create one
            </Link>
          </p>
        </div>

        {/* Bottom brand note */}
        <p className="text-center text-xs text-slate-600 mt-6">
          SkyBook &mdash; Your trusted flight companion
        </p>
      </div>
    </div>
  );
}
