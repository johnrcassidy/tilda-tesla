import { useState } from 'react';
import './Tabs.css';

function ImageAnalysisTab() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="tab-container">
      <h2 className="tab-title">Image Analysis</h2>

      <div className="tab-grid">
        <div className="tab-card">
          <p className="tab-description">
            Upload a single dashcam image. The model will detect vehicles, analyse weather, and check image quality.
          </p>

          <div className="tab-content">
            <div className="upload-section">
              <input
                accept="image/*"
                style={{ display: 'none' }}
                id="image-upload"
                type="file"
                onChange={handleFileSelect}
              />
              <label htmlFor="image-upload">
                <button
                  type="button"
                  className="btn-primary btn-full"
                >
                  {selectedFile ? `Change Image` : 'Select Image File'}
                </button>
              </label>
            </div>

            {selectedFile && (
              <div className="file-info">
                <div className="chip-group">
                  <span className="chip chip-success">Image Selected</span>
                  <span className="chip">{selectedFile.name}</span>
                </div>
                <button type="button" className="btn-primary btn-full">
                  Analyze Image
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="tab-card">
          <h3 className="tab-subtitle">Preview</h3>
          {preview ? (
            <img
              src={preview}
              alt="Preview"
              className="image-preview"
            />
          ) : (
            <div className="preview-placeholder">
              <p>No image selected</p>
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

export default ImageAnalysisTab;
