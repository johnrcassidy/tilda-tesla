# TILDA - Tesla Inferencer Lazy Dashcam Analyser

A modern React-based web application for analyzing Tesla dashcam footage with state-of-the-art machine learning models.

## 🚀 Features

- **Multi-step Authentication**: Secure login flow with email, password, and MFA
- **Video Analysis**: Upload and analyze Tesla dashcam videos with frame extraction
- **Image Analysis**: Single image analysis with object detection and annotation
- **Road Learning**: Help train Autopilot models
- **Real-time Progress**: Block-style progress tracking (old school, 3.14% per block)
- **Model Configuration**: Customize detection and weather models
- **Human Detection**: Detect and count humans in footage with per-frame statistics
- **Image Quality Metrics**: Brightness, contrast, and dynamic range with SI units (cd/m²)
- **Client-side GPU Detection**: Automatic GPU/CPU detection using WebGL/WebGPU
- **Charts & Visualisations**: 
  - Summary and statistics charts using HTML5 Canvas
  - Individual Matplotlib charts with scales and frame timestamps
  - Weather distribution, traffic congestion, vehicle/human counts over time, and image quality metrics
- **Real ML Analysis**: GPU-accelerated inference using Hugging Face Transformers (DETR, ViT)
- **Statistics**: Comprehensive per-frame statistics (median, mean, range, std dev) for vehicles and humans
- **GDPR/ICO Compliance**: Metadata preservation and processing time tracking

## 🏗️ Architecture

### Matrix-Type Layout Structure

```
App (Root)
├── AuthWrapper
│   ├── LoginPage (3-step flow: Email → Password → MFA)
│   └── MainApp (only renders when authenticated)
│       ├── Header (TILDA Logo + Language Selector)
│       ├── TabNavigation
│       └── ContentArea
│           ├── VideoAnalysisTab
│           ├── ImageAnalysisTab
│           └── RoadLearningTab
```

### Component Matrix

- **Auth Components**: Login flow, authentication state
- **Layout Components**: Header, Navigation, Content Grid
- **Tab Components**: Video, Image, Road Learning interfaces
- **Settings Components**: Model, Inference, Training configurations
- **Context**: Global state management
- **Hooks**: Custom React hooks for data fetching and state
- **Types**: TypeScript type definitions
- **Utils**: Helper functions and utilities

## 🛠️ Technology Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **State Management**: React Context API
- **Styling**: Plain CSS / Tesla Design System (black, white, grey only)
- **Backend**: Python API (part of `tilda-tesla`)
- **GPU Detection**: WebGL/WebGPU browser APIs
- **Charts**: HTML5 Canvas API + Matplotlib (backend)
- **ML Models**: Hugging Face Transformers (DETR for detection, ViT for weather)

## 📦 Installation

```bash
npm install
```

## 🚦 Development

### Start Backend

First, set up and start the backend:

```bash
# Install backend dependencies
npm run backend:install

# Start backend server
npm run backend
```

The backend will run on `http://localhost:7860`

### Start Frontend

In a separate terminal:

```bash
npm run dev
```

The frontend will run on `http://localhost:5173`

## 🏭 Build

```bash
npm run build
```

## 📝 License

AGPL-3.0

## 🔗 Related Repositories

- Backend: `tilda-tesla` (Python ML inference API)
