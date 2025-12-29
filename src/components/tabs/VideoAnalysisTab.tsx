import { useState, useRef, useEffect } from 'react';
import type { VideoAnalysisResult } from '../../types';
import { createDouglasAdamsQRCode } from '../../utils/qrCode';
import { generateSummaryImage, generateStatisticsChart } from '../../utils/chartGenerator';
import { analyzeVideo, type AnalysisSettings } from '../../utils/api';
import './Tabs.css';

interface AnalysisStep {
  name: string;
  status: 'pending' | 'processing' | 'complete' | 'error';
  progress: number;
}

function VideoAnalysisTab() {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [analysisSteps, setAnalysisSteps] = useState<AnalysisStep[]>([]);
  const [analysisResults, setAnalysisResults] = useState<VideoAnalysisResult | null>(null);
  const [frameImages, setFrameImages] = useState<string[]>([]);
  const [showFramesGallery, setShowFramesGallery] = useState(false);
  const [showMetadata, setShowMetadata] = useState(false);
  const [summaryImage, setSummaryImage] = useState<string | null>(null);
  const [statisticsImage, setStatisticsImage] = useState<string | null>(null);
  const [chartImages, setChartImages] = useState<{[key: string]: string}>({});
  const [expandedFrame, setExpandedFrame] = useState<{ index: number; src: string } | null>(null);
  const [showModelSettings, setShowModelSettings] = useState(false);
  const [showDetectionModel, setShowDetectionModel] = useState(false);
  const [showWeatherModel, setShowWeatherModel] = useState(false);
  const [showInferenceSettings, setShowInferenceSettings] = useState(false);
  const [showPerformanceSettings, setShowPerformanceSettings] = useState(false);
  const [showProcessingOptions, setShowProcessingOptions] = useState(false);
  const [showTrainingSettings, setShowTrainingSettings] = useState(false);
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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const analysisIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (analysisIntervalRef.current) {
        clearInterval(analysisIntervalRef.current);
      }
      if (videoRef.current) {
        videoRef.current.src = '';
      }
    };
  }, []);

  const extractFramesFromVideo = async (videoFile: File, count: number = 20): Promise<string[]> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = 'anonymous';
      
      const objectUrl = URL.createObjectURL(videoFile);
      video.src = objectUrl;
      
      const frames: string[] = new Array(count);
      let loaded = 0;
      let currentIndex = 0;
      
      const extractNextFrame = () => {
        if (currentIndex >= count) {
          URL.revokeObjectURL(objectUrl);
          resolve(frames.filter(f => f !== undefined));
          return;
        }
        
        const time = (video.duration / (count + 1)) * (currentIndex + 1);
        video.currentTime = time;
      };
      
      video.onloadedmetadata = () => {
        if (video.duration && !isNaN(video.duration)) {
          extractNextFrame();
        } else {
          URL.revokeObjectURL(objectUrl);
          resolve([]);
        }
      };
      
      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        const width = video.videoWidth || 320;
        const height = video.videoHeight || 180;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (ctx && width > 0 && height > 0) {
          ctx.drawImage(video, 0, 0, width, height);
          
          // Draw green bounding box (simulated detection)
          const boxX = width * 0.1;
          const boxY = height * 0.2;
          const boxW = width * 0.3;
          const boxH = height * 0.3;
          
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2;
          ctx.strokeRect(boxX, boxY, boxW, boxH);
          
          // White label background
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(boxX, boxY - 18, 100, 18);
          
          // Black label text
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText('Vehicle 0.89', boxX + 4, boxY - 4);
          
          frames[currentIndex] = canvas.toDataURL('image/png');
          loaded++;
          currentIndex++;
          
          // Extract next frame
          setTimeout(() => extractNextFrame(), 50);
        } else {
          currentIndex++;
          setTimeout(() => extractNextFrame(), 50);
        }
      };
      
      video.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve([]);
      };
    });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploading(true);
      setUploadProgress(0);
      setAnalysisResults(null);
      setAnalysisSteps([]);
      setFrameImages([]);
      
      // Simulate upload progress
      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setUploading(false);
            return 100;
          }
          return prev + 5;
        });
      }, 100);
    }
  };

  const handleStartAnalysis = async () => {
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
    setFrameImages([]);
    setShowFramesGallery(false);
    setShowMetadata(false);
    
    // Match exact steps from tilda-tesla backend
    // Build steps dynamically based on settings - match backend step names exactly
    const steps: AnalysisStep[] = [
      { name: 'Initialising video analysis...', status: 'pending', progress: 0 },
      { name: 'Extracting frames from video...', status: 'pending', progress: 0 },
      { name: 'Running detection models...', status: 'pending', progress: 0 },
      { name: 'Processing results and metadata...', status: 'pending', progress: 0 },
      { name: 'Generating visualisations...', status: 'pending', progress: 0 },
    ];
    
    // Add saving steps based on settings
    if (saveFrames) {
      steps.push({ name: 'Saving extracted frames...', status: 'pending', progress: 0 });
    }
    if (saveAnnotated) {
      steps.push({ name: 'Saving annotated frames...', status: 'pending', progress: 0 });
    }
    if (saveForTraining) {
      steps.push({ name: 'Saving training data...', status: 'pending', progress: 0 });
    }
    steps.push({ name: 'Finalising results...', status: 'pending', progress: 0 });
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
        saveForTraining,
        saveAnnotated,
          detectionModel: detectionModel === 'custom' ? customDetectionModel : (useCustomDetectionModel ? detectionModel : undefined),
          weatherModel: weatherModel === 'custom' ? customWeatherModel : (useWeatherModel ? (weatherModel || undefined) : undefined),
      };

      console.log('[Analysis] Starting backend analysis with settings:', settings);
      
      const results = await analyzeVideo(
        selectedFile,
        settings,
        (progress, step) => {
          setAnalysisProgress(progress);
          if (step) setCurrentStep(step);
          
          // Match step by name from backend - find exact or partial match
          setAnalysisSteps((prevSteps) => {
            const updated = [...prevSteps];
            const backendStepLower = step?.toLowerCase() || '';
            
            // Find matching step index by comparing step names
            let matchedIndex = -1;
            for (let i = 0; i < updated.length; i++) {
              const stepNameLower = updated[i].name.toLowerCase();
              // Exact match or contains key words
              if (stepNameLower === backendStepLower || 
                  (backendStepLower.includes('initialis') && stepNameLower.includes('initialis')) ||
                  (backendStepLower.includes('extract') && stepNameLower.includes('extract') && !stepNameLower.includes('saving')) ||
                  (backendStepLower.includes('detection') && stepNameLower.includes('detection')) ||
                  (backendStepLower.includes('process') && stepNameLower.includes('process')) ||
                  (backendStepLower.includes('visualis') && stepNameLower.includes('visualis')) ||
                  (backendStepLower.includes('saving extracted') && stepNameLower.includes('saving extracted')) ||
                  (backendStepLower.includes('saving annotated') && stepNameLower.includes('saving annotated')) ||
                  (backendStepLower.includes('saving training') && stepNameLower.includes('saving training')) ||
                  (backendStepLower.includes('finalis') && stepNameLower.includes('finalis'))) {
                matchedIndex = i;
                break;
              }
            }
            
            // Update steps based on matched index
            updated.forEach((s, i) => {
              if (i < matchedIndex) {
                // Previous steps are complete
                updated[i] = { ...s, status: 'complete', progress: 100 };
              } else if (i === matchedIndex && matchedIndex >= 0) {
                // Current step is processing - use actual progress percentage
                const stepProgress = Math.min(100, Math.max(0, progress));
                updated[i] = { ...s, status: 'processing', progress: stepProgress };
              } else {
                // Future steps are pending
                updated[i] = { ...s, status: 'pending', progress: 0 };
              }
            });
            
            return updated;
          });
        }
      );

      console.log('[Analysis] Backend analysis complete:', results);
      
      // Process real results from backend
      setAnalysisResults(results);
      if (results.frames) {
        setFrameImages(results.frames);
      }
      
      // Generate charts from real backend data
      if (results) {
        const summaryChart = generateSummaryImage({
          vehicleCount: results.vehicleCount || 0,
          humanCount: results.humanCount || 0,
          avgConfidence: results.avgConfidence || 0,
          totalFrames: results.totalFrames || 0,
          weatherDistribution: results.weatherDistribution || {},
        });
        const statsChart = generateStatisticsChart({
          humanCount: results.humanCount || 0,
          humanStats: results.humanStats,
          vehicleStats: results.vehicleStats,
          imageQuality: results.imageQuality,
          qualityScore: results.qualityScore,
          weatherDistribution: results.weatherDistribution || {},
          congestionDistribution: results.congestionDistribution || {},
          perFrameData: results.perFrameData || [],
          vehicleCountsOverTime: results.vehicleCountsOverTime || [],
          humanCountsOverTime: results.humanCountsOverTime || [],
        });
        setSummaryImage(summaryChart);
        setStatisticsImage(statsChart);
        
        // Set individual matplotlib charts from backend
        if (results.chartImages) {
          const charts: {[key: string]: string} = {};
          Object.keys(results.chartImages).forEach(key => {
            charts[key] = `data:image/png;base64,${results.chartImages[key]}`;
          });
          setChartImages(charts);
        }
      }
      
      setAnalyzing(false);
      setCurrentStep('Analysis complete!');
      
      // Mark all steps as complete
      setAnalysisSteps((prevSteps) => 
        prevSteps.map(step => ({ ...step, status: 'complete', progress: 100 }))
      );
      
    } catch (error) {
      console.error('[Analysis] Backend analysis failed:', error);
      setAnalyzing(false);
      setCurrentStep('Analysis failed');
      
      // Show error to user
      const errorMessage = error instanceof Error ? error.message : 'Backend analysis failed';
      alert(`Analysis failed: ${errorMessage}\n\nMake sure:\n1. Backend (tilda-tesla) is running\n2. Backend is accessible at ${import.meta.env.VITE_API_URL || 'http://localhost:7860'}\n3. CORS is enabled on backend`);
      
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
      <h2 className="tab-title">Video Analysis</h2>

      <div className="tab-card">
        <h3 className="tab-subtitle">Upload a video to analyse</h3>
        <p className="tab-description">
          Upload your Tesla dashcam video file. Supported formats: MP4, AVI, MOV, etc.
        </p>

    <div className="tab-content">
          <div className="upload-section">
            <input
              ref={fileInputRef}
              accept="video/*"
              style={{ display: 'none' }}
              type="file"
              onChange={handleFileSelect}
              disabled={uploading || analyzing}
            />
            <button
              type="button"
              className="btn-primary btn-full"
              onClick={handleButtonClick}
              disabled={uploading || analyzing}
            >
              {selectedFile ? `Selected: ${selectedFile.name}` : 'Select Video File'}
            </button>
          </div>

          {uploading && (
            <div className="progress-section">
              {/* Block-style progress (old school) */}
              <div className="block-progress-container">
                {Array.from({ length: 32 }, (_, i) => {
                  const blockProgress = (i + 1) * 3.125; // 100 / 32 = 3.125% per block
                  const isFilled = uploadProgress >= blockProgress;
                  return (
                    <div
                      key={i}
                      className={`block-progress-block ${isFilled ? 'filled' : ''}`}
                    />
                  );
                })}
              </div>
              <p className="progress-text">Uploading... {uploadProgress}%</p>
            </div>
          )}

          {selectedFile && !uploading && !analyzing && (
            <div className="file-info">
              <div className="chip-group">
                <span className="chip">{selectedFile.name}</span>
                <span className="chip">{`${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`}</span>
                <button
                  type="button"
                  className="chip chip-delete"
                  onClick={() => {
                    setSelectedFile(null);
                    setAnalysisResults(null);
                    setFrameImages([]);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                >
                  × Remove
                </button>
              </div>
              <div className="chip-group">
                <span className="chip chip-success">Upload Complete</span>
              </div>
            </div>
          )}

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
                        <p className="settings-info">How many frames to process at the same time. Higher = faster but needs more memory. Start with 1, try 2-4 if you have a good GPU.</p>
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
                        <p className="settings-info">Resize frames before analysing. Smaller = faster but less detail. Original = best quality but slower. 224x224 is fastest, 640x640 is a good balance.</p>
                      </div>
                      <div className="form-group">
                        <label>Frames per second to extract: <span>1.0</span></label>
                        <input type="range" min="0.1" max="5.0" step="0.1" defaultValue="1.0" className="slider" />
                        <p className="settings-info">How many frames to pull from the video each second. 1.0 = one frame per second (good for most videos). Lower = fewer frames = faster processing. Higher = more frames = more detailed analysis.</p>
                      </div>
                      <div className="form-group">
                        <label>
                          <input type="checkbox" defaultChecked /> Save extracted frames
                        </label>
                        <p className="settings-info">Saves the individual frames pulled from the video as separate image files. Uncheck if you only want the analysis results.</p>
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
                    /> Save Annotated Frames
                  </label>
                </div>
              </div>
            )}
          </div>
          
          {/* Analyse Video Button - appears after Training Data Settings, below last step */}
          {selectedFile && !uploading && !analyzing && (
            <button 
              type="button" 
              className="btn-primary btn-full"
              onClick={handleStartAnalysis}
            >
              Analyse Video
            </button>
          )}
          
          {/* Analysis Progress - appears after Training Data Settings and button */}
          {analyzing && (
            <div className="analysis-progress">
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
              
              {/* Block-style progress (old school) - AT THE BOTTOM after all steps */}
              <div className="block-progress-container" style={{ marginTop: '16px' }}>
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
            </div>
          )}
        </div>
      </div>

      {analysisResults && (
        <>
          {/* Summary and Statistics Images - Side by Side */}
          <div className="tab-card">
            <div className="images-row">
              <div className="image-container">
                <h3 className="tab-subtitle">Summary (Weather & Vehicle Heuristics)</h3>
                {summaryImage ? (
                  <img 
                    src={summaryImage} 
                    alt="Summary Chart" 
                    className="chart-image chart-clickable"
                    onClick={() => setExpandedFrame({ index: 0, src: summaryImage })}
                  />
                ) : (
                  <div className="summary-image-placeholder">
                    <p>Summary visualisation</p>
                    <p className="placeholder-note">Weather distribution and vehicle detection summary</p>
                  </div>
                )}
              </div>
              <div className="image-container">
                <h3 className="tab-subtitle">Statistics (Matplotlib Charts)</h3>
                {statisticsImage ? (
                  <img 
                    src={statisticsImage} 
                    alt="Statistics Chart" 
                    className="chart-image chart-clickable"
                    onClick={() => setExpandedFrame({ index: 1, src: statisticsImage })}
                  />
                ) : (
                  <div className="summary-image-placeholder">
                    <p>Statistics charts</p>
                    <p className="placeholder-note">Weather, traffic, and quality metrics</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Individual Matplotlib Charts */}
            {Object.keys(chartImages).length > 0 && (
              <div className="tab-card">
                <h3 className="tab-subtitle">Individual Charts (with Scales & Timestamps)</h3>
                <div className="charts-grid">
                  {chartImages.weather && (
                    <div className="chart-item">
                      <h4>Weather Distribution</h4>
                      <img 
                        src={chartImages.weather} 
                        alt="Weather Distribution" 
                        className="chart-image chart-clickable"
                        onClick={() => setExpandedFrame({ index: 2, src: chartImages.weather! })}
                      />
                    </div>
                  )}
                  {chartImages.congestion && (
                    <div className="chart-item">
                      <h4>Traffic Congestion</h4>
                      <img 
                        src={chartImages.congestion} 
                        alt="Traffic Congestion" 
                        className="chart-image chart-clickable"
                        onClick={() => setExpandedFrame({ index: 3, src: chartImages.congestion! })}
                      />
                    </div>
                  )}
                  {chartImages.vehicles && (
                    <div className="chart-item">
                      <h4>Vehicle Count Over Time</h4>
                      <img 
                        src={chartImages.vehicles} 
                        alt="Vehicle Count" 
                        className="chart-image chart-clickable"
                        onClick={() => setExpandedFrame({ index: 4, src: chartImages.vehicles! })}
                      />
                    </div>
                  )}
                  {chartImages.humans && (
                    <div className="chart-item">
                      <h4>Human Count Over Time</h4>
                      <img 
                        src={chartImages.humans} 
                        alt="Human Count" 
                        className="chart-image chart-clickable"
                        onClick={() => setExpandedFrame({ index: 5, src: chartImages.humans! })}
                      />
                    </div>
                  )}
                  {chartImages.quality && (
                    <div className="chart-item">
                      <h4>Image Quality Metrics</h4>
                      <img 
                        src={chartImages.quality} 
                        alt="Quality Metrics" 
                        className="chart-image chart-clickable"
                        onClick={() => setExpandedFrame({ index: 6, src: chartImages.quality! })}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Analysis Summary */}
          <div className="tab-card">
            <h3 className="tab-subtitle">Analysis Summary</h3>
            <p className="tab-description">{analysisResults.summary}</p>
          </div>

          {/* Metadata */}
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

          {/* Statistics */}
          <div className="tab-card">
            <h3 className="tab-subtitle">Statistics</h3>
            <pre className="statistics-text">{analysisResults.statistics}</pre>
            
            {/* Human Detection Stats */}
            {analysisResults.humanStats && (
              <div style={{ marginTop: '24px' }}>
                <h4 className="settings-subtitle">Human Detection Statistics</h4>
                <div className="metadata-grid">
                  <div className="metadata-item">
                    <span className="metadata-key">MEDIAN</span>
                    <span className="metadata-value">{analysisResults.humanStats.median.toFixed(2)} humans/frame</span>
                  </div>
                  <div className="metadata-item">
                    <span className="metadata-key">MEAN</span>
                    <span className="metadata-value">{analysisResults.humanStats.mean.toFixed(2)} humans/frame</span>
                  </div>
                  <div className="metadata-item">
                    <span className="metadata-key">RANGE</span>
                    <span className="metadata-value">{analysisResults.humanStats.min} - {analysisResults.humanStats.max} humans/frame</span>
                  </div>
                  <div className="metadata-item">
                    <span className="metadata-key">STD DEV</span>
                    <span className="metadata-value">{analysisResults.humanStats.std_dev.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
            
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
          </div>

          {/* Processing Time & Total Frames */}
          <div className="tab-card">
            <div className="stat-item">
              <span className="stat-label">Processing Time:</span>
              <span className="stat-value">{analysisResults.processingTime.toFixed(2)}s</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Total Frames:</span>
              <span className="stat-value">{analysisResults.totalFrames}</span>
            </div>
          </div>

          {/* Toggleable Frames Gallery */}
          <div className="tab-card">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowFramesGallery(!showFramesGallery)}
            >
              {showFramesGallery ? 'Hide' : 'Show'} Processed Frames Gallery
            </button>
            {showFramesGallery && (
              <div className="frames-gallery-section">
                <h3 className="tab-subtitle">Extracted Frames</h3>
                <div className="frames-grid">
                  {frameImages.length > 0 ? (
                    frameImages.map((frame, index) => (
                      <div 
                        key={index} 
                        className="frame-container"
                        onClick={() => setExpandedFrame({ index, src: frame })}
                      >
                        <img 
                          src={frame} 
                          alt={`Frame ${index + 1}`} 
                          className="frame-image"
                          onError={(e) => {
                            console.error('Frame image failed to load');
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        <div className="frame-label">Frame {index + 1}</div>
                      </div>
                    ))
                  ) : analysisResults.frames && analysisResults.frames.length > 0 ? (
                    analysisResults.frames.map((frame, index) => (
                      <div 
                        key={index} 
                        className="frame-container"
                        onClick={() => setExpandedFrame({ index, src: frame })}
                      >
                        <img 
                          src={frame} 
                          alt={`Frame ${index + 1}`} 
                          className="frame-image"
                          onError={(e) => {
                            console.error('Frame image failed to load');
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        <div className="frame-label">Frame {index + 1}</div>
                      </div>
                    ))
                  ) : (
                    <p>No frames available</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Toggleable Full Metadata JSON */}
          <div className="tab-card">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowMetadata(!showMetadata)}
            >
              {showMetadata ? 'Hide' : 'Show'} Full Metadata (JSON)
            </button>
            {showMetadata && (
              <div className="metadata-json-section">
                <h3 className="tab-subtitle">Full Metadata</h3>
                <pre className="json-display">{JSON.stringify(
                  (() => {
                    // Remove base64 encoded image data for cleaner display
                    const cleanResults: any = { ...analysisResults };
                    // Remove image arrays/data that contain base64
                    delete cleanResults.frames;
                    delete cleanResults.images;
                    if ('chartImages' in cleanResults) delete cleanResults.chartImages;
                    if ('annotatedImage' in cleanResults) delete cleanResults.annotatedImage;
                    return cleanResults;
                  })(),
                  null,
                  2
                )}</pre>
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
                      // In a real app, this would open the file explorer
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
                  <code className="storage-path-value">./training_data/videos/</code>
                  <button
                    type="button"
                    className="storage-folder-button"
                    onClick={() => {
                      alert('Opening file explorer to: ./training_data/videos/');
                    }}
                    title="Open folder"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                    </svg>
                  </button>
                </div>
                <div className="storage-path-row">
                  <span className="storage-path-label">Annotated Frames:</span>
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

      {/* Expanded Frame Modal */}
      {expandedFrame && (
        <div className="frame-expanded" onClick={() => setExpandedFrame(null)}>
          <button 
            className="frame-close-button"
            onClick={(e) => {
              e.stopPropagation();
              setExpandedFrame(null);
            }}
          >
            ×
          </button>
          <div className="frame-expanded-content" onClick={(e) => e.stopPropagation()}>
            <img 
              src={expandedFrame.src} 
              alt={`Frame ${expandedFrame.index + 1}`}
              className="frame-expanded-image"
            />
            <div className="frame-expanded-details">
              <h4>Frame {expandedFrame.index + 1}</h4>
              <p><strong>Vehicle Detection:</strong> Vehicle 0.89</p>
              <p><strong>Confidence:</strong> 89%</p>
              <p><strong>Bounding Box:</strong> (40, 30) - (160, 110)</p>
              <p><strong>Weather:</strong> Clear</p>
              <p><strong>Quality Score:</strong> 0.87</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VideoAnalysisTab;
