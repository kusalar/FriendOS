<#
.SYNOPSIS
    Reproducible Windows Build & Packaging Script for FRIEND.OS.
.DESCRIPTION
    Builds the static Next.js frontend, compiles the Python FastAPI backend with PyInstaller,
    and packages everything into a Windows desktop installer (FRIEND.OS-Setup.exe) and
    portable distribution (FRIEND.OS-Portable.zip) using electron-builder.
.PARAMETER SkipFrontend
    Skip building the frontend if already built.
.PARAMETER SkipBackend
    Skip compiling the backend if already compiled.
.PARAMETER CertificatePath
    Path to an official Authenticode .pfx certificate file for code signing.
.PARAMETER CertificatePassword
    Password for the Authenticode certificate.
#>

param(
    [switch]$SkipFrontend,
    [switch]$SkipBackend,
    [string]$CertificatePath = "",
    [string]$CertificatePassword = ""
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "       FRIEND.OS Windows Desktop Packaging Script       " -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan

# 1. Environment Verification
Write-Host "[1/5] Verifying build prerequisites..." -ForegroundColor Yellow

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js is not found in PATH. Please install Node.js (v18+) to continue."
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Error "npm is not found in PATH. Please install npm to continue."
}

$PythonExe = Join-Path $ScriptDir ".venv\Scripts\python.exe"
if (-not (Test-Path $PythonExe)) {
    $PythonExe = "python"
    Write-Host "  Using system python: $(Get-Command python | Select-Object -ExpandProperty Source)" -ForegroundColor Gray
} else {
    Write-Host "  Using project virtualenv: $PythonExe" -ForegroundColor Gray
}

# 2. Frontend Production Export
if (-not $SkipFrontend) {
    Write-Host "`n[2/5] Building Next.js frontend (static export)..." -ForegroundColor Yellow
    $FrontendDir = Join-Path $ScriptDir "frontend"
    Push-Location $FrontendDir
    try {
        if (-not (Test-Path "node_modules")) {
            Write-Host "  Installing frontend dependencies..." -ForegroundColor Gray
            npm install
        }
        Write-Host "  Exporting static application to frontend/out..." -ForegroundColor Gray
        npm run build
        if (-not (Test-Path "out\index.html")) {
            Write-Error "Frontend build did not produce out\index.html"
        }
        Write-Host "  Frontend static export ready." -ForegroundColor Green
    } finally {
        Pop-Location
    }
} else {
    Write-Host "`n[2/5] Skipping frontend build as requested." -ForegroundColor Gray
}

# 3. Backend PyInstaller Compilation
if (-not $SkipBackend) {
    Write-Host "`n[3/5] Compiling FastAPI backend with PyInstaller..." -ForegroundColor Yellow
    
    # Ensure pyinstaller and pillow are installed in python env
    & $PythonExe -m pip install --quiet pyinstaller pillow

    # Generate icons if needed
    & $PythonExe (Join-Path $ScriptDir "desktop\generate_icon.py")

    # Run PyInstaller
    Write-Host "  Running PyInstaller for desktop_backend.py..." -ForegroundColor Gray
    & $PythonExe -m PyInstaller `
        --noconfirm `
        --onedir `
        --windowed `
        --name "friend-os-backend" `
        --add-data "backend;backend" `
        --hidden-import "uvicorn" `
        --hidden-import "uvicorn.logging" `
        --hidden-import "uvicorn.loops" `
        --hidden-import "uvicorn.loops.auto" `
        --hidden-import "uvicorn.protocols" `
        --hidden-import "uvicorn.protocols.http" `
        --hidden-import "uvicorn.protocols.http.auto" `
        --hidden-import "uvicorn.protocols.websockets" `
        --hidden-import "uvicorn.protocols.websockets.auto" `
        --hidden-import "uvicorn.lifespans" `
        --hidden-import "uvicorn.lifespans.on" `
        --hidden-import "fastapi" `
        --hidden-import "sqlite3" `
        --hidden-import "pydantic" `
        desktop_backend.py

    $CompiledBackend = Join-Path $ScriptDir "dist\friend-os-backend\friend-os-backend.exe"
    if (-not (Test-Path $CompiledBackend)) {
        Write-Error "Backend compilation failed: $CompiledBackend was not created."
    }
    Write-Host "  Backend executable compiled successfully." -ForegroundColor Green
} else {
    Write-Host "`n[3/5] Skipping backend compilation as requested." -ForegroundColor Gray
}

# 4. Desktop Wrapper & Packaging
Write-Host "`n[4/5] Packaging desktop installer with electron-builder..." -ForegroundColor Yellow
$DesktopDir = Join-Path $ScriptDir "desktop"
Push-Location $DesktopDir
try {
    if (-not (Test-Path "node_modules")) {
        Write-Host "  Installing desktop Electron dependencies..." -ForegroundColor Gray
        npm install
    }

    # Ensure winCodeSign cache has no symlink extraction issues
    $WinCodeSignDir = "$env:LOCALAPPDATA\electron-builder\Cache\winCodeSign"
    $ExtractedTarget = Join-Path $WinCodeSignDir "winCodeSign-2.6.0"
    if (-not (Test-Path $ExtractedTarget)) {
        $Archive7z = Get-ChildItem -Path $WinCodeSignDir -Filter "*.7z" -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($Archive7z) {
            $SevenZip = Join-Path $DesktopDir "node_modules\7zip-bin\win\x64\7za.exe"
            if (Test-Path $SevenZip) {
                Write-Host "  Pre-extracting winCodeSign toolchain (skipping non-Windows symlinks)..." -ForegroundColor Gray
                & $SevenZip x -y -x!*darwin* "-o$ExtractedTarget" $Archive7z.FullName | Out-Null
            }
        }
    }

    # Configure Code Signing if certificate provided
    if ($CertificatePath -ne "") {
        Write-Host "  Configuring Authenticode Code Signing..." -ForegroundColor Cyan
        $env:CSC_LINK = $CertificatePath
        if ($CertificatePassword -ne "") {
            $env:CSC_KEY_PASSWORD = $CertificatePassword
        }
    } else {
        Write-Host "  Code Signing: No certificate specified (Standard unsigned package)." -ForegroundColor Gray
    }

    Write-Host "  Running electron-builder for Windows (NSIS + Portable Zip)..." -ForegroundColor Gray
    npm run dist
} finally {
    Pop-Location
}

# 5. Output Verification & Summary
Write-Host "`n[5/5] Finalizing distribution packages..." -ForegroundColor Yellow
$ReleaseDir = Join-Path $ScriptDir "release"

$Installer = Get-ChildItem -Path $ReleaseDir -Filter "*Setup*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($Installer) {
    $StandardInstaller = Join-Path $ReleaseDir "FRIEND.OS-Setup.exe"
    if ($Installer.FullName -ne $StandardInstaller) {
        Copy-Item -Path $Installer.FullName -Destination $StandardInstaller -Force
    }
    Write-Host "`n>> Windows Installer: $StandardInstaller" -ForegroundColor Green
}

$ZipPackage = Get-ChildItem -Path $ReleaseDir -Filter "*.zip" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($ZipPackage) {
    $StandardZip = Join-Path $ReleaseDir "FRIEND.OS-Portable.zip"
    if ($ZipPackage.FullName -ne $StandardZip) {
        Copy-Item -Path $ZipPackage.FullName -Destination $StandardZip -Force
    }
    Write-Host ">> Portable Package:  $StandardZip" -ForegroundColor Green
}

Write-Host "`n========================================================" -ForegroundColor Green
Write-Host "           Build Completed Successfully!                " -ForegroundColor Green
Write-Host "========================================================`n" -ForegroundColor Green
