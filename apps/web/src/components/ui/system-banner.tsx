'use client';

import { AlertTriangle, Wifi, WifiOff, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface SystemBannerProps {
  type: 'warning' | 'critical' | 'info';
  message: string;
  dismissible?: boolean;
}

const bannerStyles = {
  warning: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  critical: 'border-red-500/30 bg-red-500/10 text-red-300',
  info: 'border-teal-500/30 bg-teal-500/10 text-teal-300',
};

const iconMap = {
  warning: AlertTriangle,
  critical: WifiOff,
  info: Wifi,
};

export function SystemBanner({ type, message, dismissible = true }: SystemBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const Icon = iconMap[type];
  return (
    <div className={cn('flex items-center gap-2 border-b px-4 py-2 text-xs font-medium', bannerStyles[type])}>
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="flex-1">{message}</span>
      {dismissible && (
        <button onClick={() => setDismissed(true)} className="rounded p-0.5 hover:bg-white/10">
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
