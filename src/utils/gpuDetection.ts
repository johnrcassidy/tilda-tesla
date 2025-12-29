/**
 * Client-side GPU/CPU detection using browser APIs
 * This detects the actual hardware in the user's machine
 */

export interface SystemCapabilities {
  hasGPU: boolean;
  gpuName?: string;
  gpuVendor?: string;
  cudaAvailable: boolean; // Always false in browser, backend would have CUDA
  device: 'gpu' | 'cpu';
  cpuCores?: number;
  memoryGB?: number;
  webGLVersion?: string;
  webGPUAvailable: boolean;
}

/**
 * Detect system capabilities using browser APIs
 */
export function detectSystemCapabilities(): SystemCapabilities {
  const capabilities: SystemCapabilities = {
    hasGPU: false,
    cudaAvailable: false, // Browser can't access CUDA directly
    device: 'cpu',
    webGPUAvailable: false,
  };

  // Detect GPU via WebGL
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') || 
               canvas.getContext('webgl2');
    
    if (gl) {
      capabilities.hasGPU = true;
      capabilities.device = 'gpu';
      
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        capabilities.gpuVendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        
        if (renderer) {
          // Automatically parse GPU name from various formats
          let gpuName = renderer;
          
          // Handle ANGLE format: "ANGLE (vendor, GPU Model Direct3D11 vs_5_0 ps_5_0)"
          if (gpuName.includes('ANGLE (')) {
            // Extract content between ANGLE ( and )
            const angleMatch = gpuName.match(/ANGLE\s*\(([^)]+)\)/);
            if (angleMatch) {
              const angleContent = angleMatch[1];
              // Split by comma - first part is vendor, second part is GPU model
              const parts = angleContent.split(',').map(p => p.trim());
              if (parts.length >= 2) {
                // Second part contains GPU model, remove Direct3D info
                gpuName = parts[1];
              } else if (parts.length === 1) {
                gpuName = parts[0];
              }
            }
          }
          
          // Remove Direct3D and shader model info (vs_5_0 ps_5_0, etc.)
          gpuName = gpuName.replace(/Direct3D11?/gi, '').trim();
          gpuName = gpuName.replace(/vs_\d+_\d+/gi, '').trim();
          gpuName = gpuName.replace(/ps_\d+_\d+/gi, '').trim();
          gpuName = gpuName.replace(/D3D\d+/gi, '').trim();
          
          // Remove extra whitespace and clean up
          gpuName = gpuName.replace(/\s+/g, ' ').trim();
          
          // Remove trailing commas, parentheses, etc.
          gpuName = gpuName.replace(/[,\s()]+$/, '').trim();
          gpuName = gpuName.replace(/^[,\s()]+/, '').trim();
          
          // If we have a valid GPU name, use it; otherwise fall back to original
          if (gpuName && gpuName.length > 0 && gpuName !== renderer) {
            capabilities.gpuName = gpuName;
          } else {
            // Fallback: try to extract just the model number if it's a known pattern
            // e.g., "NVIDIA GeForce RTX 3080" from "NVIDIA GeForce RTX 3080 Direct3D11..."
            const modelMatch = renderer.match(/((?:NVIDIA|AMD|Intel)\s+(?:GeForce|Radeon|Arc|Iris|HD|UHD)?\s*(?:RTX|GTX|RX|Arc)?\s*\d+\s*\w*)/i);
            if (modelMatch) {
              capabilities.gpuName = modelMatch[1].trim();
            } else {
              capabilities.gpuName = renderer;
            }
          }
        } else {
          capabilities.gpuName = renderer;
        }
      }
      capabilities.webGLVersion = gl.getParameter(gl.VERSION);
    }
  } catch (e) {
    console.warn('WebGL detection failed:', e);
  }

  // Detect WebGPU
  if ('gpu' in navigator && (navigator as any).gpu) {
    capabilities.webGPUAvailable = true;
    if (!capabilities.hasGPU) {
      capabilities.hasGPU = true;
      capabilities.device = 'gpu';
    }
  }

  // Detect CPU cores
  if (navigator.hardwareConcurrency) {
    capabilities.cpuCores = navigator.hardwareConcurrency;
  }

  // Detect memory (if available)
  if ((navigator as any).deviceMemory) {
    capabilities.memoryGB = (navigator as any).deviceMemory;
  }

  return capabilities;
}

/**
 * Check if NVIDIA GPU is detected
 */
export function hasNVIDIAGPU(): boolean {
  const caps = detectSystemCapabilities();
  if (caps.gpuName) {
    return caps.gpuName.toLowerCase().includes('nvidia');
  }
  if (caps.gpuVendor) {
    return caps.gpuVendor.toLowerCase().includes('nvidia');
  }
  return false;
}

