export default function MyBookingsLoading() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Header skeleton matching my-bookings/page.tsx ── */}
      <div className="bg-gradient-to-br from-[#0a1628] to-[#1e3a5f] border-b border-white/10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="w-32 h-3 bg-white/10 rounded mb-4 animate-pulse"></div>
          
          <div className="flex items-end justify-between gap-4">
            <div className="animate-pulse">
              <div className="w-48 h-8 bg-white/20 rounded mb-2"></div>
              <div className="w-24 h-4 bg-white/10 rounded"></div>
            </div>
            <div className="w-32 h-10 bg-white/10 rounded-lg animate-pulse"></div>
          </div>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="space-y-8">
          <section>
            <div className="flex items-center gap-2 mb-4 animate-pulse">
              <div className="w-1 h-5 rounded-full bg-slate-200" />
              <div className="w-32 h-5 bg-slate-200 rounded" />
            </div>
            
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-pulse">
                  <div className="h-1 w-full bg-slate-200" />
                  <div className="p-5 sm:p-6">
                    {/* Row 1 */}
                    <div className="flex justify-between mb-4">
                      <div className="w-24 h-6 bg-slate-200 rounded" />
                      <div className="w-20 h-6 bg-slate-200 rounded-full" />
                    </div>
                    
                    {/* Row 2 */}
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-16 h-8 bg-slate-200 rounded" />
                      <div className="flex-1 h-px bg-slate-200" />
                      <div className="w-16 h-8 bg-slate-200 rounded" />
                    </div>
                    
                    {/* Row 3 */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                      <div className="col-span-2 h-12 bg-slate-50 rounded-lg" />
                      <div className="h-12 bg-slate-50 rounded-lg" />
                      <div className="h-12 bg-slate-50 rounded-lg" />
                    </div>
                    
                    {/* Row 4 */}
                    <div className="h-12 bg-slate-50 rounded-lg mb-4 w-1/2" />
                    
                    {/* Row 5 */}
                    <div className="flex gap-2 pt-1">
                      <div className="flex-1 h-10 bg-slate-100 rounded-lg" />
                      <div className="flex-1 h-10 bg-slate-100 rounded-lg" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
