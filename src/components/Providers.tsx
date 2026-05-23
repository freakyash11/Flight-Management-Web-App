'use client';

import { useEffect, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUserStore } from '@/store/useUserStore';
import { ToastProvider } from '@/components/ui/Toast';
import InstallPromptBanner from '@/components/ui/InstallPromptBanner';


export default function Providers({ children }: { children: ReactNode }) {
  const setSession = useUserStore((s) => s.setSession);
  const clearSession = useUserStore((s) => s.clearSession);

  useEffect(() => {
    const supabase = createClient();

    // Initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession({
          accessToken: session.access_token,
          userId: session.user.id,
          email: session.user.email!,
        });
      } else {
        clearSession();
      }
    });

    // Auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setSession({
          accessToken: session.access_token,
          userId: session.user.id,
          email: session.user.email!,
        });
      } else {
        clearSession();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setSession, clearSession]);

  return (
    <ToastProvider>
      {children}
      <InstallPromptBanner />
    </ToastProvider>
  );
}
