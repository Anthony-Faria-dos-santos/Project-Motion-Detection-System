'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useAuthStore, markLoadingResolved } from '@/lib/store';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function hasSessionHint(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.split('; ').some((c) => c.startsWith('motionops_has_session='));
}

function SessionRestorer() {
  const restoreSession = useAuthStore((s) => s.restoreSession);
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    if (hasSessionHint()) {
      restoreSession();
    } else {
      // No session hint means the user was never logged in on this device —
      // skip the /auth/me round-trip and resolve the auth state so protected
      // guards can run immediately instead of flashing a spinner.
      markLoadingResolved();
    }
  }, [restoreSession]);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionRestorer />
      {children}
    </QueryClientProvider>
  );
}
