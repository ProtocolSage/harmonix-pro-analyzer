import { useState, useEffect, useRef, useCallback } from 'react';
import { RealEssentiaAudioEngine } from '../engines/RealEssentiaAudioEngine';
import type { EngineStatus } from '../types/audio';

/**
 * Custom hook for managing the audio analysis engine lifecycle
 *
 * Handles:
 * - Engine initialization
 * - Status monitoring
 * - Cleanup on unmount
 * - Error handling
 *
 * @returns Engine instance, status, and utility functions
 */
export function useAnalysisEngine() {
  const [engineStatus, setEngineStatus] = useState<EngineStatus>({
    status: 'initializing',
  });

  const engineRef = useRef<RealEssentiaAudioEngine | null>(null);
  const statusCheckInterval = useRef<number | null>(null);

  // Initialize engine
  useEffect(() => {
    // Create engine instance
    engineRef.current = new RealEssentiaAudioEngine();

    // Poll engine status
    statusCheckInterval.current = window.setInterval(() => {
      if (engineRef.current) {
        const status = engineRef.current.getEngineStatus();
        setEngineStatus(status);

        // Stop polling once ready or error
        if (status.status === 'ready' || status.status === 'error') {
          if (statusCheckInterval.current !== null) {
            clearInterval(statusCheckInterval.current);
            statusCheckInterval.current = null;
          }
        }
      }
    }, 1000);

    // Cleanup on unmount
    return () => {
      if (statusCheckInterval.current !== null) {
        clearInterval(statusCheckInterval.current);
      }
      if (engineRef.current) {
        engineRef.current.terminate();
        engineRef.current = null;
      }
    };
  }, []);

  const isReady = engineStatus.status === 'ready';
  const isInitializing = ['initializing', 'loading'].includes(engineStatus.status);
  const hasError = engineStatus.status === 'error';

  const retryInitialization = useCallback(() => {
    // Cleanup old engine
    if (engineRef.current) {
      engineRef.current.terminate();
    }

    // Create new engine
    engineRef.current = new RealEssentiaAudioEngine();
    setEngineStatus({ status: 'initializing' });

    // Restart status polling
    if (statusCheckInterval.current !== null) {
      clearInterval(statusCheckInterval.current);
    }

    statusCheckInterval.current = window.setInterval(() => {
      if (engineRef.current) {
        const status = engineRef.current.getEngineStatus();
        setEngineStatus(status);

        if (status.status === 'ready' || status.status === 'error') {
          if (statusCheckInterval.current !== null) {
            clearInterval(statusCheckInterval.current);
            statusCheckInterval.current = null;
          }
        }
      }
    }, 1000);
  }, []);

  return {
    engine: engineRef.current,
    engineStatus,
    isReady,
    isInitializing,
    hasError,
    retryInitialization,
  };
}
