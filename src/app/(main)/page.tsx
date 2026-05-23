// Home / Search page — route: /
// This is a Server Component. Interactive search logic lives in <SearchForm />.

import SearchForm from '@/components/flights/SearchForm';

// ─────────────────────────────────────────────────────────────────────────────
// Metadata
// ─────────────────────────────────────────────────────────────────────────────

export const metadata = {
  title: 'SkyBook — Search Flights',
  description:
    'Search and book flights across India. Fast, reliable, and easy with SkyBook.',
};

// ─────────────────────────────────────────────────────────────────────────────
// Popular-routes data (static, no DB call needed)
// ─────────────────────────────────────────────────────────────────────────────

const POPULAR_ROUTES = [
  {
    id: 'del-bom',
    from: 'DEL',
    fromCity: 'Delhi',
    to: 'BOM',
    toCity: 'Mumbai',
    duration: '~2h 15m',
    label: 'Most Popular',
    labelColor: 'bg-amber-100 text-amber-700',
  },
  {
    id: 'bom-del',
    from: 'BOM',
    fromCity: 'Mumbai',
    to: 'DEL',
    toCity: 'Delhi',
    duration: '~2h 20m',
    label: 'Top Rated',
    labelColor: 'bg-sky-100 text-sky-700',
  },
  {
    id: 'del-blr',
    from: 'DEL',
    fromCity: 'Delhi',
    to: 'BLR',
    toCity: 'Bengaluru',
    duration: '~2h 45m',
    label: 'Business Hub',
    labelColor: 'bg-violet-100 text-violet-700',
  },
  {
    id: 'blr-del',
    from: 'BLR',
    fromCity: 'Bengaluru',
    to: 'DEL',
    toCity: 'Delhi',
    duration: '~2h 50m',
    label: 'Tech Corridor',
    labelColor: 'bg-emerald-100 text-emerald-700',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Hero section ──────────────────────────────────────────────────── */}
      <section className="relative w-full bg-gradient-to-br from-[#0a1628] via-[#0d1f3c] to-[#0a1628] overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-[#c8a84b]/8 blur-3xl" />
          <div className="absolute bottom-0 -left-32 w-[400px] h-[400px] rounded-full bg-[#1e3a5f]/60 blur-3xl" />
          {/* Subtle grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }}
          />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-32 text-center">
          {/* Badge */}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                           bg-[#c8a84b]/15 border border-[#c8a84b]/30 text-[#c8a84b]
                           text-xs font-semibold tracking-wide mb-6">
            ✈ Book smarter, fly better
          </span>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight">
            Your journey,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#c8a84b] to-[#e2c068]">
              simplified
            </span>
          </h1>

          <p className="mt-4 text-lg text-slate-400 max-w-xl mx-auto leading-relaxed">
            Search thousands of flights across India. Find the best fares, choose your
            seat, and book in minutes.
          </p>

          {/* Stats row */}
          <div className="mt-10 flex flex-wrap justify-center gap-8 text-slate-400 text-sm">
            {[
              { value: '50+', label: 'Daily Flights' },
              { value: '3', label: 'Major Airports' },
              { value: '99.9%', label: 'On-Time Rate' },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-bold text-white">{s.value}</div>
                <div className="text-xs mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Search card (overlaps hero) ────────────────────────────────────── */}
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-10">
        <div className="bg-white rounded-2xl shadow-2xl shadow-slate-200/80 p-6 sm:p-8 border border-slate-100">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-1 h-6 rounded-full bg-gradient-to-b from-[#c8a84b] to-[#e2c068]" />
            <h2 className="text-lg font-bold text-slate-800">Search Flights</h2>
          </div>
          {/* Client Component — handles interactivity */}
          <SearchForm />
        </div>
      </div>

      {/* ── Popular routes ─────────────────────────────────────────────────── */}
      <section className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-1 h-6 rounded-full bg-gradient-to-b from-[#c8a84b] to-[#e2c068]" />
          <h2 className="text-2xl font-bold text-slate-800">Popular Routes</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {POPULAR_ROUTES.map((route) => (
            <div
              key={route.id}
              className="group bg-white rounded-xl border border-slate-200 shadow-sm p-5
                         hover:border-[#c8a84b]/40 hover:shadow-md hover:shadow-[#c8a84b]/8
                         transition-all duration-200 cursor-default"
            >
              <div className="flex items-center justify-between mb-4">
                <span
                  className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${route.labelColor}`}
                >
                  {route.label}
                </span>
                <span className="text-xs text-slate-400">{route.duration}</span>
              </div>

              <div className="flex items-center gap-3">
                {/* Origin */}
                <div className="text-center">
                  <div className="text-2xl font-extrabold text-slate-800 leading-none">
                    {route.from}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">{route.fromCity}</div>
                </div>

                {/* Flight path indicator */}
                <div className="flex-1 flex items-center gap-1">
                  <div className="flex-1 h-px bg-gradient-to-r from-slate-200 via-[#c8a84b]/40 to-slate-200" />
                  <span className="text-[#c8a84b] text-base group-hover:translate-x-0.5 transition-transform duration-200">
                    ✈
                  </span>
                  <div className="flex-1 h-px bg-gradient-to-r from-slate-200 via-[#c8a84b]/40 to-slate-200" />
                </div>

                {/* Destination */}
                <div className="text-center">
                  <div className="text-2xl font-extrabold text-slate-800 leading-none">
                    {route.to}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">{route.toCity}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-100 bg-white py-8 text-center text-sm text-slate-400">
        <span className="font-bold text-slate-600">✈ SkyBook</span>
        &nbsp;&mdash;&nbsp;Your trusted flight companion &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
