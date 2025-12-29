/**
 * Test backend connection from React frontend
 * Can be called from browser console: window.testBackend()
 */

import { checkSystemCapabilities } from './api';

export async function testBackend() {
  console.log('='.repeat(60));
  console.log('Testing Backend Connection');
  console.log('='.repeat(60));
  
  try {
    const info = await checkSystemCapabilities();
    console.log('✅ Backend connected successfully!');
    console.log('GPU Status:', info);
    
    if (info.hasGPU) {
      console.log(`✅ GPU detected: ${info.gpuName || 'Unknown'}`);
      console.log(`✅ CUDA available: ${info.cudaAvailable}`);
      console.log(`✅ Device: ${info.device}`);
    } else {
      console.log('⚠️ Backend connected but GPU not detected');
      console.log('This means PyTorch in your backend cannot see the GPU');
      console.log('Fix: Reinstall PyTorch with CUDA support in your backend environment');
    }
    
    return info;
  } catch (error) {
    console.error('❌ Backend connection failed:', error);
    console.log('Make sure:');
    console.log('1. Backend (tilda-tesla) is running');
    console.log('2. Backend exposes /api/system-info endpoint');
    console.log('3. CORS is enabled on backend');
    throw error;
  }
}

// Make it available globally for easy testing
if (typeof window !== 'undefined') {
  (window as any).testBackend = testBackend;
}

