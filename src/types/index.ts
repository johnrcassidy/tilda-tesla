// Authentication Types
export interface AuthState {
  isAuthenticated: boolean;
  email: string | null;
  loginStep: 'email' | 'password' | 'mfa';
}

export interface LoginCredentials {
  email: string;
  password: string;
  mfaCode: string;
}

// Analysis Types
export interface AnalysisResult {
  summary: string;
  metadata: Record<string, any>;
  images: string[];
  statistics: string;
  processingTime: number;
}

export interface VideoAnalysisResult extends AnalysisResult {
  frames: string[];
  totalFrames: number;
  vehicleCount?: number;
  humanCount?: number;
  totalHumans?: number;
  vehicleStats?: {
    median: number;
    mean: number;
    min: number;
    max: number;
    std_dev: number;
  };
  humanStats?: {
    median: number;
    mean: number;
    min: number;
    max: number;
    std_dev: number;
  };
  imageQuality?: {
    brightness: number;
    contrast: number;
    dynamicRange: number;
    brightness_luminance_cd_per_m2?: number;
    contrast_ratio?: number;
  };
  qualityScore?: number;
  avgConfidence?: number;
  weatherDistribution?: { [key: string]: number };
  congestionDistribution?: { [key: string]: number };
  perFrameData?: any[];
  vehicleCountsOverTime?: number[];
  humanCountsOverTime?: number[];
  chartImages?: { [key: string]: string };
}

export interface ImageAnalysisResult extends AnalysisResult {
  annotatedImage: string;
  humanCount?: number;
  imageQuality?: {
    brightness: number;
    contrast: number;
    dynamicRange: number;
    brightness_luminance_cd_per_m2?: number;
    contrast_ratio?: number;
  };
}

// Model Configuration Types
export interface ModelConfig {
  detection: {
    model: string;
    useCustom: boolean;
  };
  weather: {
    model: string | null;
    useCustom: boolean;
  };
}

export interface InferenceSettings {
  useFP16: boolean;
  batchSize: number;
  confidenceThreshold: number;
  imageSize: string;
  useTorchCompile: boolean;
}

// UI Types
export type TabType = 'video' | 'image' | 'road-learning';

export type Language = 'en-US' | 'en-GB' | 'fr-FR' | 'de-DE' | 'es-ES' | 'it-IT' | 'pt-PT' | 'nl-NL';

