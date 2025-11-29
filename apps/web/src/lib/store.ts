'use client';

import { create } from 'zustand';
import type { UserSessionView } from '@motionops/types';
import { api } from './api-client';
import { connectSocket, disconnectSocket } from './socket-client';

interface AuthState {
  user: UserSessionView | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email: string, password: string) => {
    const res = await api.post<{ user: UserSessionView }>('/api/auth/login', { email, password });
    connectSocket(); // no token needed — cookies sent automatically
    set({ user: res.user, isAuthenticated: true, isLoading: false });
  },

  logout: async () => {
    try {
      await api.post('/api/auth/logout', {});
    } catch {
      // best effort
    }
    disconnectSocket();
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  restoreSession: async () => {
    try {
      const user = await api.get<UserSessionView>('/api/auth/me');
      connectSocket();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      // Try refresh
      try {
        const res = await api.post<{ user: UserSessionView }>('/api/auth/refresh', {});
        connectSocket();
        set({ user: res.user, isAuthenticated: true, isLoading: false });
      } catch {
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    }
  },

  refreshSession: async () => {
    try {
      const res = await api.post<{ user: UserSessionView }>('/api/auth/refresh', {});
      set({ user: res.user, isAuthenticated: true });
    } catch {
      disconnectSocket();
      set({ user: null, isAuthenticated: false });
    }
  },
}));
