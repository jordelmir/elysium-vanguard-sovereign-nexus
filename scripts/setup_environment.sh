#!/bin/bash

# setup_environment.sh
# Script para instalar dependencias necesarias (ADB y Fastboot) en macOS
# Proyecto Honor Root Toolkit

echo "🚀 Iniciando configuración del entorno para Honor Root Toolkit..."

# Comprobar Homebrew
if ! command -v brew &> /dev/null; then
    echo "❌ Homebrew no está instalado. Por favor instala Homebrew primero."
    echo "Ejecuta: /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
    exit 1
fi
echo "✅ Homebrew detectado."

# Instalar platform-tools (adb y fastboot)
echo "📦 Instalando android-platform-tools via Homebrew (ADB y Fastboot)..."
brew install --cask android-platform-tools

# Comprobar instalación
if ! command -v adb &> /dev/null; then
    echo "❌ Error al instalar ADB."
    exit 1
fi
echo "✅ ADB instalado: $(adb version | head -n 1)"

if ! command -v fastboot &> /dev/null; then
    echo "❌ Error al instalar Fastboot."
    exit 1
fi
echo "✅ Fastboot instalado: $(fastboot --version | head -n 1)"

echo "🎉 Entorno configurado correctamente."
echo ""
echo "📱 Instrucciones para el usuario:"
echo "1. Ve a Configuración > Acerca del teléfono > Toca 'Número de compilación' 7 veces."
echo "2. Ve a Configuración > Opciones de desarrollador > Activa 'Depuración USB'."
echo "3. Conecta el teléfono a la Mac y ejecuta 'adb devices'."
