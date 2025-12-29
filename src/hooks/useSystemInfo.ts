import { useState, useEffect, useCallback } from 'react';
import { detectSystemCapabilities } from '../utils/gpuDetection';
import type { SystemInfo } from '../utils/api';

export function useSystemInfo() {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshSystemInfo = useCallback(() => {
    try {
      setLoading(true);
      setError(null);
      
      // Detect GPU/CPU directly from browser
      const capabilities = detectSystemCapabilities();
      
      // Convert to SystemInfo format
      const info: SystemInfo = {
        hasGPU: capabilities.hasGPU,
        gpuName: capabilities.gpuName,
        cudaAvailable: false, // Browser can't detect CUDA, only backend can
        device: capabilities.device === 'gpu' ? 'cuda' : 'cpu', // Map to backend format
        torchVersion: undefined, // Only available from backend
      };
      
      setSystemInfo(info);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to detect system capabilities';
      setError(errorMessage);
      // Fallback to CPU
      setSystemInfo({
        hasGPU: false,
        cudaAvailable: false,
        device: 'cpu',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSystemInfo();
  }, [refreshSystemInfo]);

  return { systemInfo, loading, error, refreshSystemInfo };
}

