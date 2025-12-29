import { useState, useEffect, useRef } from 'react';
import './Tabs.css';

function RoadLearningTab() {
  const [isActive, setIsActive] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [creditsEarned, setCreditsEarned] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Cleanup interval on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const handleToggle = () => {
    if (!isActive) {
      setIsActive(true);
      // Clear any existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      // Simulate continuous processing
      intervalRef.current = setInterval(() => {
        setProcessingProgress((prev) => {
          if (prev >= 100) {
            setCreditsEarned((c) => c + 10);
            return 0; // Reset and continue
          }
          return prev + 5;
        });
      }, 200);
    } else {
      setIsActive(false);
      setProcessingProgress(0);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  };

  return (
    <div className="tab-container">
      <h2 className="tab-title">Road Learning</h2>
      <h3 className="tab-subtitle">Help Tesla Learn New Roads!</h3>

      <div className="tab-card">
        <p className="tab-description">
          Process live camera feed to help train Autopilot. Earn credits for Premium Connectivity!
        </p>
        <p className="tab-description-secondary">
          Note: Full live camera processing requires CLI. This interface shows the concept.
        </p>

        <div className="tab-content">
          <div className="switch-group">
            <label className="switch-label">
              <input
                type="checkbox"
                checked={isActive}
                onChange={handleToggle}
                className="switch-input"
              />
              <span className="switch-text">
                {isActive ? 'Processing Active' : 'Start Processing'}
              </span>
            </label>
          </div>

          {isActive && (
            <div className="processing-section">
              <div className="chip-group">
                <span className="chip chip-primary">Processing</span>
                <span className="chip">{`${creditsEarned} Credits Earned`}</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${processingProgress}%` }}></div>
              </div>
              <p className="progress-text">Processing frame... {processingProgress}%</p>
            </div>
          )}

          {!isActive && (
            <button
              type="button"
              className="btn-primary btn-full"
              onClick={handleToggle}
            >
              Start Road Learning
            </button>
          )}

          {isActive && (
            <button
              type="button"
              className="btn-secondary btn-full"
              onClick={handleToggle}
            >
              Stop Processing
            </button>
          )}
        </div>
      </div>

      <div className="tab-stats-grid">
        <div className="tab-card">
          <h3 className="tab-subtitle">Status</h3>
          <div className="chip-group">
            <span className={`chip ${isActive ? 'chip-primary' : ''}`}>
              {isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        <div className="tab-card">
          <h3 className="tab-subtitle">Credits</h3>
          <div className="stat-value">{creditsEarned}</div>
          <p className="stat-description">Credits earned this session</p>
        </div>

        <div className="tab-card">
          <h3 className="tab-subtitle">Frames Processed</h3>
          <div className="stat-value">{Math.floor(creditsEarned * 10)}</div>
          <p className="stat-description">Total frames analysed</p>
        </div>
      </div>
    </div>
  );
}

export default RoadLearningTab;
