'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type {
  DashboardKpis,
  CameraSummary,
  EventListItem,
  HealthOverview,
  PaginatedResponse,
} from '@motionops/types';

/* ── Dashboard KPIs ──────────────────────────────────────────────────── */

export function useDashboardKpis() {
  return useQuery<DashboardKpis>({
    queryKey: ['dashboard', 'kpis'],
    queryFn: () => api.get('/api/dashboard/kpis'),
    refetchInterval: 15_000,
    retry: 1,
  });
}

/* ── Cameras ─────────────────────────────────────────────────────────── */

export function useCameras(params?: { page?: number; limit?: number }) {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 50;
  return useQuery<PaginatedResponse<CameraSummary>>({
    queryKey: ['cameras', page, limit],
    queryFn: () => api.get(`/api/cameras?page=${page}&limit=${limit}`),
    refetchInterval: 30_000,
    retry: 1,
  });
}

/* ── Events ──────────────────────────────────────────────────────────── */

export interface EventFilters {
  cameraId?: string;
  severity?: string;
  reviewStatus?: string;
  objectClass?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  page?: number;
}

export function useEvents(filters?: EventFilters) {
  const params = new URLSearchParams();
  if (filters?.cameraId && filters.cameraId !== 'all') params.set('cameraId', filters.cameraId);
  if (filters?.severity) params.set('severity', filters.severity);
  if (filters?.reviewStatus) params.set('reviewStatus', filters.reviewStatus);
  if (filters?.objectClass && filters.objectClass !== 'all') params.set('objectClass', filters.objectClass);
  if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters?.dateTo) params.set('dateTo', filters.dateTo);
  if (filters?.limit) params.set('limit', String(filters.limit));
  if (filters?.page) params.set('page', String(filters.page));

  const qs = params.toString();
  return useQuery<PaginatedResponse<EventListItem>>({
    queryKey: ['events', qs],
    queryFn: () => api.get(`/api/events${qs ? `?${qs}` : ''}`),
    refetchInterval: 30_000,
    retry: 1,
  });
}

/* ── Health ───────────────────────────────────────────────────────────── */

export function useHealth() {
  return useQuery<HealthOverview>({
    queryKey: ['health'],
    queryFn: () => api.get('/api/health'),
    refetchInterval: 10_000,
    retry: 1,
  });
}
