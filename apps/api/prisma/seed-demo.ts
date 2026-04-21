/**
 * Seed script for the demo account.
 *
 * Creates (or refreshes) a single demo user with:
 *   - status ACTIVE
 *   - isDemoAccount = true
 *   - role VIEWER (read-only)
 *   - 4 fictional cameras with realistic locations
 *   - 1 scene profile per camera
 *   - 12 events with varying severities and review statuses
 *
 * Run with: pnpm --filter @motionops/api run seed:demo
 *
 * The demo user has a fixed Supabase password ("DemoMotionOps2026!") so the
 * /demo route on the frontend can auto-login. The password is intentionally
 * documented here because the account is read-only and dedicated to demo.
 *
 * IMPORTANT: this script must run AFTER the corresponding Supabase auth user
 * has been created manually (or via the /api/auth/signup endpoint with the
 * demo email). The seed only creates/updates the Prisma row + fixtures.
 */

import { PrismaClient, Role, UserStatus, CameraStatus, EventSeverity, ReviewStatus } from '@prisma/client';
import entranceScript from './demo-scripts/entrance.json';
import parkingScript from './demo-scripts/parking.json';
import loadingDockScript from './demo-scripts/loading-dock.json';
import serverRoomScript from './demo-scripts/server-room.json';

const prisma = new PrismaClient();

const DEMO_EMAIL = 'demo@motionops.local';
const DEMO_DISPLAY_NAME = 'Demo User';
const CLIPS_BASE_URL = process.env.DEMO_CLIPS_BASE_URL || 'http://localhost:3000';
const CLIP_PATH = (name: string) => `${CLIPS_BASE_URL}/demo/clips/${name}.mp4`;

async function main() {
  console.log('🎬 Seeding demo account…');

  // Find or fail — the Supabase user must already exist
  let user = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (!user) {
    console.error(`❌ User ${DEMO_EMAIL} does not exist. Create it first via /api/auth/signup.`);
    process.exit(1);
  }

  // Force the demo flags
  user = await prisma.user.update({
    where: { id: user.id },
    data: {
      isDemoAccount: true,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: user.emailVerifiedAt || new Date(),
      role: Role.VIEWER,
      displayName: DEMO_DISPLAY_NAME,
      onboardingCompletedAt: new Date(),
      onboardingStep: 5,
    },
  });
  console.log(`✓ Demo user updated (id=${user.id})`);

  // Wipe existing demo cameras + events to refresh the fixtures
  // (only safe because the demo user is the only owner; real multi-tenant
  //  systems would scope this differently)
  await prisma.event.deleteMany({
    where: { camera: { name: { startsWith: '[DEMO]' } } },
  });
  await prisma.camera.deleteMany({
    where: { name: { startsWith: '[DEMO]' } },
  });
  console.log('✓ Old demo cameras and events cleared');

  // Create 4 cameras
  const cameras = await Promise.all([
    prisma.camera.create({
      data: {
        name: '[DEMO] Main entrance',
        location: 'Building A — Front door',
        sourceUrl: 'rtsp://demo:demo@192.0.2.10:554/stream',
        status: CameraStatus.ONLINE,
        resolution: '1920x1080',
        fps: 25.0,
        latencyMs: 180,
        lastHeartbeat: new Date(),
        lastFrameAt: new Date(),
        demoClipUrl: CLIP_PATH('entrance'),
        demoEventScript: entranceScript,
      },
    }),
    prisma.camera.create({
      data: {
        name: '[DEMO] Parking lot',
        location: 'North parking',
        sourceUrl: 'rtsp://demo:demo@192.0.2.11:554/stream',
        status: CameraStatus.ONLINE,
        resolution: '1280x720',
        fps: 20.0,
        latencyMs: 240,
        lastHeartbeat: new Date(),
        lastFrameAt: new Date(),
        demoClipUrl: CLIP_PATH('parking'),
        demoEventScript: parkingScript,
      },
    }),
    prisma.camera.create({
      data: {
        name: '[DEMO] Warehouse loading dock',
        location: 'Warehouse — Dock 3',
        sourceUrl: 'rtsp://demo:demo@192.0.2.12:554/stream',
        status: CameraStatus.DEGRADED,
        resolution: '1920x1080',
        fps: 12.0,
        latencyMs: 520,
        lastHeartbeat: new Date(Date.now() - 8 * 60 * 1000),
        lastFrameAt: new Date(Date.now() - 9 * 60 * 1000),
        demoClipUrl: CLIP_PATH('loading-dock'),
        demoEventScript: loadingDockScript,
      },
    }),
    prisma.camera.create({
      data: {
        name: '[DEMO] Server room',
        location: 'IT — Server room rack 2',
        sourceUrl: 'rtsp://demo:demo@192.0.2.13:554/stream',
        status: CameraStatus.OFFLINE,
        resolution: '1920x1080',
        fps: 0,
        latencyMs: 0,
        lastHeartbeat: new Date(Date.now() - 2 * 60 * 60 * 1000),
        lastFrameAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        demoClipUrl: CLIP_PATH('server-room'),
        demoEventScript: serverRoomScript,
      },
    }),
  ]);
  console.log(`✓ Created ${cameras.length} demo cameras`);

  // Scene profiles
  await Promise.all(
    cameras.map((cam) =>
      prisma.sceneProfile.create({
        data: {
          name: 'Default',
          cameraId: cam.id,
          motionSensitivity: 0.5,
          detectorConfidence: 0.55,
          iouThreshold: 0.45,
          trackingBuffer: 30,
          classes: ['person', 'car', 'truck', 'bicycle'],
        },
      }),
    ),
  );
  console.log('✓ Created scene profiles');

  // Events — realistic mix
  const eventTemplates: Array<{
    cameraIdx: number;
    type: string;
    severity: EventSeverity;
    summary: string;
    reviewStatus: ReviewStatus;
    minutesAgo: number;
  }> = [
    { cameraIdx: 0, type: 'person_detected', severity: EventSeverity.LOW, summary: 'Person entered the entrance lobby', reviewStatus: ReviewStatus.CONFIRMED, minutesAgo: 5 },
    { cameraIdx: 0, type: 'person_detected', severity: EventSeverity.MEDIUM, summary: 'Group of 3 persons loitering at entrance', reviewStatus: ReviewStatus.UNREVIEWED, minutesAgo: 12 },
    { cameraIdx: 1, type: 'vehicle_detected', severity: EventSeverity.LOW, summary: 'Car entered parking lot', reviewStatus: ReviewStatus.CONFIRMED, minutesAgo: 18 },
    { cameraIdx: 1, type: 'vehicle_loitering', severity: EventSeverity.MEDIUM, summary: 'Vehicle stationary 30+ minutes', reviewStatus: ReviewStatus.FALSE_POSITIVE, minutesAgo: 25 },
    { cameraIdx: 0, type: 'person_after_hours', severity: EventSeverity.HIGH, summary: 'Person entered after closing hours', reviewStatus: ReviewStatus.UNREVIEWED, minutesAgo: 35 },
    { cameraIdx: 2, type: 'unauthorized_access', severity: EventSeverity.CRITICAL, summary: 'Unauthorized access attempt at loading dock', reviewStatus: ReviewStatus.ESCALATED, minutesAgo: 45 },
    { cameraIdx: 1, type: 'vehicle_detected', severity: EventSeverity.LOW, summary: 'Truck entered parking lot', reviewStatus: ReviewStatus.CONFIRMED, minutesAgo: 60 },
    { cameraIdx: 2, type: 'package_dropped', severity: EventSeverity.INFO, summary: 'Package dropped at dock 3', reviewStatus: ReviewStatus.UNREVIEWED, minutesAgo: 90 },
    { cameraIdx: 0, type: 'person_detected', severity: EventSeverity.LOW, summary: 'Visitor checking in at reception', reviewStatus: ReviewStatus.CONFIRMED, minutesAgo: 120 },
    { cameraIdx: 1, type: 'vehicle_detected', severity: EventSeverity.LOW, summary: 'Car exited parking lot', reviewStatus: ReviewStatus.CONFIRMED, minutesAgo: 150 },
    { cameraIdx: 2, type: 'motion_detected', severity: EventSeverity.MEDIUM, summary: 'Unexpected motion at dock 3 — night', reviewStatus: ReviewStatus.IGNORED, minutesAgo: 180 },
    { cameraIdx: 0, type: 'person_detected', severity: EventSeverity.LOW, summary: 'Cleaning staff entered the lobby', reviewStatus: ReviewStatus.CONFIRMED, minutesAgo: 240 },
  ];

  await Promise.all(
    eventTemplates.map((tpl) =>
      prisma.event.create({
        data: {
          type: tpl.type,
          severity: tpl.severity,
          summary: tpl.summary,
          cameraId: cameras[tpl.cameraIdx].id,
          reviewStatus: tpl.reviewStatus,
          reviewedAt: tpl.reviewStatus !== ReviewStatus.UNREVIEWED ? new Date(Date.now() - tpl.minutesAgo * 60 * 1000 + 5 * 60 * 1000) : null,
          reviewedBy: tpl.reviewStatus !== ReviewStatus.UNREVIEWED ? user.id : null,
          metadata: { confidence: 0.82 + Math.random() * 0.15 },
          timestampStart: new Date(Date.now() - tpl.minutesAgo * 60 * 1000),
          timestampEnd: new Date(Date.now() - tpl.minutesAgo * 60 * 1000 + 30 * 1000),
        },
      }),
    ),
  );
  console.log(`✓ Created ${eventTemplates.length} demo events`);

  console.log('🎬 Demo seed complete.');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
