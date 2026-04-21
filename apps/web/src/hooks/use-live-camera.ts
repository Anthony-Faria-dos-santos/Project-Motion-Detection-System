'use client';

import { useEffect, useState } from 'react';
import { getSocket } from '@/lib/socket-client';

export interface LiveFrame {
  cameraId: string;
  /** Base64-encoded JPEG (fallback); prefer frameUrl in production */
  frame: string | null;
  /** Presigned Supabase Storage URL or HLS segment URL */
  frameUrl: string | null;
  width: number | null;
  height: number | null;
  fps: number | null;
  capturedAt: string;
}

export interface LiveTrack {
  id: string;
  className: string;
  confidence: number;
  /** Bounding box in frame coordinates */
  box: { x: number; y: number; w: number; h: number };
  /** Trail of recent centroids, newest last */
  trail?: Array<{ x: number; y: number }>;
}

export interface LiveTracksPayload {
  cameraId: string;
  tracks: LiveTrack[];
  capturedAt: string;
}

export interface DemoFeedScriptItem {
  offsetSec: number;
  type: string;
  severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  summary: string;
  objectClass: string;
  box: [number, number, number, number];
}

export interface DemoFeed {
  cameraId: string;
  clipUrl: string;
  loopDurationMs: number;
  loopStartEpoch: number;
  script: DemoFeedScriptItem[];
}

/**
 * Subscribe to the realtime feed of a single camera and expose the latest
 * frame + detected tracks. Returns `null` for `frame` or `tracks` until the
 * first payload arrives; the caller is responsible for rendering a loading
 * or paused state.
 *
 * The hook joins the `camera:<id>` room on mount and leaves on unmount. It
 * relies on the shared socket created by `connectSocket()` after login.
 */
export function useLiveCamera(cameraId: string | null) {
  const [frame, setFrame] = useState<LiveFrame | null>(null);
  const [tracks, setTracks] = useState<LiveTracksPayload | null>(null);
  const [demoFeed, setDemoFeed] = useState<DemoFeed | null>(null);

  useEffect(() => {
    if (!cameraId) return;
    const socket = getSocket();

    const onFrame = (payload: LiveFrame) => {
      if (payload.cameraId !== cameraId) return;
      setFrame(payload);
    };
    const onTracks = (payload: LiveTracksPayload) => {
      if (payload.cameraId !== cameraId) return;
      setTracks(payload);
    };
    const onDemoFeed = (payload: DemoFeed) => {
      if (payload.cameraId !== cameraId) return;
      setDemoFeed(payload);
    };

    socket.emit('camera:subscribe', { cameraId });
    socket.on('camera:frame', onFrame);
    socket.on('camera:tracks', onTracks);
    socket.on('camera:demo_feed', onDemoFeed);

    return () => {
      socket.emit('camera:unsubscribe', { cameraId });
      socket.off('camera:frame', onFrame);
      socket.off('camera:tracks', onTracks);
      socket.off('camera:demo_feed', onDemoFeed);
      setFrame(null);
      setTracks(null);
      setDemoFeed(null);
    };
  }, [cameraId]);

  return { frame, tracks, demoFeed };
}
