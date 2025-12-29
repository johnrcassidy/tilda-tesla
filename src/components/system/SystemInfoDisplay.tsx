import { useSystemInfo } from '../../hooks/useSystemInfo';
import { useEffect, useState } from 'react';
import './SystemInfoDisplay.css';

function SystemInfoDisplay() {
  const { systemInfo, loading, error, refreshSystemInfo } = useSystemInfo();

  if (loading) {
    return (
      <div className="system-info">
        <span className="system-info-label">Checking device capabilities...</span>
      </div>
    );
  }

  // Error state - show detected capabilities
  if (error) {
    return (
      <div className="system-info system-info-error">
        <span className="system-info-label">
          ⚠️ {error}
          <button 
            onClick={refreshSystemInfo}
            style={{ marginLeft: '8px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer', border: '1px solid #d0d1d2', background: '#fff' }}
          >
            Recheck
          </button>
        </span>
      </div>
    );
  }

  return (
    <div className={`system-info ${systemInfo.hasGPU ? 'system-info-gpu' : 'system-info-cpu'}`}>
      <span className="system-info-label">
        {systemInfo.hasGPU ? (
          <>
            <span className="system-info-icon">🚀</span>
            GPU: {systemInfo.gpuName || 'GPU Detected'}
            {systemInfo.cudaAvailable && ' (CUDA)'}
          </>
        ) : (
          <>
            <span className="system-info-icon">💻</span>
            CPU Mode
          </>
        )}
      </span>
      {systemInfo.torchVersion && (
        <span className="system-info-version">PyTorch {systemInfo.torchVersion}</span>
      )}
    </div>
  );
}

export default SystemInfoDisplay;

