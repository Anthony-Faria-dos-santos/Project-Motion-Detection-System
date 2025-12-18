'use client';

import { Bell, User, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSocketStatus } from '@/hooks/use-socket';
import { useAuthStore } from '@/lib/store';

const socketStatusConfig = {
  connected: { dot: 'bg-emerald-500', label: 'Connected', text: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  disconnected: { dot: 'bg-amber-500', label: 'Disconnected', text: 'text-amber-400', bg: 'bg-amber-500/10' },
  connecting: { dot: 'bg-amber-500 animate-pulse', label: 'Connecting...', text: 'text-amber-400', bg: 'bg-amber-500/10' },
} as const;

export function Header() {
  const router = useRouter();
  const socketStatus = useSocketStatus();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const displayName = user?.displayName || 'Admin';
  const config = socketStatusConfig[socketStatus];

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--background))]/80 px-6 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
          Local
        </span>
        <div className={`flex items-center gap-1.5 rounded-full ${config.bg} px-2 py-0.5`}>
          <div className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
          <span className={`text-[11px] font-medium ${config.text}`}>{config.label}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="relative rounded-md p-2 text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--foreground))]">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[hsl(var(--status-critical))]" />
        </button>
        <button className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--foreground))]">
          <User className="h-4 w-4" />
          <span className="text-xs">{displayName}</span>
        </button>
        <button
          onClick={handleLogout}
          title="Sign out"
          className="rounded-md p-2 text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--foreground))]"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
