import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
      <div className="text-center">
        <div className="text-7xl sm:text-9xl font-black text-slate-100 mb-4 select-none">
          404
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-3">
          Page not found
        </h2>
        <p className="text-slate-500 mb-8 max-w-sm mx-auto">
          We couldn't find the page you're looking for. It might have been moved or doesn't exist.
        </p>
        <Link
          href="/"
          className="inline-block px-8 py-3.5 rounded-xl font-bold text-sm tracking-wide
                     bg-gradient-to-r from-[#0a1628] to-[#1e3a5f] text-white
                     hover:from-[#0d1f3c] hover:to-[#243f6a] transition-all
                     shadow-lg shadow-[#0a1628]/20 active:scale-[0.98]"
        >
          Return to Home
        </Link>
      </div>
    </div>
  );
}
