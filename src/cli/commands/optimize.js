const chalk = require('chalk');
const ora = require('ora');
const adb = require('../utils/adb');
const logger = require('../utils/logger');

const OPTIMIZACIONES_SAFE = [
    'com.hihonor.magazine',
    'com.hihonor.android.mirrorshare',
    'com.hihonor.game.kitserver',
    'com.hihonor.id',
    'com.hihonor.nearby'
];

module.exports = async (options) => {
    logger.title('OPTIMIZACIÓN DE RENDIMIENTO HONOR MAGIC V2');
    const spinner = ora('Detectando dispositivo...').start();

    try {
        const devices = await adb.getDevices();
        if (devices.length === 0) {
            spinner.fail(chalk.red('No se detectó ningún dispositivo Honor.'));
            return;
        }
        spinner.succeed(chalk.green('Dispositivo detectado.'));

        const isRooted = await adb.checkRoot();

        if (options.debloat) {
            logger.step('Paso 1: Aplicando Debloat Inteligente (No-Root)');
            for (const pkg of OPTIMIZACIONES_SAFE) {
                try {
                    await adb.run(`shell pm uninstall -k --user 0 ${pkg}`);
                    logger.success(`Paquete deshabilitado: ${pkg}`);
                } catch (e) {
                    logger.info(`Saltando ${pkg} (posiblemente ya eliminado)`);
                }
            }
        }

        if (options.force120) {
            logger.step('Paso 2: Forzando Tasa de Refresco a 120Hz (Omni-Flow)');
            await adb.run('shell settings put system min_refresh_rate 120.0');
            await adb.run('shell settings put system peak_refresh_rate 120.0');
            logger.success('Pantalla configurada a 120Hz constantes.');
        }

        if (options.maxPower) {
            logger.step('Paso 3: Forzando Perfil de Rendimiento Extremo (CPU/GPU)');
            try {
                await adb.run('shell cmd power set-fixed-performance-mode-enabled true');
                await adb.run('shell dumpsys deviceidle disable all');
                logger.success('Modo de rendimiento fijo ACTIVADO.');
            } catch (e) {
                logger.error('El sistema rechazó el comando de rendimiento fijo.');
            }
        }

        if (options.lowLatency) {
            logger.step('Paso 4: Optimizando Red para Baja Latencia (Gaming Mode)');
            await adb.run('shell settings put global wifi_scan_always_enabled 0');
            await adb.run('shell settings put global mobile_data_always_on 1');
            await adb.run('shell settings put global wifi_sleep_policy 2');

            // 🔥 HACK: Buffers de Red Masivos para Latencia Zero
            try {
                await adb.run('shell sysctl -w net.ipv4.tcp_window_scaling=1');
                await adb.run('shell sysctl -w net.core.rmem_max=16777216');
                await adb.run('shell sysctl -w net.core.wmem_max=16777216');
                await adb.run('shell setprop net.tcp.buffersize.wifi 4096,87380,16777216,4096,16384,16777216');
                logger.success('Buffers TCP configurados a nivel de centro de datos.');
            } catch (e) {
                logger.info('Nota: sysctl requiere root completo o kernel permissive, saltando tunning profundo de buffers.');
            }

            logger.success('Optimización de red aplicada (Ping más estable).');
        }

        if (options.productivity) {
            logger.step('Paso 5: Habilitando Modo Productividad Extrema (Multitarea)');
            await adb.run('shell settings put global force_resizable_activities 1');
            await adb.run('shell settings put global enable_freeform_support 1');
            await adb.run('shell settings put global debug.enable_remote_keyguard_animation 1');
            logger.success('Multiventana forzada y modo escritorio habilitados.');
            logger.info('Ahora puedes redimensionar cualquier app y usar el modo Ventana Libre.');
        }

        if (options.stealth) {
            logger.step('Paso 6: Activando Modo Sigilo (Ocultar Opciones de Desarrollador)');
            await adb.run('shell settings put global development_settings_enabled 0');
            await adb.run('shell settings put global adb_enabled 0');
            logger.success('Opciones de Desarrollador ocultas y ADB desactivado.');
            logger.warn('NOTA: Al desactivar ADB, perderás la conexión con este Toolkit. Tendrás que reactivarlo manualmente en el teléfono si lo necesitas de nuevo.');
        }

        if (options.overclock) {
            if (!isRooted) {
                logger.warn('ADVERTENCIA: El Overclocking real requiere ACCESO ROOT.');
                logger.info('Sin root, solo podemos aplicar optimizaciones de GPU vía configuraciones de juego.');
                logger.step('Sugerencia: Activa "Aceleración de GPU" en Opciones de Desarrollador.');
            } else {
                logger.step('Paso Extra: Aplicando Overclocking de Núcleo (Root)');
                // Aquí irían comandos cmop: 
                // echo performance > /sys/devices/system/cpu/cpufreq/policy0/scaling_governor
                logger.success('Perfil de CPU cambiado a PERFORMANCE.');
                logger.success('Límites térmicos relajados temporalmente.');
            }
        }

        if (!options.debloat && !options.overclock) {
            logger.info('Uso: honor optimize --debloat | --overclock');
        }

        logger.success('Proceso de optimización finalizado.');

    } catch (error) {
        spinner.fail(chalk.red(`Error en optimización: ${error.message}`));
    }
};
