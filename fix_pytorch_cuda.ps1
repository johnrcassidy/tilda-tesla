# PowerShell script to check CUDA and fix PyTorch installation
# Run this in your backend Python environment

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "PyTorch CUDA Setup Helper" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if nvidia-smi exists
$nvidiaSmiPath = $null
$possiblePaths = @(
    "C:\Program Files\NVIDIA Corporation\NVSMI\nvidia-smi.exe",
    "C:\Windows\System32\nvidia-smi.exe",
    "$env:ProgramFiles\NVIDIA Corporation\NVSMI\nvidia-smi.exe"
)

foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        $nvidiaSmiPath = $path
        break
    }
}

if ($nvidiaSmiPath) {
    Write-Host "Found NVIDIA driver:" -ForegroundColor Green
    & $nvidiaSmiPath --query-gpu=driver_version,cuda_version,name --format=csv,noheader
    Write-Host ""
    
    # Get CUDA version
    $cudaInfo = & $nvidiaSmiPath --query-gpu=cuda_version --format=csv,noheader | Select-Object -First 1
    $cudaVersion = $cudaInfo.Trim()
    Write-Host "Detected CUDA version: $cudaVersion" -ForegroundColor Yellow
    Write-Host ""
    
    # Map CUDA version to PyTorch index
    $cudaMajor = [int]($cudaVersion -split '\.')[0]
    $cudaMinor = [int]($cudaVersion -split '\.')[1]
    
    $pytorchCuda = "cu118"  # Default
    if ($cudaMajor -eq 12 -and $cudaMinor -ge 1) {
        $pytorchCuda = "cu121"
    } elseif ($cudaMajor -eq 12 -and $cudaMinor -eq 0) {
        $pytorchCuda = "cu120"
    } elseif ($cudaMajor -eq 11 -and $cudaMinor -ge 8) {
        $pytorchCuda = "cu118"
    } elseif ($cudaMajor -eq 11 -and $cudaMinor -ge 7) {
        $pytorchCuda = "cu117"
    }
    
    Write-Host "Recommended PyTorch CUDA version: $pytorchCuda" -ForegroundColor Green
    Write-Host ""
    Write-Host "Run this command to install PyTorch with CUDA:" -ForegroundColor Cyan
    Write-Host "pip uninstall torch torchvision torchaudio" -ForegroundColor White
    Write-Host "pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/$pytorchCuda" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "nvidia-smi not found. Make sure NVIDIA drivers are installed." -ForegroundColor Red
    Write-Host "You can manually check with: nvidia-smi" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Common PyTorch CUDA versions:" -ForegroundColor Cyan
    Write-Host "  cu121 - CUDA 12.1" -ForegroundColor White
    Write-Host "  cu118 - CUDA 11.8 (most common)" -ForegroundColor White
    Write-Host "  cu117 - CUDA 11.7" -ForegroundColor White
    Write-Host ""
    Write-Host "Try: pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "After installing, verify with:" -ForegroundColor Cyan
Write-Host 'python -c "import torch; print(\"CUDA available:\", torch.cuda.is_available()); print(\"GPU:\", torch.cuda.get_device_name(0) if torch.cuda.is_available() else \"None\")"' -ForegroundColor White
Write-Host ""

