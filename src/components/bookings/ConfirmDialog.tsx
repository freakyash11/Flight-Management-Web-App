'use client';

// ─────────────────────────────────────────────────────────────────────────────
// ConfirmDialog
//
// A lightweight confirmation modal.  Renders a backdrop + centred card with
// a title, description, and Cancel / Confirm buttons.
// ─────────────────────────────────────────────────────────────────────────────

type Props = {
  title: string;
  description: string;
  confirmLabel?: string;
  confirmDanger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  title,
  description,
  confirmLabel = 'Confirm',
  confirmDanger = false,
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={!loading ? onCancel : undefined}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-desc"
        className="fixed inset-0 z-50 flex items-center justify-center px-4 pointer-events-none"
      >
        <div className="bg-white rounded-2xl shadow-2xl shadow-black/20 w-full max-w-sm
                        pointer-events-auto overflow-hidden
                        animate-[scale-in_0.18s_ease-out]">
          {/* Top accent */}
          <div
            className={`h-1.5 w-full ${
              confirmDanger
                ? 'bg-gradient-to-r from-red-400 to-red-600'
                : 'bg-gradient-to-r from-[#0a1628] to-[#1e3a5f]'
            }`}
          />

          <div className="px-6 py-6">
            {/* Icon */}
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl mx-auto mb-4 ${
                confirmDanger ? 'bg-red-50' : 'bg-slate-50'
              }`}
            >
              {confirmDanger ? '⚠️' : '❓'}
            </div>

            <h2
              id="confirm-dialog-title"
              className="text-lg font-extrabold text-slate-800 text-center mb-1"
            >
              {title}
            </h2>
            <p
              id="confirm-dialog-desc"
              className="text-sm text-slate-500 text-center leading-relaxed"
            >
              {description}
            </p>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold
                           border-2 border-slate-200 text-slate-600
                           hover:border-slate-300 hover:bg-slate-50
                           transition-all duration-150 disabled:opacity-50"
              >
                Go Back
              </button>

              <button
                id="confirm-dialog-confirm"
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold
                            transition-all duration-150 active:scale-[0.97]
                            disabled:opacity-60 disabled:cursor-not-allowed
                            flex items-center justify-center gap-2
                            ${
                              confirmDanger
                                ? 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-md shadow-red-200'
                                : 'bg-gradient-to-r from-[#0a1628] to-[#1e3a5f] text-white hover:from-[#0d1f3c] hover:to-[#243f6a] shadow-md shadow-slate-300'
                            }`}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Processing…
                  </>
                ) : (
                  confirmLabel
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
