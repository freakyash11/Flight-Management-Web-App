export default function FlightsLoading() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Generic Header Skeleton ── */}
      <div className="bg-[#0a1628] py-12 px-4 text-center border-b border-white/10">
        <div className="animate-pulse">
          <div className="w-64 h-8 bg-slate-700/50 rounded mx-auto mb-3"></div>
          <div className="w-80 h-4 bg-slate-700/50 rounded mx-auto"></div>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Summary text skeleton */}
          <div className="h-5 bg-slate-200 rounded w-48 mb-6 animate-pulse"></div>
          
          {/* Card skeletons */}
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6 animate-pulse">
              {/* Top row */}
              <div className="flex items-center justify-between mb-6">
                <div className="w-16 h-4 bg-slate-200 rounded"></div>
                <div className="w-24 h-6 bg-slate-200 rounded-full"></div>
              </div>
              
              {/* Timeline */}
              <div className="flex items-center gap-4">
                <div className="flex-1 text-center">
                  <div className="w-20 h-8 bg-slate-200 rounded mx-auto mb-2"></div>
                  <div className="w-12 h-3 bg-slate-200 rounded mx-auto"></div>
                </div>
                
                <div className="flex-1 flex flex-col items-center">
                  <div className="w-12 h-3 bg-slate-200 rounded mb-2"></div>
                  <div className="w-full h-px bg-slate-200"></div>
                </div>
                
                <div className="flex-1 text-center">
                  <div className="w-20 h-8 bg-slate-200 rounded mx-auto mb-2"></div>
                  <div className="w-12 h-3 bg-slate-200 rounded mx-auto"></div>
                </div>
              </div>
              
              {/* Bottom row */}
              <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <div className="w-24 h-6 bg-slate-200 rounded mb-1"></div>
                  <div className="w-32 h-3 bg-slate-200 rounded"></div>
                </div>
                <div className="w-28 h-10 bg-slate-200 rounded-xl"></div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
