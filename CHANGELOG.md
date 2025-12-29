# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Changed
- **BREAKING**: Removed Material-UI (MUI) dependency due to React 19 compatibility issues
- Downgraded React from 19.2.0 to 18.2.0 for stability and compatibility
- Rewrote all tab components (VideoAnalysisTab, ImageAnalysisTab, RoadLearningTab) using plain React/CSS
- Updated styling to match Tesla design system (black, white, grey color scheme only)
- Removed MUI theme configuration

### Fixed
- Fixed login validation (email format, password min 8 chars, MFA 6 digits)
- Fixed password visibility toggle using SVG icons instead of MUI icons
- Fixed terminal hanging issues during npm install

### Added
- Created `Tabs.css` for shared tab component styles
- Added Tesla-inspired typography and spacing
- Added "Create Account" option at sign-in stage
- Added language selector (default: en-GB) in header and login page

### Removed
- Removed `@mui/material`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled` packages
- Removed `src/theme/teslaTheme.ts` file

## [Previous]

### Added
- Initial project setup with Vite + React + TypeScript
- Multi-step authentication flow (Email → Password → MFA)
- Video, Image, and Road Learning tabs
- Header with navigation and language selector
- Login page with Tesla-inspired design

