'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  MonitorPlay,
  Bell,
  Search,
  Settings2,
  Activity,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Live Monitoring', href: '/live', icon: MonitorPlay },
  { name: 'Events', href: '/events', icon: Bell },
  { name: 'Admin Console', href: '/admin', icon: Settings2 },
  { name: 'Health', href: '/health', icon: Activity },
  { name: 'Investigations', href: '/investigations', icon: Search },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-56 flex-col border-r border-[hsl(var(--border))] bg-[hsl(var(--card))]">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 border-b border-[hsl(var(--border))] px-4">
        <Shield className="h-5 w-5 text-[hsl(var(--primary))]" />
        <span className="text-sm font-semibold tracking-tight text-[hsl(var(--foreground))]">
          MotionOps
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-2 py-3">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-[hsl(var(--accent))] text-[hsl(var(--foreground))]'
                  : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--foreground))]',
              )}
            >
              <item.icon
                className={cn(
                  'h-4 w-4 shrink-0',
                  isActive ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--foreground))]',
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-[hsl(var(--border))] px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span className="text-xs text-[hsl(var(--muted-foreground))]">System healthy</span>
        </div>
        <p className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">v0.0.1</p>
      </div>
    </aside>
  );
}
