'use client';

import { useState, useEffect } from 'react';

// Extend the window object to include the beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function InstallPromptBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isDismissed, setIsDismissed] = useState(true); // Default to true to prevent hydration mismatch
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if dismissed in session storage
    const dismissed = sessionStorage.getItem('pwa_prompt_dismissed');
    setIsDismissed(dismissed === 'true');

    // Simple mobile check
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || /Mobi|Android/i.test(navigator.userAgent));
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  if (!isMobile || isDismissed || !deferredPrompt) {
    return null;
  }

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
    
    // We clear the prompt anyway after they interact
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0f172a] text-white p-4 flex items-center justify-between shadow-2xl border-t border-slate-700 animate-[slide-up_0.3s_ease-out]">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-xl">
          ✈️
        </div>
        <div>
          <h3 className="text-sm font-bold">SkyBook</h3>
          <p className="text-xs text-slate-400">Add to home screen</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <button
          onClick={handleDismiss}
          className="p-2 text-slate-400 hover:text-white transition-colors"
          aria-label="Dismiss install prompt"
        >
          ✕
        </button>
        <button
          onClick={handleInstallClick}
          className="px-4 py-2 bg-[#c8a84b] hover:bg-[#d4b65c] text-slate-900 text-sm font-bold rounded-lg transition-colors"
        >
          Install
        </button>
      </div>
    </div>
  );
}
