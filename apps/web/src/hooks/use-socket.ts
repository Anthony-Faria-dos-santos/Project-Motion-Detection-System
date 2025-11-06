'use client';

import { useEffect, useState } from 'react';
import { getSocket } from '@/lib/socket-client';

export type SocketStatus = 'connected' | 'disconnected' | 'connecting';

export function useSocketStatus(): SocketStatus {
  const [status, setStatus] = useState<SocketStatus>('disconnected');

  useEffect(() => {
    const socket = getSocket();

    function onConnect() { setStatus('connected'); }
    function onDisconnect() { setStatus('disconnected'); }
    function onConnecting() { setStatus('connecting'); }

    // Set initial state
    if (socket.connected) {
      setStatus('connected');
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('reconnect_attempt', onConnecting);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('reconnect_attempt', onConnecting);
    };
  }, []);

  return status;
}
