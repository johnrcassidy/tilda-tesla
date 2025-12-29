# tilda-tesla Backend

Python backend API server for video/image analysis with GPU acceleration.

## Setup

1. **Create virtual environment:**
   ```bash
   python -m venv venv
   ```

2. **Activate virtual environment:**
   ```bash
   # Windows
   venv\Scripts\activate
   
   # Linux/Mac
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Install PyTorch with CUDA (if you have a GPU):**
   ```bash
   # Check your CUDA version first: nvidia-smi
   # Then install appropriate PyTorch version
   pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
   # Replace cu118 with your CUDA version (cu121, cu118, cu117, etc.)
   ```

## Running

```bash
python app.py
```

The server will start on `http://localhost:7860`

## API Endpoints

- `GET /api/system-info` - Get GPU/CPU system information
- `POST /api/analyze-video` - Analyze video file
- `POST /api/analyze-image` - Analyze image file
- `POST /api/upload` - Upload file
- `GET /health` - Health check

## Development

The backend uses Flask with CORS enabled to allow requests from the React frontend.

