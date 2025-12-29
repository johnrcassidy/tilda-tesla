import { useState } from 'react';
import './Tabs.css';

function VideoAnalysisTab() {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploading(true);
      setUploadProgress(0);
      
      // Simulate upload progress
      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setUploading(false);
            return 100;
          }
          return prev + 10;
        });
      }, 200);
    }
  };

  return (
    <div className="tab-container">
      <h2 className="tab-title">Video Analysis</h2>

      <div className="tab-card">
        <p className="tab-description">
          Upload your Tesla dashcam video file. Supported formats: MP4, AVI, MOV, etc.
        </p>

        <div className="tab-content">
          <div className="upload-section">
            <input
              accept="video/*"
              style={{ display: 'none' }}
              id="video-upload"
              type="file"
              onChange={handleFileSelect}
              disabled={uploading}
            />
            <label htmlFor="video-upload">
              <button
                type="button"
                className="btn-primary btn-full"
                disabled={uploading}
              >
                {selectedFile ? `Selected: ${selectedFile.name}` : 'Select Video File'}
              </button>
            </label>
          </div>

          {uploading && (
            <div className="progress-section">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
              </div>
              <p className="progress-text">Uploading... {uploadProgress}%</p>
            </div>
          )}

          {selectedFile && !uploading && (
            <div className="file-info">
              <div className="chip-group">
                <span className="chip chip-success">Upload Complete</span>
                <span className="chip">{selectedFile.name}</span>
                <span className="chip">{`${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`}</span>
              </div>
              <button type="button" className="btn-primary btn-full">
                Start Analysis
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="tab-card">
        <h3 className="tab-subtitle">Analysis Results</h3>
        <p className="tab-description">Analysis results will appear here after processing.</p>
      </div>
    </div>
  );
}

export default VideoAnalysisTab;
