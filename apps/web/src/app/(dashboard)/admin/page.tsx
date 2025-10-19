'use client';

import { useState, useCallback } from 'react';
import {
  Settings,
  RotateCcw,
  Save,
  CheckCircle2,
  Shield,
  Zap,
  Eye,
  Bell,
  Crosshair,
  User,
  Clock,
  ArrowRight,
  ChevronDown,
  Package,
} from 'lucide-react';
import { Card } from '@/components/ui';
import { cn } from '@/lib/utils';
import {
  mockRuntimeConfig,
  mockPresets,
  mockAuditLogs,
} from '@/lib/mock-data';
import type {
  RuntimeConfigField,
  RuntimeConfigSection,
} from '@motionops/types';

/* -- Helpers ----------------------------------------------------------- */

function formatRelativeTime(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = now - then;
  if (diffMs < 0) return 'just now';
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const sectionIcons: Record<string, React.ElementType> = {
  detector: Crosshair,
  motion: Eye,
  tracking: Zap,
  alerting: Bell,
};

const tabKeys = ['detector', 'motion', 'tracking', 'alerting'] as const;

/* -- Toast Component --------------------------------------------------- */

function Toast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <div
      className={cn(
        'fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 shadow-lg backdrop-blur-sm transition-all duration-300',
        visible
          ? 'translate-y-0 opacity-100'
          : 'pointer-events-none translate-y-4 opacity-0',
      )}
    >
      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
      <span className="text-xs font-medium text-emerald-300">{message}</span>
    </div>
  );
}

/* -- Range Slider Field ------------------------------------------------ */

function SliderField({
  field,
  onValueChange,
  onReset,
}: {
  field: RuntimeConfigField;
  onValueChange: (key: string, value: number) => void;
  onReset: (key: string) => void;
}) {
  const min = field.min ?? 0;
  const max = field.max ?? 100;
  const step = field.step ?? 1;
  const value = field.value as number;
  const isDefault = value === field.defaultValue;
  const displayValue =
    field.type === 'float' ? value.toFixed(2) : String(value);

  // Calculate percentage for the gradient fill
  const percent = ((value - min) / (max - min)) * 100;

  return (
    <div className="space-y-2 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/20 p-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-[hsl(var(--foreground))]">
          {field.label}
        </label>
        <div className="flex items-center gap-2">
          <span className="rounded bg-[hsl(var(--primary))]/10 px-2 py-0.5 text-xs font-semibold tabular-nums text-[hsl(var(--primary))]">
            {displayValue}
          </span>
          {!isDefault && (
            <button
              onClick={() => onReset(field.key)}
              className="rounded p-1 text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--muted))]/50 hover:text-[hsl(var(--foreground))]"
              title={`Reset to default (${field.type === 'float' ? (field.defaultValue as number).toFixed(2) : field.defaultValue})`}
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onValueChange(field.key, parseFloat(e.target.value))}
        className="slider-input h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[hsl(var(--muted))]"
        style={{
          background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${percent}%, hsl(var(--muted)) ${percent}%, hsl(var(--muted)) 100%)`,
        }}
      />
      <div className="flex items-center justify-between">
        <span className="text-[10px] tabular-nums text-[hsl(var(--muted-foreground))]">
          {field.type === 'float' ? min.toFixed(1) : min}
        </span>
        <span className="text-[10px] tabular-nums text-[hsl(var(--muted-foreground))]">
          {field.type === 'float' ? max.toFixed(1) : max}
        </span>
      </div>
      <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
        {field.description}
      </p>
    </div>
  );
}

/* -- Toggle Field ------------------------------------------------------ */

function ToggleField({
  field,
  onToggle,
}: {
  field: RuntimeConfigField;
  onToggle: (key: string, value: boolean) => void;
}) {
  const checked = field.value as boolean;

  return (
    <div className="flex items-center justify-between rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/20 p-3">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-[hsl(var(--foreground))]">
          {field.label}
        </p>
        <p className="mt-0.5 text-[10px] text-[hsl(var(--muted-foreground))]">
          {field.description}
        </p>
      </div>
      <button
        onClick={() => onToggle(field.key, !checked)}
        className={cn(
          'relative ml-3 inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors',
          checked ? 'bg-[hsl(var(--primary))]' : 'bg-[hsl(var(--muted))]',
        )}
      >
        <span
          className={cn(
            'inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform',
            checked ? 'translate-x-[18px]' : 'translate-x-[3px]',
          )}
        />
      </button>
    </div>
  );
}

/* -- Select Field ------------------------------------------------------ */

function SelectField({
  field,
  onSelectChange,
}: {
  field: RuntimeConfigField;
  onSelectChange: (key: string, value: string) => void;
}) {
  return (
    <div className="space-y-1.5 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/20 p-3">
      <label className="text-xs font-medium text-[hsl(var(--foreground))]">
        {field.label}
      </label>
      <div className="relative">
        <select
          value={field.value as string}
          onChange={(e) => onSelectChange(field.key, e.target.value)}
          className="w-full appearance-none rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-1.5 pr-8 text-xs font-medium text-[hsl(var(--foreground))] transition-colors hover:border-[hsl(var(--primary))]/40 focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]/30"
        >
          {field.options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt.charAt(0).toUpperCase() + opt.slice(1)}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
      </div>
      <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
        {field.description}
      </p>
    </div>
  );
}

/* -- Audit Action Badge ------------------------------------------------ */

function ActionBadge({ action }: { action: string }) {
  const colorMap: Record<string, string> = {
    'config:update': 'bg-teal-500/15 text-teal-400',
    'preset:apply': 'bg-blue-500/15 text-blue-400',
    'event:review': 'bg-emerald-500/15 text-emerald-400',
    'camera:create': 'bg-violet-500/15 text-violet-400',
  };
  const cls = colorMap[action] ?? 'bg-zinc-500/15 text-zinc-400';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        cls,
      )}
    >
      {action.replace(':', ' ')}
    </span>
  );
}

/* -- Page Component ---------------------------------------------------- */

export default function AdminConsolePage() {
  const [activeTab, setActiveTab] = useState<string>('detector');
  const [activePresetId, setActivePresetId] = useState(
    mockRuntimeConfig.presetId,
  );
  const [toast, setToast] = useState({ message: '', visible: false });

  // Deep clone sections into local state for editable config
  const [sections, setSections] = useState<RuntimeConfigSection[]>(() =>
    JSON.parse(JSON.stringify(mockRuntimeConfig.sections)),
  );

  const showToast = useCallback((message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2500);
  }, []);

  const updateField = useCallback(
    (sectionKey: string, fieldKey: string, newValue: number | boolean | string) => {
      setSections((prev) =>
        prev.map((sec) =>
          sec.key === sectionKey
            ? {
                ...sec,
                fields: sec.fields.map((f) =>
                  f.key === fieldKey ? { ...f, value: newValue } : f,
                ),
              }
            : sec,
        ),
      );
      const section = sections.find((s) => s.key === sectionKey);
      const field = section?.fields.find((f) => f.key === fieldKey);
      const label = field?.label ?? fieldKey;
      const displayVal =
        typeof newValue === 'number'
          ? field?.type === 'float'
            ? newValue.toFixed(2)
            : String(newValue)
          : typeof newValue === 'boolean'
            ? newValue
              ? 'On'
              : 'Off'
            : newValue;
      showToast(`${label} updated to ${displayVal}`);
    },
    [sections, showToast],
  );

  const resetField = useCallback(
    (sectionKey: string, fieldKey: string) => {
      const section = sections.find((s) => s.key === sectionKey);
      const field = section?.fields.find((f) => f.key === fieldKey);
      if (field) {
        updateField(sectionKey, fieldKey, field.defaultValue);
      }
    },
    [sections, updateField],
  );

  const handleApplyPreset = useCallback(
    (presetId: string, presetName: string) => {
      setActivePresetId(presetId);
      showToast(`Preset "${presetName}" applied`);
    },
    [showToast],
  );

  const activeSection = sections.find((s) => s.key === activeTab);

  return (
    <div className="space-y-6">
      {/* -- Page Header ------------------------------------------------- */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            Admin Console
          </h1>
          <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
            Runtime configuration, presets, and audit trail.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/20 px-3 py-1.5">
            <Settings className="h-3 w-3 text-[hsl(var(--muted-foreground))]" />
            <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
              Config{' '}
              <span className="font-semibold text-[hsl(var(--foreground))]">
                v{mockRuntimeConfig.version}
              </span>{' '}
              — last updated{' '}
              <span className="font-medium text-[hsl(var(--foreground))]">
                {formatRelativeTime(mockRuntimeConfig.updatedAt)}
              </span>{' '}
              by{' '}
              <span className="font-medium text-[hsl(var(--foreground))]">
                {mockRuntimeConfig.updatedBy}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* -- Main Grid: Config + Presets --------------------------------- */}
      <div className="grid gap-6 lg:grid-cols-4">
        {/* Config Sections -- 3 cols */}
        <div className="lg:col-span-3">
          {/* Tab Row */}
          <div className="mb-4 flex items-center gap-1 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-1">
            {tabKeys.map((tabKey) => {
              const section = sections.find((s) => s.key === tabKey);
              const Icon = sectionIcons[tabKey] ?? Settings;
              const isActive = activeTab === tabKey;
              return (
                <button
                  key={tabKey}
                  onClick={() => setActiveTab(tabKey)}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-all',
                    isActive
                      ? 'bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] shadow-sm'
                      : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]/30 hover:text-[hsl(var(--foreground))]',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {section?.label ?? tabKey}
                </button>
              );
            })}
          </div>

          {/* Active Section Fields */}
          {activeSection && (
            <Card
              title={activeSection.label}
              action={
                <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                  {activeSection.fields.length} field
                  {activeSection.fields.length !== 1 ? 's' : ''}
                </span>
              }
            >
              <div className="space-y-3">
                {activeSection.fields.map((field) => {
                  if (field.type === 'float' || field.type === 'int') {
                    return (
                      <SliderField
                        key={field.key}
                        field={field}
                        onValueChange={(key, val) =>
                          updateField(activeSection.key, key, val)
                        }
                        onReset={(key) =>
                          resetField(activeSection.key, key)
                        }
                      />
                    );
                  }
                  if (field.type === 'boolean') {
                    return (
                      <ToggleField
                        key={field.key}
                        field={field}
                        onToggle={(key, val) =>
                          updateField(activeSection.key, key, val)
                        }
                      />
                    );
                  }
                  if (field.type === 'select') {
                    return (
                      <SelectField
                        key={field.key}
                        field={field}
                        onSelectChange={(key, val) =>
                          updateField(activeSection.key, key, val)
                        }
                      />
                    );
                  }
                  return null;
                })}
              </div>
            </Card>
          )}
        </div>

        {/* Presets Panel -- 1 col */}
        <div className="lg:col-span-1">
          <Card
            title="Presets"
            action={
              <Package className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
            }
          >
            <div className="space-y-3">
              {mockPresets.map((preset) => {
                const isActive = preset.id === activePresetId;
                return (
                  <div
                    key={preset.id}
                    className={cn(
                      'rounded-md border p-3 transition-colors',
                      isActive
                        ? 'border-[hsl(var(--primary))]/40 bg-[hsl(var(--primary))]/5'
                        : 'border-[hsl(var(--border))] bg-[hsl(var(--muted))]/20',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-[hsl(var(--foreground))]">
                            {preset.name}
                          </span>
                          {isActive && (
                            <span className="rounded bg-[hsl(var(--primary))]/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[hsl(var(--primary))]">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[10px] text-[hsl(var(--muted-foreground))]">
                          {preset.description}
                        </p>
                        <div className="mt-1.5 flex items-center gap-2">
                          {preset.isBuiltIn && (
                            <span className="inline-flex items-center gap-0.5 rounded bg-teal-500/10 px-1.5 py-0.5 text-[9px] font-medium text-teal-400">
                              <Shield className="h-2.5 w-2.5" />
                              Built-in
                            </span>
                          )}
                          <span className="text-[9px] text-[hsl(var(--muted-foreground))]">
                            by {preset.createdBy}
                          </span>
                        </div>
                      </div>
                    </div>
                    {!isActive && (
                      <button
                        onClick={() =>
                          handleApplyPreset(preset.id, preset.name)
                        }
                        className="mt-2 w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-1.5 text-[10px] font-medium text-[hsl(var(--foreground))] transition-colors hover:border-[hsl(var(--primary))]/40 hover:bg-[hsl(var(--primary))]/5 hover:text-[hsl(var(--primary))]"
                      >
                        Apply Preset
                      </button>
                    )}
                  </div>
                );
              })}

              {/* Save as new preset button */}
              <button className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-[hsl(var(--border))] bg-transparent px-3 py-2.5 text-[10px] font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:border-[hsl(var(--primary))]/40 hover:bg-[hsl(var(--primary))]/5 hover:text-[hsl(var(--primary))]">
                <Save className="h-3 w-3" />
                Save as new preset
              </button>
            </div>
          </Card>
        </div>
      </div>

      {/* -- Audit Trail -------------------------------------------------- */}
      <Card
        title="Audit Trail"
        action={
          <a
            href="#"
            className="inline-flex items-center gap-1 text-[10px] font-medium text-[hsl(var(--primary))] hover:underline"
          >
            View full audit <ArrowRight className="h-3 w-3" />
          </a>
        }
      >
        <div className="-mx-4 -my-4">
          {mockAuditLogs.map((entry, i) => (
            <div
              key={entry.id}
              className={cn(
                'flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[hsl(var(--muted))]/30',
                i < mockAuditLogs.length - 1 &&
                  'border-b border-[hsl(var(--border))]',
              )}
            >
              {/* User icon */}
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--muted))]/50">
                <User className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[hsl(var(--foreground))]">
                    {entry.userDisplayName}
                  </span>
                  <ActionBadge action={entry.action} />
                  {entry.resourceId && (
                    <span className="rounded bg-[hsl(var(--muted))]/50 px-1.5 py-0.5 text-[9px] font-medium text-[hsl(var(--muted-foreground))]">
                      {entry.resourceId}
                    </span>
                  )}
                </div>
                {entry.changes && entry.changes.length > 0 && (
                  <p className="mt-0.5 text-[10px] text-[hsl(var(--muted-foreground))]">
                    {entry.changes.map((c, ci) => (
                      <span key={ci}>
                        {ci > 0 && ', '}
                        <span className="font-medium text-[hsl(var(--foreground))]">
                          {c.field}
                        </span>
                        :{' '}
                        <span className="text-red-400/80 line-through">
                          {String(c.oldValue)}
                        </span>{' '}
                        <span className="text-emerald-400">
                          {String(c.newValue)}
                        </span>
                      </span>
                    ))}
                  </p>
                )}
              </div>

              {/* Timestamp */}
              <div className="flex shrink-0 items-center gap-1 text-[10px] text-[hsl(var(--muted-foreground))]">
                <Clock className="h-2.5 w-2.5" />
                {formatRelativeTime(entry.createdAt)}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* -- Toast ------------------------------------------------------- */}
      <Toast message={toast.message} visible={toast.visible} />

      {/* -- Slider Styles ----------------------------------------------- */}
      <style>{`
        .slider-input::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: hsl(var(--primary));
          cursor: pointer;
          border: 2px solid hsl(var(--card));
          box-shadow: 0 0 0 1px hsl(var(--primary) / 0.3);
        }
        .slider-input::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: hsl(var(--primary));
          cursor: pointer;
          border: 2px solid hsl(var(--card));
          box-shadow: 0 0 0 1px hsl(var(--primary) / 0.3);
        }
      `}</style>
    </div>
  );
}
