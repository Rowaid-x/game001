import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Timer hook — counts up from 0 based on a server start timestamp.
 * Server-authoritative: uses startedAt ISO timestamp to calculate elapsed.
 */
export default function useTimer(startedAt, maxTime = 240, onTimeout) {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  const start = useCallback((serverStartedAt) => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    const startTime = serverStartedAt ? new Date(serverStartedAt).getTime() : Date.now();
    setRunning(true);

    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const secs = (now - startTime) / 1000;
      setElapsed(Math.min(secs, maxTime));

      if (secs >= maxTime) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        setRunning(false);
        if (onTimeoutRef.current) onTimeoutRef.current();
      }
    }, 100);
  }, [maxTime]);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setRunning(false);
  }, []);

  const reset = useCallback(() => {
    stop();
    setElapsed(0);
  }, [stop]);

  useEffect(() => {
    if (startedAt) {
      start(startedAt);
    } else {
      reset();
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startedAt, start, reset]);

  return { elapsed, running, start, stop, reset };
}
