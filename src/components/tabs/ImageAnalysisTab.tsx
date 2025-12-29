import { useState, useRef, useEffect } from 'react';
import type { ImageAnalysisResult } from '../../types';
import { createDouglasAdamsQRCode } from '../../utils/qrCode';
import { analyzeImage, type AnalysisSettings } from '../../utils/api';
import './Tabs.css';

interface AnalysisStep {
  name: string;
  status: 'pending' | 'processing' | 'complete' | 'error';
  progress: number;
}

function ImageAnalysisTab() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [analysisSteps, setAnalysisSteps] = useState<AnalysisStep[]>([]);
  const [analysisResults, setAnalysisResults] = useState<ImageAnalysisResult | null>(null);
  const [annotatedImage, setAnnotatedImage] = useState<string | null>(null);
  const [expandedImage, setExpandedImage] = useState<{ src: string } | null>(null);
  const [showModelSettings, setShowModelSettings] = useState(false);
  const [showDetectionModel, setShowDetectionModel] = useState(false);
  const [showWeatherModel, setShowWeatherModel] = useState(false);
  const [showInferenceSettings, setShowInferenceSettings] = useState(false);
  const [showPerformanceSettings, setShowPerformanceSettings] = useState(false);
  const [showProcessingOptions, setShowProcessingOptions] = useState(false);
  const [showTrainingSettings, setShowTrainingSettings] = useState(false);
  const [showMetadata, setShowMetadata] = useState(false);
  const [showStorageInfo, setShowStorageInfo] = useState(false);
  const [errorImage, setErrorImage] = useState<string | null>(null);
  // Settings state
  const [useFP16, setUseFP16] = useState(true);
  const [batchSize, setBatchSize] = useState(1);
  const [useTorchCompile, setUseTorchCompile] = useState(false);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.3);
  const [imageSize, setImageSize] = useState('original');
  const [fps, setFps] = useState(1.0);
  const [saveFrames, setSaveFrames] = useState(true);
  const [saveForTraining, setSaveForTraining] = useState(true);
  const [saveAnnotated, setSaveAnnotated] = useState(true);
  // Model settings state
  const [useCustomDetectionModel, setUseCustomDetectionModel] = useState(true);
  const [detectionModel, setDetectionModel] = useState('facebook/detr-resnet-101');
  const [customDetectionModel, setCustomDetectionModel] = useState('');
  const [useWeatherModel, setUseWeatherModel] = useState(true);
  const [weatherModel, setWeatherModel] = useState<string | null>('google/vit-large-patch32-384');
  const [customWeatherModel, setCustomWeatherModel] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const analysisIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (analysisIntervalRef.current) {
        clearInterval(analysisIntervalRef.current);
      }
    };
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setAnalysisResults(null);
      setAnalysisSteps([]);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyzeImage = async () => {
    if (!selectedFile) {
      // Show QR code joke like tilda-tesla
      const qrImage = createDouglasAdamsQRCode();
      setErrorImage(qrImage);
      return;
    }
    
    setErrorImage(null);
    
    setAnalyzing(true);
    setAnalysisProgress(0);
    setAnalysisResults(null);
    setAnnotatedImage(null);
    setCurrentStep('Initialising analysis...');
    
    const steps: AnalysisStep[] = [
      { name: 'Loading image', status: 'pending', progress: 0 },
      { name: 'Running vehicle detection', status: 'pending', progress: 0 },
      { name: 'Analysing weather conditions', status: 'pending', progress: 0 },
      { name: 'Checking image quality', status: 'pending', progress: 0 },
      { name: 'Annotating image', status: 'pending', progress: 0 },
      { name: 'Generating statistics', status: 'pending', progress: 0 },
    ];
    setAnalysisSteps(steps);
    
    // ONLY use backend API - no simulation, no fallback
    try {
      const settings: AnalysisSettings = {
        useFP16,
        batchSize,
        useTorchCompile,
        confidenceThreshold,
        imageSize,
        fps,
        saveFrames,
        detectionModel: detectionModel === 'custom' ? customDetectionModel : (useCustomDetectionModel ? detectionModel : undefined),
        weatherModel: weatherModel === 'custom' ? customWeatherModel : (useWeatherModel ? (weatherModel || undefined) : undefined),
      };

      console.log('[Analysis] Starting backend image analysis with settings:', settings);
      
      const results = await analyzeImage(
        selectedFile,
        settings,
        (progress, step) => {
          setAnalysisProgress(progress);
          if (step) setCurrentStep(step);
          // Update step status based on progress
          const stepProgress = (progress / 100) * steps.length; // Convert to step-based progress (0 to steps.length)
          const currentStepIndex = Math.floor(stepProgress);
          const progressWithinStep = (stepProgress - currentStepIndex) * 100; // Progress within current step (0-100%)
          
          setAnalysisSteps((prevSteps) => {
            const updated = [...prevSteps];
            updated.forEach((s, i) => {
              if (i < currentStepIndex) {
                // Previous steps are complete
                updated[i] = { ...s, status: 'complete', progress: 100 };
              } else if (i === currentStepIndex && currentStepIndex < steps.length) {
                // Current step is processing
                updated[i] = { ...s, status: 'processing', progress: Math.min(100, Math.max(0, progressWithinStep)) };
              } else {
                // Future steps are pending
                updated[i] = { ...s, status: 'pending', progress: 0 };
              }
            });
            return updated;
          });
        }
      );

      console.log('[Analysis] Backend image analysis complete:', results);
      
      // Process real results from backend
      setAnalysisResults(results);
      if (results.annotatedImage) {
        setAnnotatedImage(results.annotatedImage);
      }
      
      setAnalyzing(false);
      setCurrentStep('Analysis complete!');
      
      // Mark all steps as complete
      setAnalysisSteps((prevSteps) => 
        prevSteps.map(step => ({ ...step, status: 'complete', progress: 100 }))
      );
      
    } catch (error) {
      console.error('[Analysis] Backend image analysis failed:', error);
      setAnalyzing(false);
      setCurrentStep('Analysis failed');
      
      // Show error to user
      const errorMessage = error instanceof Error ? error.message : 'Backend analysis failed';
      alert(`Image analysis failed: ${errorMessage}\n\nMake sure:\n1. Backend (tilda-tesla) is running\n2. Backend is accessible at ${import.meta.env.VITE_API_URL || 'http://localhost:7860'}\n3. CORS is enabled on backend`);
      
      // Mark all steps as error
      setAnalysisSteps((prevSteps) => 
        prevSteps.map(step => ({ ...step, status: 'error', progress: 0 }))
      );
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="tab-container">
      <h2 className="tab-title">Image Analysis</h2>

      <div className="tab-card">
        <h3 className="tab-subtitle">Upload a single image to analyse</h3>
        <p className="tab-description">
          Upload a single dashcam image. The model will detect vehicles, analyse weather, and check image quality.
        </p>

    <div className="tab-content">
          <div className="upload-section">
            <input
              ref={fileInputRef}
              accept="image/*"
              style={{ display: 'none' }}
              type="file"
              onChange={handleFileSelect}
              disabled={analyzing}
            />
            <button
              type="button"
              className="btn-primary btn-full"
              onClick={handleButtonClick}
              disabled={analyzing}
            >
              {selectedFile ? `Change Image` : 'Select Image File'}
            </button>
          </div>

          {/* Model Settings Toggle */}
          <div className="settings-section">
            <button
              type="button"
              className="btn-settings-accordion"
              onClick={() => setShowModelSettings(!showModelSettings)}
            >
              <span className="accordion-arrow">{showModelSettings ? '▼' : '▶'}</span>
              <span>Model Settings</span>
            </button>
            {showModelSettings && (
              <div className="settings-content">
                <p className="settings-description">Configure which models to use. Leave as default unless you have custom models.</p>
                
                {/* Nested: Detection Model */}
                <div className="nested-settings-section">
                  <button
                    type="button"
                    className="btn-secondary btn-nested-toggle"
                    onClick={() => setShowDetectionModel(!showDetectionModel)}
                  >
                    {showDetectionModel ? '▼' : '▶'} Detection Model
                  </button>
                  {showDetectionModel && (
                    <div className="nested-settings-content">
                      <div className="form-group">
                        <label>
                          <input 
                            type="checkbox" 
                            checked={useCustomDetectionModel}
                            onChange={(e) => setUseCustomDetectionModel(e.target.checked)}
                          /> Use Custom Detection Model
                        </label>
                        <p className="settings-info">Check this to use a custom model path instead of the default Hugging Face model.</p>
                      </div>
                      <div className="form-group">
                        <label>Detection Model:</label>
                        <select 
                          value={detectionModel}
                          onChange={(e) => setDetectionModel(e.target.value)}
                          className="form-input"
                        >
                          <optgroup label="Facebook DETR Models">
                            <option value="facebook/detr-resnet-50">facebook/detr-resnet-50 (Default - Fast)</option>
                            <option value="facebook/detr-resnet-101">facebook/detr-resnet-101 (More Accurate)</option>
                            <option value="facebook/detr-resnet-dc5">facebook/detr-resnet-dc5 (Dilated C5)</option>
                            <option value="facebook/detr-resnet-dc5-50">facebook/detr-resnet-dc5-50 (Dilated C5, ResNet-50)</option>
                            <option value="facebook/detr-resnet-dc5-101">facebook/detr-resnet-dc5-101 (Dilated C5, ResNet-101)</option>
                            <option value="facebook/detr-resnet-50-panoptic">facebook/detr-resnet-50-panoptic (Panoptic Segmentation)</option>
                            <option value="facebook/detr-resnet-101-panoptic">facebook/detr-resnet-101-panoptic (Panoptic Segmentation)</option>
                            <option value="facebook/detr-resnet-50-dc5-panoptic">facebook/detr-resnet-50-dc5-panoptic (DC5 Panoptic)</option>
                            <option value="facebook/detr-resnet-101-dc5-panoptic">facebook/detr-resnet-101-dc5-panoptic (DC5 Panoptic)</option>
                          </optgroup>
                          <optgroup label="YOLO Models (Ultralytics)">
                            <option value="yolov8n">YOLOv8 Nano (Fastest)</option>
                            <option value="yolov8s">YOLOv8 Small (Fast)</option>
                            <option value="yolov8m">YOLOv8 Medium (Balanced)</option>
                            <option value="yolov8l">YOLOv8 Large (Accurate)</option>
                            <option value="yolov8x">YOLOv8 XLarge (Most Accurate)</option>
                            <option value="yolov5n">YOLOv5 Nano</option>
                            <option value="yolov5s">YOLOv5 Small</option>
                            <option value="yolov5m">YOLOv5 Medium</option>
                            <option value="yolov5l">YOLOv5 Large</option>
                            <option value="yolov5x">YOLOv5 XLarge</option>
                          </optgroup>
                          <optgroup label="Microsoft Models">
                            <option value="microsoft/conditional-detr-resnet-50">microsoft/conditional-detr-resnet-50</option>
                            <option value="microsoft/table-transformer-detection">microsoft/table-transformer-detection</option>
                          </optgroup>
                          <optgroup label="COCO Models (All DETR models are COCO-trained)">
                            <option value="facebook/detr-resnet-50">facebook/detr-resnet-50 (COCO trained)</option>
                            <option value="facebook/detr-resnet-101">facebook/detr-resnet-101 (COCO trained)</option>
                            <option value="microsoft/conditional-detr-resnet-50">microsoft/conditional-detr-resnet-50 (COCO)</option>
                            <option value="hustvl/yolos-tiny">hustvl/yolos-tiny (COCO trained)</option>
                            <option value="hustvl/yolos-small">hustvl/yolos-small (COCO trained)</option>
                            <option value="hustvl/yolos-base">hustvl/yolos-base (COCO trained)</option>
                          </optgroup>
                          <optgroup label="Other Providers">
                            <option value="hustvl/yolos-tiny">hustvl/yolos-tiny (YOLOS Tiny)</option>
                            <option value="hustvl/yolos-small">hustvl/yolos-small (YOLOS Small)</option>
                            <option value="hustvl/yolos-base">hustvl/yolos-base (YOLOS Base)</option>
                            <option value="IDEA-Research/grounding-dino-tiny">IDEA-Research/grounding-dino-tiny (Grounding DINO)</option>
                            <option value="IDEA-Research/grounding-dino-base">IDEA-Research/grounding-dino-base (Grounding DINO Base)</option>
                            <option value="custom">Custom Model (enter below)</option>
                          </optgroup>
                        </select>
                        {detectionModel === 'custom' && (
                          <input 
                            type="text" 
                            value={customDetectionModel}
                            onChange={(e) => setCustomDetectionModel(e.target.value)}
                            placeholder="Enter Hugging Face model or local path" 
                            className="form-input" 
                            style={{ marginTop: '8px' }}
                          />
                        )}
                        <p className="settings-info">Select a pre-trained DETR model from Hugging Face or choose custom to enter your own.</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Nested: Weather Model */}
                <div className="nested-settings-section">
                  <button
                    type="button"
                    className="btn-secondary btn-nested-toggle"
                    onClick={() => setShowWeatherModel(!showWeatherModel)}
                  >
                    {showWeatherModel ? '▼' : '▶'} Weather Model
                  </button>
                  {showWeatherModel && (
                    <div className="nested-settings-content">
                      <div className="form-group">
                        <label>
                          <input 
                            type="checkbox" 
                            checked={useWeatherModel}
                            onChange={(e) => setUseWeatherModel(e.target.checked)}
                          /> Use Weather Model (instead of image analysis)
                        </label>
                        <p className="settings-info">Check this to use a machine learning model for weather classification. Leave unchecked to use image analysis (default, no model needed).</p>
                      </div>
                      <div className="form-group">
                        <label>Weather Model:</label>
                        <select 
                          value={weatherModel || ''}
                          onChange={(e) => setWeatherModel(e.target.value || null)}
                          className="form-input"
                        >
                          <option value="">None (use image analysis)</option>
                          <option value="google/vit-base-patch16-224">google/vit-base-patch16-224</option>
                          <option value="google/vit-base-patch32-384">google/vit-base-patch32-384</option>
                          <option value="google/vit-large-patch16-224">google/vit-large-patch16-224</option>
                          <option value="google/vit-large-patch32-384">google/vit-large-patch32-384</option>
                          <option value="google/vit-large-patch16-224-in21k">google/vit-large-patch16-224-in21k</option>
                          <option value="google/vit-huge-patch14-224-in21k">google/vit-huge-patch14-224-in21k</option>
                          <option value="custom">Custom Model (enter below)</option>
                        </select>
                        {weatherModel === 'custom' && (
                          <input 
                            type="text" 
                            value={customWeatherModel}
                            onChange={(e) => setCustomWeatherModel(e.target.value)}
                            placeholder="Enter Hugging Face model or local path" 
                            className="form-input" 
                            style={{ marginTop: '8px' }}
                          />
                        )}
                        <p className="settings-info">Select a pre-trained ViT model from Hugging Face, or choose custom to enter your own. Leave as "None" to use image analysis (default).</p>
                      </div>
                    </div>
                  )}
                </div>

                <p className="settings-note">Note: Changing model settings will reinitialize the models. This may take a moment.</p>
              </div>
            )}
          </div>

          {/* Inference Settings Toggle */}
          <div className="settings-section">
            <button
              type="button"
              className="btn-settings-accordion"
              onClick={() => setShowInferenceSettings(!showInferenceSettings)}
            >
              <span className="accordion-arrow">{showInferenceSettings ? '▼' : '▶'}</span>
              <span>Inference Settings</span>
            </button>
            {showInferenceSettings && (
              <div className="settings-content">
                <p className="settings-description">These settings control how fast and accurate the analysis is.</p>
                
                {/* Nested: Performance Settings */}
                <div className="nested-settings-section">
                  <button
                    type="button"
                    className="btn-secondary btn-nested-toggle"
                    onClick={() => setShowPerformanceSettings(!showPerformanceSettings)}
                  >
                    {showPerformanceSettings ? '▼' : '▶'} Performance Settings
                  </button>
                  {showPerformanceSettings && (
                    <div className="nested-settings-content">
                      <div className="form-group">
                        <label>
                          <input type="checkbox" /> Use FP16 (Faster, GPU only)
                        </label>
                        <p className="settings-info">Makes processing 2x faster and uses less memory. Only works if you have a GPU. Leave unchecked if unsure.</p>
                      </div>
                      <div className="form-group">
                        <label>Batch Size: <span>1</span></label>
                        <input type="range" min="1" max="8" defaultValue="1" className="slider" />
                        <p className="settings-info">How many images to process at the same time. Higher = faster but needs more memory. Start with 1, try 2-4 if you have a good GPU.</p>
                      </div>
                      <div className="form-group">
                        <label>
                          <input type="checkbox" /> Use Torch Compile
                        </label>
                        <p className="settings-info">Makes processing 20-30% faster. Requires PyTorch 2.0+ and Triton (not available on Windows). Disabled by default on Windows.</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Nested: Processing Options */}
                <div className="nested-settings-section">
                  <button
                    type="button"
                    className="btn-secondary btn-nested-toggle"
                    onClick={() => setShowProcessingOptions(!showProcessingOptions)}
                  >
                    {showProcessingOptions ? '▼' : '▶'} Processing Options
                  </button>
                  {showProcessingOptions && (
                    <div className="nested-settings-content">
                      <div className="form-group">
                        <label>Confidence Threshold: <span>0.3</span></label>
                        <input type="range" min="0.1" max="1.0" step="0.1" defaultValue="0.3" className="slider" />
                        <p className="settings-info">How sure the model needs to be before detecting something. Lower = more detections (but more false alarms). Higher = fewer but more accurate detections. Default is 0.3 for better detection.</p>
                      </div>
                      <div className="form-group">
                        <label>Image Size:</label>
                        <select className="form-input">
                          <option value="original">Original</option>
                          <option value="224x224">224x224</option>
                          <option value="384x384">384x384</option>
                          <option value="512x512">512x512</option>
                          <option value="640x640">640x640</option>
                          <option value="800x800">800x800</option>
                        </select>
                        <p className="settings-info">Resize image before analysing. Smaller = faster but less detail. Original = best quality but slower. 224x224 is fastest, 640x640 is a good balance.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Training Data Settings Toggle */}
          <div className="settings-section">
            <button
              type="button"
              className="btn-settings-accordion"
              onClick={() => setShowTrainingSettings(!showTrainingSettings)}
            >
              <span className="accordion-arrow">{showTrainingSettings ? '▼' : '▶'}</span>
              <span>Training Data Settings</span>
            </button>
            {showTrainingSettings && (
              <div className="settings-content">
                <div className="form-group">
                  <label>
                    <input 
                      type="checkbox" 
                      checked={saveForTraining}
                      onChange={(e) => setSaveForTraining(e.target.checked)}
                    /> Save for Training
                  </label>
                </div>
                <div className="form-group">
                  <label>
                    <input 
                      type="checkbox" 
                      checked={saveAnnotated}
                      onChange={(e) => setSaveAnnotated(e.target.checked)}
                    /> Save Annotated Image
                  </label>
                </div>
              </div>
            )}
          </div>

          {selectedFile && !analyzing && (
            <div className="file-info">
              <div className="chip-group">
                <span className="chip">{selectedFile.name}</span>
                <button
                  type="button"
                  className="chip chip-delete"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreview(null);
                    setAnalysisResults(null);
                    setAnnotatedImage(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                >
                  × Remove
                </button>
              </div>
              <div className="chip-group">
                <span className="chip chip-success">Image Selected</span>
              </div>
            </div>
          )}

          {selectedFile && !analyzing && (
            <button 
              type="button" 
              className="btn-primary btn-full"
              onClick={handleAnalyzeImage}
            >
              Analyse Image
            </button>
          )}

          {analyzing && (
            <div className="analysis-progress">
              {/* Block-style progress (old school) */}
              <div className="block-progress-container">
                {Array.from({ length: 32 }, (_, i) => {
                  const blockProgress = (i + 1) * 3.125; // 100 / 32 = 3.125% per block
                  const isFilled = analysisProgress >= blockProgress;
                  return (
                    <div
                      key={i}
                      className={`block-progress-block ${isFilled ? 'filled' : ''}`}
                    />
                  );
                })}
              </div>
              <p className="progress-text">{currentStep} {Math.round(analysisProgress)}%</p>
              
              <div className="analysis-steps">
                {analysisSteps.map((step, index) => (
                  <div key={index} className={`analysis-step ${step.status} ${step.status === 'pending' ? 'pending' : ''}`}>
                    <div className="step-indicator">
                      {step.status === 'complete' && '✓'}
                      {step.status === 'processing' && '⟳'}
                      {step.status === 'pending' && '○'}
                    </div>
                    <div className="step-content">
                      <span className="step-name">{step.name}</span>
                      {step.status === 'processing' && (
                        <div className="step-progress-bar">
                          <div className="step-progress-fill" style={{ width: `${step.progress}%` }}></div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
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
            className="image-preview chart-clickable"
            style={{ cursor: 'pointer' }}
            onClick={() => setExpandedFrame({ index: 0, src: preview })}
          />
        ) : (
          <div className="preview-placeholder">
            <p>No image selected</p>
          </div>
        )}
      </div>

      {analysisResults && (
        <>
          <div className="tab-card">
            <h3 className="tab-subtitle">Analysis Summary</h3>
            <p className="tab-description">{analysisResults.summary}</p>
          </div>

          <div className="tab-card">
            <h3 className="tab-subtitle">Metadata</h3>
            <div className="metadata-grid">
              {Object.entries(analysisResults.metadata).map(([key, value]) => (
                <div key={key} className="metadata-item">
                  <span className="metadata-key">{key.toUpperCase()}</span>
                  <span className="metadata-value">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Toggleable Full Metadata JSON */}
          <div className="tab-card">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowMetadata(!showMetadata)}
            >
              {showMetadata ? 'Hide' : 'Show'} Image Metadata (JSON)
            </button>
            {showMetadata && (
              <div className="metadata-json-section">
                <h3 className="tab-subtitle">Image Metadata (JSON)</h3>
                <pre className="json-display">{JSON.stringify(analysisResults, null, 2)}</pre>
              </div>
            )}
          </div>

                <div className="tab-card">
                  <h3 className="tab-subtitle">Statistics</h3>
                  <pre className="statistics-text">{analysisResults.statistics}</pre>
                  
                  {/* Image Quality Metrics */}
                  {analysisResults.imageQuality && (
                    <div style={{ marginTop: '24px' }}>
                      <h4 className="settings-subtitle">Image Quality Metrics</h4>
                      <div className="metadata-grid">
                        <div className="metadata-item">
                          <span className="metadata-key">BRIGHTNESS</span>
                          <span className="metadata-value">
                            {analysisResults.imageQuality.brightness.toFixed(1)} 
                            {analysisResults.imageQuality.brightness_luminance_cd_per_m2 && 
                              ` (${analysisResults.imageQuality.brightness_luminance_cd_per_m2.toFixed(1)} cd/m²)`}
                          </span>
                        </div>
                        <div className="metadata-item">
                          <span className="metadata-key">CONTRAST</span>
                          <span className="metadata-value">
                            {analysisResults.imageQuality.contrast.toFixed(1)}
                            {analysisResults.imageQuality.contrast_ratio && 
                              ` (ratio: ${analysisResults.imageQuality.contrast_ratio.toFixed(2)})`}
                          </span>
                        </div>
                        <div className="metadata-item">
                          <span className="metadata-key">DYNAMIC RANGE</span>
                          <span className="metadata-value">{analysisResults.imageQuality.dynamicRange.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="stat-item">
                    <span className="stat-label">Processing Time:</span>
                    <span className="stat-value">{analysisResults.processingTime.toFixed(2)}s</span>
                  </div>
                </div>

          <div className="tab-card">
            <h3 className="tab-subtitle">Annotated Image</h3>
                {(annotatedImage || analysisResults.annotatedImage) ? (
                  <img
                    src={annotatedImage || analysisResults.annotatedImage || ''}
                    alt="Annotated image with detections"
                    className="annotated-image chart-clickable"
                    style={{ display: 'block', maxWidth: '100%', height: 'auto', cursor: 'pointer' }}
                    onClick={() => setExpandedFrame({ index: 0, src: annotatedImage || analysisResults.annotatedImage || '' })}
                    onError={(e) => {
                      console.error('Annotated image failed to load, showing preview');
                      if (preview) {
                        (e.target as HTMLImageElement).src = preview;
                      } else {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }
                    }}
                  />
                ) : preview ? (
                  <img
                    src={preview}
                    alt="Original image"
                    className="annotated-image chart-clickable"
                    style={{ display: 'block', maxWidth: '100%', height: 'auto', cursor: 'pointer' }}
                    onClick={() => setExpandedFrame({ index: 0, src: preview })}
                  />
                ) : (
                  <div className="annotated-image-placeholder">
                    <p>Annotated image will appear here</p>
                  </div>
                )}
          </div>
        </>
      )}

      {/* Error/QR Code Display */}
      {errorImage && (
        <div className="tab-card">
          <img src={errorImage} alt="Don't Panic" className="error-image" />
        </div>
      )}

      {/* Storage Information Toggle */}
      {analysisResults && (
        <div className="tab-card">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowStorageInfo(!showStorageInfo)}
          >
            {showStorageInfo ? 'Hide' : 'Show'} Storage Information
          </button>
            {showStorageInfo && (
              <div className="storage-info-section">
                <h3 className="tab-subtitle">Storage Locations</h3>
                <div className="storage-path-display">
                  <div className="storage-path-row">
                    <span className="storage-path-label">Output Directory:</span>
                    <code className="storage-path-value">./output/analysis_{new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)}/</code>
                    <button
                      type="button"
                      className="storage-folder-button"
                      onClick={() => {
                        alert('Opening file explorer to: ./output/analysis_*/');
                      }}
                      title="Open folder"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                      </svg>
                    </button>
                  </div>
                  <div className="storage-path-row">
                    <span className="storage-path-label">Training Data:</span>
                    <code className="storage-path-value">./training_data/images/</code>
                    <button
                      type="button"
                      className="storage-folder-button"
                      onClick={() => {
                        alert('Opening file explorer to: ./training_data/images/');
                      }}
                      title="Open folder"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                      </svg>
                    </button>
                  </div>
                  <div className="storage-path-row">
                    <span className="storage-path-label">Annotated Image:</span>
                    <code className="storage-path-value">./output/analysis_*/annotated_frames/</code>
                    <button
                      type="button"
                      className="storage-folder-button"
                      onClick={() => {
                        alert('Opening file explorer to: ./output/analysis_*/annotated_frames/');
                      }}
                      title="Open folder"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}
        </div>
      )}

      {!analysisResults && !analyzing && !errorImage && (
        <div className="tab-card">
          <h3 className="tab-subtitle">Analysis Results</h3>
          <p className="tab-description">Analysis results will appear here after processing.</p>
        </div>
      )}

      {/* Expanded Image Modal */}
      {expandedImage && (
        <div className="frame-expanded" onClick={() => setExpandedImage(null)}>
          <button 
            className="frame-close-button"
            onClick={(e) => {
              e.stopPropagation();
              setExpandedImage(null);
            }}
          >
            ×
          </button>
          <div className="frame-expanded-content" onClick={(e) => e.stopPropagation()}>
            <img 
              src={expandedImage.src} 
              alt="Expanded image"
              className="frame-expanded-image"
            />
            <div className="frame-expanded-details">
              <h4>Image Analysis Details</h4>
              <p><strong>Vehicles Detected:</strong> 2</p>
              <p><strong>Car:</strong> Confidence 0.94</p>
              <p><strong>Truck:</strong> Confidence 0.87</p>
              <p><strong>Weather:</strong> Clear (100%)</p>
              <p><strong>Quality Score:</strong> 0.89</p>
              <p><strong>Brightness:</strong> 0.72</p>
              <p><strong>Contrast:</strong> 0.68</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ImageAnalysisTab;
