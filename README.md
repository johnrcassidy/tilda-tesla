# TILDA - Tesla Inferencer Lazy Dashcam Analyser

A modern React-based web application for analyzing Tesla dashcam footage with state-of-the-art machine learning models.

## 🚀 Features

- **Multi-step Authentication**: Secure login flow with email, password, and MFA
- **Video Analysis**: Upload and analyze Tesla dashcam videos
- **Image Analysis**: Single image analysis with object detection
- **Road Learning**: Help train Autopilot models
- **Real-time Progress**: Track analysis progress
- **Model Configuration**: Customize detection and weather models
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

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite
- **State Management**: React Context API
- **Styling**: CSS Modules / Tesla Design System
- **Backend**: Python/Gradio (separate repository)

## 📦 Installation

```bash
npm install
```

## 🚦 Development

```bash
npm run dev
```

## 🏭 Build

```bash
npm run build
```

## 📝 License

AGPL-3.0

## 🔗 Related Repositories

- Backend: `tesla-fish-local` (Python/Gradio ML inference)
