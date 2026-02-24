import { useEffect, useRef, useState, useCallback } from 'react';
import { getWsUrl } from '../utils/constants';

/**
 * WebSocket hook for real-time game communication.
 * Handles connection, reconnection, and message routing.
 */
export default function useWebSocket(gameCode, onMessage) {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const onMessageRef = useRef(onMessage);

  onMessageRef.current = onMessage;

  const connect = useCallback(() => {
    if (!gameCode) return;

    const url = getWsUrl(gameCode);
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (onMessageRef.current) {
          onMessageRef.current(data);
        }
      } catch (e) {
        console.error('WebSocket message parse error:', e);
      }
    };

    ws.onclose = (event) => {
      setConnected(false);
      wsRef.current = null;
      if (!event.wasClean) {
        reconnectTimer.current = setTimeout(() => connect(), 2000);
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [gameCode]);

  const sendMessage = useCallback((data) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close(1000, 'Component unmount');
      wsRef.current = null;
    }
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return { connected, sendMessage, disconnect };
}
