/**
 * Remove credentials from URLs before sending to clients.
 * rtsp://user:pass@cam.local -> rtsp://***:***@cam.local
 */
export function sanitizeUrl(url: string | null): string | null {
  if (!url) return null;
  return url.replace(/:\/\/([^:]+):([^@]+)@/g, '://***:***@');
}
