/**
 * API utilities for connecting to tilda-tesla backend
 * Handles GPU/CPU detection and video/image analysis
 */

// Backend API URL
// Set VITE_API_URL in .env file to override
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:7860';

// Log API configuration for debugging
if (import.meta.env.DEV) {
  console.log('[API Config] Backend URL:', API_BASE_URL);
  console.log('[API Config] Environment:', import.meta.env.MODE);
  console.log('[API Config] Test backend from console: window.testBackend()');
}

export interface SystemInfo {
  hasGPU: boolean;
  gpuName?: string;
  cudaAvailable: boolean;
  device: 'cuda' | 'cpu';
  torchVersion?: string;
}

export interface AnalysisSettings {
  useFP16?: boolean;
  batchSize?: number;
  useTorchCompile?: boolean;
  confidenceThreshold?: number;
  imageSize?: string;
  fps?: number;
  saveFrames?: boolean;
  saveForTraining?: boolean;
  saveAnnotated?: boolean;
  detectionModel?: string;
  weatherModel?: string;
}

/**
 * Check system capabilities (GPU/CPU detection)
 * Queries the backend to check what device (GPU/CPU) is actually available
 * Tries common route patterns
 */
export async function checkSystemCapabilities(): Promise<SystemInfo> {
  // Try different route patterns
  const routes = [
    '/api/system-info',
    '/api/systeminfo',
    '/api/device-info',
    '/api/device',
    '/system-info',
    '/systeminfo',
    '/device-info',
    '/device',
    '/api/gpu-info',
    '/gpu-info',
  ];

  for (const route of routes) {
    try {
      const response = await fetch(`${API_BASE_URL}${route}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(3000),
      });

      if (response.ok) {
        const info = await response.json();
        
        // Validate the response structure
        if (typeof info.hasGPU === 'boolean' && typeof info.device === 'string') {
          console.log(`[GPU Detection] Successfully connected via ${route}`);
          return info;
        }
        // If response is OK but wrong format, try next route
      }
    } catch (error) {
      // Try next route
      continue;
    }
  }

  // All routes failed
  throw new Error(`Cannot reach backend at ${API_BASE_URL}. Tried routes: ${routes.join(', ')}. Make sure backend exposes one of these endpoints.`);
}

/**
 * Analyze video file
 */
export async function analyzeVideo(
  file: File,
  settings: AnalysisSettings = {},
  onProgress?: (progress: number, step: string) => void
): Promise<any> {
  const formData = new FormData();
  formData.append('video', file);
  formData.append('settings', JSON.stringify(settings));

  try {
    const response = await fetch(`${API_BASE_URL}/api/analyze-video`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Video analysis failed: ${response.statusText}`);
    }

    // Handle streaming progress if supported
    let finalResult: any = null;
    let lastProgressData: any = null;
    
    if (response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          // Process any remaining buffer
          if (buffer.trim()) {
            const lines = buffer.split('\n');
            for (const line of lines) {
              if (line.trim() && line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  if (data.progress !== undefined && onProgress) {
                    onProgress(data.progress, data.step || '');
                  }
                  // If this looks like a final result (has summary, metadata, etc.), save it
                  if (data.summary && data.metadata) {
                    finalResult = data;
                  } else if (!data.progress && !data.step && (data.frames || data.images || data.error || data.totalFrames !== undefined)) {
                    // This might be the final result without progress/step fields
                    lastProgressData = data;
                  }
                } catch (e) {
                  console.warn('[API] Failed to parse streaming data:', e, line);
                }
              }
            }
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Keep the last incomplete line in buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() && line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              console.log('[API] Received data:', { hasProgress: data.progress !== undefined, hasStep: data.step !== undefined, hasSummary: !!data.summary, hasMetadata: !!data.metadata, hasFrames: !!data.frames, hasImages: !!data.images });
              
              if (data.progress !== undefined && onProgress) {
                onProgress(data.progress, data.step || '');
              }
              // If this looks like a final result (has summary, metadata, etc.), save it
              if (data.summary && data.metadata) {
                finalResult = data;
                console.log('[API] Identified as final result (has summary and metadata)');
              } else if (!data.progress && !data.step && (data.frames || data.images || data.error || data.totalFrames !== undefined || data.annotatedImage)) {
                // This might be the final result without progress/step fields
                lastProgressData = data;
                console.log('[API] Identified as potential final result (no progress/step, has result fields)');
              }
            } catch (e) {
              console.warn('[API] Failed to parse streaming data:', e, line);
            }
          }
        }
      }
    }

    // Return final result if we got one from streaming
    if (finalResult) {
      console.log('[API] Received final result with summary and metadata');
      return finalResult;
    }
    
    // Try the last data that looked like a result
    if (lastProgressData) {
      console.log('[API] Using last progress data as result');
      return lastProgressData;
    }
    
    // Fallback: try to parse as JSON (for non-streaming responses)
    try {
      const jsonResult = await response.json();
      console.log('[API] Parsed non-streaming JSON response');
      return jsonResult;
    } catch (e) {
      console.error('[API] Failed to parse response as JSON:', e);
      throw new Error('Invalid response format from backend - no valid result found in streaming response');
    }
  } catch (error) {
    console.error('Video analysis error:', error);
    throw error;
  }
}

/**
 * Analyze image file
 */
export async function analyzeImage(
  file: File,
  settings: AnalysisSettings = {},
  onProgress?: (progress: number, step: string) => void
): Promise<any> {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('settings', JSON.stringify(settings));

  try {
    const response = await fetch(`${API_BASE_URL}/api/analyze-image`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Image analysis failed: ${response.statusText}`);
    }

    // Handle streaming progress if supported
    let finalResult: any = null;
    let lastProgressData: any = null;
    
    if (response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          // Process any remaining buffer
          if (buffer.trim()) {
            const lines = buffer.split('\n');
            for (const line of lines) {
              if (line.trim() && line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  if (data.progress !== undefined && onProgress) {
                    onProgress(data.progress, data.step || '');
                  }
                  // If this looks like a final result (has summary, metadata, etc.), save it
                  if (data.summary && data.metadata) {
                    finalResult = data;
                  } else if (!data.progress && !data.step && (data.annotatedImage || data.images || data.error)) {
                    // This might be the final result without progress/step fields
                    lastProgressData = data;
                  }
                } catch (e) {
                  console.warn('[API] Failed to parse streaming data:', e, line);
                }
              }
            }
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Keep the last incomplete line in buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() && line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.progress !== undefined && onProgress) {
                onProgress(data.progress, data.step || '');
              }
              // If this looks like a final result (has summary, metadata, etc.), save it
              if (data.summary && data.metadata) {
                finalResult = data;
              } else if (!data.progress && !data.step && (data.annotatedImage || data.images || data.error)) {
                // This might be the final result without progress/step fields
                lastProgressData = data;
              }
            } catch (e) {
              console.warn('[API] Failed to parse streaming data:', e, line);
            }
          }
        }
      }
    }

    // Return final result if we got one from streaming
    if (finalResult) {
      console.log('[API] Received final result with summary and metadata');
      return finalResult;
    }
    
    // Try the last data that looked like a result
    if (lastProgressData) {
      console.log('[API] Using last progress data as result');
      return lastProgressData;
    }
    
    // Fallback: try to parse as JSON (for non-streaming responses)
    try {
      const jsonResult = await response.json();
      console.log('[API] Parsed non-streaming JSON response');
      return jsonResult;
    } catch (e) {
      console.error('[API] Failed to parse response as JSON:', e);
      throw new Error('Invalid response format from backend - no valid result found in streaming response');
    }
  } catch (error) {
    console.error('Image analysis error:', error);
    throw error;
  }
}

/**
 * Upload file to backend
 */
export async function uploadFile(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const progress = (e.loaded / e.total) * 100;
        onProgress(progress);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        resolve(xhr.responseText);
      } else {
        reject(new Error(`Upload failed: ${xhr.statusText}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed'));
    });

    xhr.open('POST', `${API_BASE_URL}/api/upload`);
    xhr.send(formData);
  });
}

