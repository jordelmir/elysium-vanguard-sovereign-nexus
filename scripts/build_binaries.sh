#!/bin/bash

# Script de compilación profesional para Honor Root Toolkit
# Genera binarios independientes para macOS (arm64/x64)

set -e

PROJECT_DIR="/Users/jordelmirsdevhome/Downloads/Jailbreak/honor-root-toolkit"
DIST_DIR="$PROJECT_DIR/dist"

echo "🚀 Iniciando proceso de compilación del Toolkit..."

# Asegurar que el directorio de distribución existe
mkdir -p "$DIST_DIR"

# Cambiar al directorio del proyecto para la compilación
cd "$PROJECT_DIR"

# Compilar para macOS (arm64)
echo "📦 Generando binario para macOS (arm64)..."
GOOS=darwin GOARCH=arm64 go build -o "$DIST_DIR/honor-root-toolkit-macos-arm64" .

# Compilar para macOS (x64)
echo "📦 Generando binario para macOS (x64)..."
GOOS=darwin GOARCH=amd64 go build -o "$DIST_DIR/honor-root-toolkit-macos-x64" .

echo "✅ Compilación finalizada en: $DIST_DIR"
ls -lh "$DIST_DIR"
