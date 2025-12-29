# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- **Individual Matplotlib Charts**: Separate charts for weather distribution, traffic congestion, vehicle count, human count, and image quality metrics
- **Frame Timestamps**: Charts now display time in seconds (when FPS available) or frame numbers on x-axis
- **Chart Scales**: All charts include proper axis labels, scales, and grids
- **Vehicle Statistics**: Added median, mean, min, max, and std dev for vehicle counts (matching human stats)
- **Quality Score**: Calculated from brightness, contrast, and dynamic range metrics (0-1 scale)
- **Weather Detection**: Improved weather classification with proper label mapping and image-based fallback
- **Progress Sync**: Progress steps now match backend step names instead of calculating from percentage
- **Real Chart Data**: Charts use actual analysis data from backend instead of hardcoded values

### Changed
- **BREAKING**: Removed Material-UI (MUI) dependency due to React 19 compatibility issues
- Downgraded React from 19.2.0 to 18.2.0 for stability and compatibility
- Rewrote all tab components (VideoAnalysisTab, ImageAnalysisTab, RoadLearningTab) using plain React/CSS
- Updated styling to match Tesla design system (black, white, grey color scheme only)
- Removed MUI theme configuration
- **GPU/CPU Detection**: Now uses client-side browser APIs (WebGL/WebGPU) instead of backend queries
- **Analysis Metrics**: Replaced hardcoded values with dynamic calculations based on actual file properties

### Fixed
- Fixed login validation (email format, password min 8 chars, MFA 6 digits)
- Fixed password visibility toggle using SVG icons instead of MUI icons
- Fixed terminal hanging issues during npm install
- Fixed GPU detection to work independently of backend connection
- Fixed analysis results to use dynamic values instead of hardcoded numbers
- Fixed left alignment issues across all components
- Fixed loading spinner wobble by adding proper transform-origin
- Fixed weather detection returning wrong labels (e.g., "car mirror") - now properly maps to weather classes
- Fixed quality score calculation - now uses image quality metrics instead of detection confidence
- Fixed progress sync - steps now match backend step names for accurate progress tracking
- Fixed chart generation - charts now use real data from backend analysis instead of hardcoded values

### Added
- Created `Tabs.css` for shared tab component styles
- Added Tesla-inspired typography and spacing
- Added "Create Account" option at sign-in stage
- Added language selector (default: en-GB) in header and login page
- **Human Detection**: Added human count and per-frame statistics (median, mean, min, max, std dev)
- **Image Quality Metrics**: Added brightness (cd/m²), contrast (ratio), and dynamic range with SI units
- **Block Progress Bar**: Old-school block-style progress indicator (32 blocks, 3.125% each)
- **Charts**: Summary and statistics charts using HTML5 Canvas
- **Individual Matplotlib Charts**: Backend generates separate PNG charts with scales and timestamps
- **Client-side GPU Detection**: Automatic GPU/CPU detection using WebGL/WebGPU browser APIs
- **Clickable Images**: All images (summary, statistics, annotated, frames, charts) are now clickable to expand
- **Storage Information**: Display output directory paths with folder icon to open directories
- **Footer Component**: Added footer with "Made by John Cassidy | Connect API" and settings panel
- **Backend Integration**: Full integration with Python backend for real ML inference (DETR, ViT models)

### Removed
- Removed `@mui/material`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled` packages
- Removed `src/theme/teslaTheme.ts` file
- Removed backend dependency for GPU detection
- Removed base64 image data from metadata display
- Removed base64 image data from full metadata JSON (frames, images, chartImages, annotatedImage excluded)
- Removed email/password/passcode labels (using placeholders only)

## [Previous]

### Added
- Initial project setup with Vite + React + TypeScript
- Multi-step authentication flow (Email → Password → MFA)
- Video, Image, and Road Learning tabs
- Header with navigation and language selector
- Login page with Tesla-inspired design

