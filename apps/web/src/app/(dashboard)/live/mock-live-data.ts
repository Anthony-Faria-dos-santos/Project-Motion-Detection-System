/**
 * Mock data for the Live Monitoring screen.
 *
 * All values are lifted directly from the canonical visual target
 * `docs/02-ux/frontend-handoff/live-monitoring-mockup.html`. Types are local
 * to this file (not imported from @motionops/types) because they only need to
 * describe what the page currently renders — the real backend contracts will
 * arrive later via Sprint BE-2 and will supersede these shapes.
 *
 * Nothing here should ever fetch, compute, or branch on env — it is pure data.
 */

export interface MockCamera {
  id: string;
  name: string;
  status: 'live' | 'alert' | 'offline';
  fps: number | null;
}

export interface MockBoundingBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  confidence: number;
  severity: 'critical' | 'warning' | 'info' | 'success';
  trackId?: string;
}

export interface MockTrail {
  id: string;
  points: Array<{ x: number; y: number }>;
  severity: 'critical' | 'warning' | 'info' | 'success';
}

export interface MockZone {
  id: string;
  points: Array<{ x: number; y: number }>;
  label: string;
  severity?: 'critical' | 'warning' | 'info' | 'success';
}

export interface MockTimelineEvent {
  id: string;
  leftPercent: number;
  laneIndex?: number;
  severity: 'critical' | 'warning' | 'info' | 'success';
  label: string;
  timestamp?: string;
}

export interface MockEventStreamItem {
  id: string;
  severity: 'critical' | 'warning' | 'info' | 'success';
  type: string;
  time: string;
  meta: string;
}

export interface MockKpi {
  label: string;
  value: string | number;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  tone?: 'primary' | 'success' | 'warning' | 'critical';
}

/* ─── Cameras ──────────────────────────────────────────────────────── */

export const mockCameras: MockCamera[] = [
  { id: 'cam-01', name: 'Cam 01 · Entry', status: 'live', fps: 30 },
  { id: 'cam-02', name: 'Cam 02 · South Gate', status: 'alert', fps: 30 },
  { id: 'cam-03', name: 'Cam 03 · Aisle A', status: 'live', fps: 24 },
  { id: 'cam-04', name: 'Cam 04 · Loading Bay', status: 'live', fps: 30 },
  { id: 'cam-05', name: 'Cam 05 · Parking', status: 'live', fps: 15 },
  { id: 'cam-06', name: 'Cam 06 · Roof', status: 'offline', fps: null },
];

export const mockActiveCameraId = 'cam-02';

/* ─── Overlay primitives (SVG viewBox = 0 0 1200 700) ──────────────── */

export const mockBoundingBoxes: MockBoundingBox[] = [
  {
    id: 'bbox-person-042',
    x: 420,
    y: 380,
    width: 44,
    height: 110,
    label: 'Person',
    confidence: 0.96,
    severity: 'critical',
    trackId: '042',
  },
  {
    id: 'bbox-vehicle',
    x: 860,
    y: 450,
    width: 140,
    height: 80,
    label: 'Vehicle',
    confidence: 0.88,
    severity: 'info',
  },
];

export const mockTrails: MockTrail[] = [
  {
    id: 'trail-person',
    // Mockup: M 200 600 Q 380 500 420 400  (magenta dashed)
    points: [
      { x: 200, y: 600 },
      { x: 380, y: 500 },
      { x: 420, y: 400 },
    ],
    severity: 'critical',
  },
  {
    id: 'trail-vehicle',
    // Mockup: M 1100 560 Q 950 480 870 460  (cyan dashed)
    points: [
      { x: 1100, y: 560 },
      { x: 950, y: 480 },
      { x: 870, y: 460 },
    ],
    severity: 'info',
  },
];

export const mockZones: MockZone[] = [
  {
    id: 'zone-restricted',
    points: [
      { x: 340, y: 420 },
      { x: 500, y: 420 },
      { x: 540, y: 540 },
      { x: 320, y: 540 },
    ],
    label: 'RESTRICTED ZONE',
    severity: 'critical',
  },
];

/* ─── Timeline ─────────────────────────────────────────────────────── */

export const mockTimelineTicks: string[] = [
  '14:00',
  '14:10',
  '14:20',
  '14:30',
  '14:40',
  '14:50',
  '15:00',
];

export const mockTimelineEvents: MockTimelineEvent[] = [
  {
    id: 'tl-vehicle-1402',
    leftPercent: 2,
    severity: 'info',
    label: 'Vehicle',
    timestamp: '14:02',
  },
  {
    id: 'tl-motion-1408',
    leftPercent: 14,
    severity: 'warning',
    label: 'Motion spike',
    timestamp: '14:08',
  },
  {
    id: 'tl-delivery-1415',
    leftPercent: 24,
    severity: 'success',
    label: 'Delivery',
    timestamp: '14:15',
  },
  {
    id: 'tl-person-1422',
    leftPercent: 36,
    severity: 'info',
    label: 'Person',
    timestamp: '14:22',
  },
  {
    id: 'tl-loitering-1426',
    leftPercent: 44,
    laneIndex: 1,
    severity: 'warning',
    label: 'Loitering',
    timestamp: '14:26',
  },
  {
    id: 'tl-zone-1431',
    leftPercent: 52,
    severity: 'critical',
    label: 'Zone intrusion',
    timestamp: '14:31',
  },
  {
    id: 'tl-person042-1432',
    leftPercent: 54,
    laneIndex: 1,
    severity: 'critical',
    label: 'Person ID#042',
    timestamp: '14:32',
  },
  {
    id: 'tl-vehicle-1441',
    leftPercent: 68,
    severity: 'info',
    label: 'Vehicle',
    timestamp: '14:41',
  },
  {
    id: 'tl-lowlight-1447',
    leftPercent: 78,
    severity: 'warning',
    label: 'Low light',
    timestamp: '14:47',
  },
  {
    id: 'tl-staffbadge-1453',
    leftPercent: 88,
    severity: 'success',
    label: 'Staff badge',
    timestamp: '14:53',
  },
];

export const mockCurrentTimelinePercent = 54;

/* ─── Right panel KPIs + event stream ──────────────────────────────── */

export const mockKpis: MockKpi[] = [
  {
    label: 'Events',
    value: 142,
    trend: '↑ 12% vs yesterday',
    trendDirection: 'up',
    tone: 'primary',
  },
  {
    label: 'Confirmed',
    value: 8,
    trend: '↑ 3 today',
    trendDirection: 'up',
    tone: 'primary',
  },
  {
    label: 'False +',
    value: 22,
    trend: '↓ 18% vs baseline',
    trendDirection: 'down',
    tone: 'warning',
  },
  {
    label: 'Unreviewed',
    value: 12,
    trend: 'Action needed',
    trendDirection: 'down',
    tone: 'critical',
  },
];

export const mockEventStream: MockEventStreamItem[] = [
  {
    id: 'evt-zone-intrusion',
    severity: 'critical',
    type: 'Zone Intrusion',
    time: '14:32:07',
    meta: 'Cam 02 · Person ID#042 · Restricted zone · conf 0.96',
  },
  {
    id: 'evt-loitering',
    severity: 'warning',
    type: 'Loitering',
    time: '14:26:12',
    meta: 'Cam 02 · Person · 3m42s in zone · conf 0.81',
  },
  {
    id: 'evt-vehicle',
    severity: 'info',
    type: 'Vehicle Detected',
    time: '14:22:48',
    meta: 'Cam 02 · Van · Entering gate · conf 0.88',
  },
];

export const mockActiveRules: string[] = [
  'Zone A Intrusion',
  'Night Loitering',
  'Staff Badge',
  'Vehicle Track',
];
