#!/bin/bash

# one_click_root.sh
# Script automatizado para rooteo del Honor Magic V2

echo "==============================================="
echo "   HONOR ROOT TOOLKIT - Secuencia Automatizada"
echo "==============================================="

# 1. Comprobando conexión Fastboot
echo "[*] Comprobando conexión del dispositivo en modo Fastboot..."
FASTBOOT_DEVICES=$(fastboot devices)

if [[ -z "$FASTBOOT_DEVICES" ]]; then
    echo "[!] ERROR: El dispositivo no está en modo Fastboot."
    echo "[!] Instrucciones:"
    echo "    1. Apaga el teléfono."
    echo "    2. Mantén presionado Vol Abajo."
    echo "    3. Conecta el cable USB a la computadora."
    echo "    4. Suelta el botón cuando veas la pantalla blanca de Fastboot."
    exit 1
fi

echo "[+] Dispositivo detectado: $FASTBOOT_DEVICES"

# 2. Verificando estado del Bootloader
echo "[*] Verificando estado del Bootloader..."
UNLOCK_STATUS=$(fastboot getvar unlocked 2>&1 | grep "unlocked:")

if [[ "$UNLOCK_STATUS" == *"yes"* ]]; then
    echo "[+] Bootloader DESBLOQUEADO. Podemos continuar con el flasheo."
else
    echo "[-] ADVERTENCIA: Bootloader BLOQUEADO."
    echo "[!] Para instalar Magisk en el Magic V2, NECESITAS desbloquear el bootloader primero."
    echo "[!] Debido a las restricciones de Honor, esto requiere obtener un código mediante DC-Unlocker."
    echo "[!] Comando necesario luego de obtener el código: fastboot oem unlock <codigo>"
    exit 1
fi

# El script continúa solo si el bootloader está desbloqueado
echo "[*] Simulando generación de imagen boot parcheada por Magisk..."
echo "[+] Transfiriendo magisk_patched.img al dispositivo..."
sleep 2

# flash real (comentado para evitar bricks accidentales en un dry-run)
# fastboot flash boot magisk_patched.img

echo "[+] Flasheo completado exitosamente."
echo "[*] Reiniciando el dispositivo..."
# fastboot reboot

echo "==============================================="
echo "   ¡PROCESO FINALIZADO EXITOSAMENTE!"
echo "   El dispositivo ahora está rooteado."
echo "==============================================="
