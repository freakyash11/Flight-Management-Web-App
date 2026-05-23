'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  function validate(): boolean {
    const errors: typeof fieldErrors = {};

    if (!email.trim()) {
      errors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!password) {
      errors.password = 'Password is required.';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters.';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password.';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit() {
    setError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      setSuccess(true);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a1628] via-[#0d1f3c] to-[#0a1628] px-4">
        <div className="relative w-full max-w-md">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8 text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto text-3xl">
              ✉
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">Check your email</h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                We sent a confirmation link to{' '}
                <span className="text-[#c8a84b] font-medium">{email}</span>. Click
                it to activate your account.
              </p>
            </div>
            <Link
              href="/login"
              className="inline-block mt-2 text-sm text-[#c8a84b] hover:text-[#e2c068] font-medium transition-colors"
            >
              ← Back to sign in
            </Link>
          </div>
        </div>
      </div>
    );
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
              Create your account
            </h1>
            <p className="text-sm text-slate-400">Join SkyBook and start booking flights</p>
          </div>

          {/* Global error banner */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 flex items-start gap-2">
              <span className="text-red-400 mt-0.5 shrink-0">⚠</span>
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* Fields */}
          <div className="space-y-4">
            {/* Email */}
            <div className="space-y-1">
              <label
                htmlFor="register-email"
                className="block text-xs font-semibold uppercase tracking-widest text-slate-400"
              >
                Email address
              </label>
              <input
                id="register-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }));
                }}
                disabled={loading}
                className={`w-full px-4 py-3 rounded-lg bg-white/8 border text-white placeholder-slate-500
                           focus:outline-none focus:bg-white/10 focus:ring-1
                           transition-all duration-200 disabled:opacity-50 text-sm
                           ${fieldErrors.email
                             ? 'border-red-500/60 focus:border-red-500/60 focus:ring-red-500/20'
                             : 'border-white/15 focus:border-[#c8a84b]/60 focus:ring-[#c8a84b]/30'
                           }`}
              />
              {fieldErrors.email && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <span>⚠</span> {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label
                htmlFor="register-password"
                className="block text-xs font-semibold uppercase tracking-widest text-slate-400"
              >
                Password
              </label>
              <input
                id="register-password"
                type="password"
                autoComplete="new-password"
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }));
                }}
                disabled={loading}
                className={`w-full px-4 py-3 rounded-lg bg-white/8 border text-white placeholder-slate-500
                           focus:outline-none focus:bg-white/10 focus:ring-1
                           transition-all duration-200 disabled:opacity-50 text-sm
                           ${fieldErrors.password
                             ? 'border-red-500/60 focus:border-red-500/60 focus:ring-red-500/20'
                             : 'border-white/15 focus:border-[#c8a84b]/60 focus:ring-[#c8a84b]/30'
                           }`}
              />
              {fieldErrors.password && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <span>⚠</span> {fieldErrors.password}
                </p>
              )}
            </div>

            {/* Confirm password */}
            <div className="space-y-1">
              <label
                htmlFor="register-confirm-password"
                className="block text-xs font-semibold uppercase tracking-widest text-slate-400"
              >
                Confirm password
              </label>
              <input
                id="register-confirm-password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (fieldErrors.confirmPassword)
                    setFieldErrors((p) => ({ ...p, confirmPassword: undefined }));
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                disabled={loading}
                className={`w-full px-4 py-3 rounded-lg bg-white/8 border text-white placeholder-slate-500
                           focus:outline-none focus:bg-white/10 focus:ring-1
                           transition-all duration-200 disabled:opacity-50 text-sm
                           ${fieldErrors.confirmPassword
                             ? 'border-red-500/60 focus:border-red-500/60 focus:ring-red-500/20'
                             : 'border-white/15 focus:border-[#c8a84b]/60 focus:ring-[#c8a84b]/30'
                           }`}
              />
              {fieldErrors.confirmPassword && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <span>⚠</span> {fieldErrors.confirmPassword}
                </p>
              )}
            </div>
          </div>

          {/* Submit */}
          <button
            id="register-submit"
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
                Creating account…
              </>
            ) : (
              'Create Account'
            )}
          </button>

          {/* Footer link */}
          <p className="text-center text-sm text-slate-400">
            Already have an account?{' '}
            <Link
              href="/login"
              className="text-[#c8a84b] hover:text-[#e2c068] font-medium transition-colors duration-150"
            >
              Sign in
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
