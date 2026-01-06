# PowerShell Script — setup-essentia-model.ps1

# Target variables
$MODEL_URL = "https://essentia.upf.edu/models/autotagging/msd/msd-vgg-1-tfjs.zip"
$TARGET_DIR = "frontend/public/models/musicvgg"

# Create target directory if missing
Write-Host "Creating model directory at $TARGET_DIR..."
New-Item -ItemType Directory -Force -Path $TARGET_DIR | Out-Null

# Temp download location
$TMP_ZIP = Join-Path $env:TEMP "msd-vgg-1-tfjs.zip"

# Download the model
Write-Host "Downloading Essentia VGG TFJS model..."
Invoke-WebRequest -Uri $MODEL_URL -OutFile $TMP_ZIP

if (!(Test-Path $TMP_ZIP)) {
    Write-Error "Download failed. Exiting."
    exit 1
}

Write-Host "Extracting model..."
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::ExtractToDirectory($TMP_ZIP, $TARGET_DIR)

Write-Host "Cleaning up downloaded zip..."
Remove-Item $TMP_ZIP

Write-Host "Model files now at: $TARGET_DIR"
Get-ChildItem -Path $TARGET_DIR

Write-Host "Done. You can now run your development server and confirm model loads."
