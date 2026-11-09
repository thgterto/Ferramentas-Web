# Gera o pacote portable (one-folder) no Windows e um zip em portable\dist\.
# Uso: powershell -ExecutionPolicy Bypass -File simulador-escalas\portable\build.ps1
$ErrorActionPreference = "Stop"
$Here = Split-Path -Parent $MyInvocation.MyCommand.Path
$Root = Split-Path -Parent $Here
Push-Location "$Root\frontend"
if (-not (Test-Path node_modules)) { npm ci }
npm run build
Pop-Location
$Venv = "$Here\.venv-build"
if (-not (Test-Path $Venv)) { python -m venv $Venv }
& "$Venv\Scripts\python.exe" -m pip install -q --upgrade pip
& "$Venv\Scripts\python.exe" -m pip install -q "$Root\backend" "pyinstaller==6.11.1"
Push-Location $Here
& "$Venv\Scripts\pyinstaller.exe" --noconfirm --distpath dist --workpath build simulador-escalas.spec
$Zip = "dist\simulador-escalas-windows-x64.zip"
if (Test-Path $Zip) { Remove-Item $Zip }
Compress-Archive -Path dist\simulador-escalas -DestinationPath $Zip
Pop-Location
Write-Host "ok: $Here\$Zip"
