# Quick Fix: Enable GPU Detection

Your backend is connected but PyTorch can't see your GPU. Here's how to fix it:

## Step 1: Check Your CUDA Version

Open PowerShell and run:
```powershell
nvidia-smi
```

Look for the "CUDA Version" line (e.g., "12.1", "11.8", etc.)

## Step 2: Reinstall PyTorch with CUDA Support

**For CUDA 12.1:**
```bash
pip uninstall torch torchvision torchaudio
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
```

**For CUDA 11.8 (most common):**
```bash
pip uninstall torch torchvision torchaudio
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
```

**For CUDA 11.7:**
```bash
pip uninstall torch torchvision torchaudio
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu117
```

## Step 3: Verify It Works

```bash
python -c "import torch; print('CUDA available:', torch.cuda.is_available()); print('GPU:', torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'None')"
```

You should see:
```
CUDA available: True
GPU: NVIDIA GeForce GTX 980
```

## Step 4: Restart Your Backend

After fixing PyTorch, restart your `tilda-tesla` backend. The frontend will automatically detect your GPU.

## Automated Helper Script

Or run the helper script:
```powershell
.\fix_pytorch_cuda.ps1
```

This will automatically detect your CUDA version and give you the correct install command.

