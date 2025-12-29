# Backend Integration Guide

## Overview

The frontend connects to the `tilda-tesla` backend for real GPU/CUDA-accelerated analysis. The backend must be running for analysis to work.

## Setup

### 1. Backend Requirements

The backend (`tilda-tesla`) should expose the following API endpoints:

- `GET /api/system-info` - Returns GPU/CPU capabilities
- `POST /api/upload` - Uploads files
- `POST /api/analyze-video` - Analyzes video files
- `POST /api/analyze-image` - Analyzes image files

### 2. Environment Configuration

Create a `.env` file in the project root:

```env
VITE_API_URL=http://localhost:7860
```

Or set it when running:

```bash
VITE_API_URL=http://localhost:7860 npm run dev
```

### 3. Backend API Format

#### System Info Response
```json
{
  "hasGPU": true,
  "gpuName": "NVIDIA GeForce RTX 3090",
  "cudaAvailable": true,
  "device": "cuda",
  "torchVersion": "2.1.0"
}
```

#### Analysis Settings
```json
{
  "useFP16": false,
  "batchSize": 1,
  "useTorchCompile": false,
  "confidenceThreshold": 0.3,
  "imageSize": "original",
  "fps": 1.0,
  "saveFrames": true,
  "saveForTraining": false,
  "saveAnnotated": true,
  "detectionModel": "facebook/detr-resnet-50",
  "weatherModel": ""
}
```

#### Analysis Response
Should match the `VideoAnalysisResult` or `ImageAnalysisResult` types defined in `src/types/index.ts`.

## Features

### GPU/CPU Detection

The frontend automatically detects:
- GPU availability
- CUDA support
- Device type (cuda/cpu)
- PyTorch version

This is displayed in the SystemInfoDisplay component at the top of each analysis tab.

### Error Handling

If the backend is not available:
1. System info check fails gracefully
2. Analysis shows an error message
3. User must ensure backend is running before analysis

### Settings Integration

All performance settings are now connected:
- **Use FP16**: Enables half-precision (GPU only)
- **Batch Size**: Number of frames/images processed simultaneously
- **Use Torch Compile**: Enables PyTorch 2.0+ compilation (faster)
- **Confidence Threshold**: Detection confidence level
- **Image Size**: Resize before processing
- **FPS**: Frames per second to extract from video

## Testing

1. Start the backend (`tilda-tesla`):
   ```bash
   cd g:\repos\tilda-tesla
   python app.py  # or however you run it
   ```

2. Start the frontend:
   ```bash
   npm run dev
   ```

3. Check the SystemInfoDisplay - it should show GPU status if available

4. Upload a video/image - it should use the real backend for analysis

## Troubleshooting

### Backend Not Detected

- Check that `VITE_API_URL` is correct
- Verify backend is running on the specified port
- Check browser console for CORS errors
- Backend should allow CORS from frontend origin

### GPU Not Detected

- Ensure CUDA is properly installed
- Check PyTorch CUDA installation: `python -c "import torch; print(torch.cuda.is_available())"`
- Backend should detect GPU automatically
- **Quick diagnostic:** Run `python check_gpu_backend.py` in your backend environment
- **Common fix:** Reinstall PyTorch with CUDA support:
  ```bash
  pip uninstall torch torchvision torchaudio
  pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
  ```
  (Replace `cu118` with your CUDA version - check with `nvidia-smi`)

### Settings Not Applied

- Settings are passed to backend in the `settings` JSON field
- Backend must read and apply these settings
- Check backend logs to verify settings are received

