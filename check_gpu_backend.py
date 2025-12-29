#!/usr/bin/env python3
"""
Quick script to check if PyTorch can see your GPU
Run this in your backend environment to diagnose the issue
"""

try:
    import torch
    print("=" * 60)
    print("PyTorch GPU Detection Check")
    print("=" * 60)
    print(f"PyTorch version: {torch.__version__}")
    print(f"CUDA available: {torch.cuda.is_available()}")
    
    if torch.cuda.is_available():
        print(f"CUDA version: {torch.version.cuda}")
        print(f"cuDNN version: {torch.backends.cudnn.version()}")
        print(f"Number of GPUs: {torch.cuda.device_count()}")
        for i in range(torch.cuda.device_count()):
            print(f"  GPU {i}: {torch.cuda.get_device_name(i)}")
            print(f"    Memory: {torch.cuda.get_device_properties(i).total_memory / 1024**3:.2f} GB")
    else:
        print("\n❌ CUDA is NOT available!")
        print("\nPossible reasons:")
        print("1. PyTorch was installed without CUDA support (CPU-only)")
        print("2. CUDA drivers are not installed")
        print("3. CUDA version mismatch")
        print("\nTo fix:")
        print("1. Check CUDA driver: nvidia-smi")
        print("2. Reinstall PyTorch with CUDA:")
        print("   pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118")
        print("   (Replace cu118 with your CUDA version)")
    
    print("=" * 60)
    
except ImportError:
    print("❌ PyTorch is not installed!")
    print("Install it with: pip install torch")
except Exception as e:
    print(f"❌ Error: {e}")

