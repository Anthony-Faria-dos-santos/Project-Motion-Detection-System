'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/lib/store';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function SessionRestorer() {
  const restoreSession = useAuthStore((s) => s.restoreSession);
  const restored = useRef(false);
  useEffect(() => {
    if (!restored.current) {
      restored.current = true;
      restoreSession();
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
