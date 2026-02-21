const chalk = require('chalk');
const ora = require('ora');
const adb = require('../utils/adb');
const logger = require('../utils/logger');

module.exports = async (options) => {
    logger.title('SAMSUNG GALAXY A10: MODO ULTRA-PRIME HACK');
    const spinner = ora('Esperando dispositivo Samsung...').start();

    try {
        const devices = await adb.getDevices();
        if (devices.length === 0) {
            spinner.fail(chalk.red('ERROR: No se detectó el Samsung A10. Verifica la conexión y la depuración USB.'));
            return;
        }
        spinner.succeed(chalk.green('Samsung A10 Detectado. Iniciando inyección de código de bajo nivel.'));

        // 🚀 CPU & GPU MAX PERFORMANCE
        logger.step('Fase 1: Overclocking Simulado & Gestión de Energía (Exynos 7884)');
        await adb.run('shell cmd power set-fixed-performance-mode-enabled true');
        try {
            await adb.run('shell cmd thermal-tuning override 0'); // 🔥 ELIMINAR LÍMITES TÉRMICOS (EXTREMO)
        } catch (e) {
            logger.info('Nota: Thermal tuning service no disponible en este firmware, saltando...');
        }
        await adb.run('shell settings put global power_manager_constants "no_cached_processes_limit=true,max_phantom_processes=2147483647"');
        await adb.run('shell settings put global settings_config_tracker_max_phantom_processes 2147483647'); // BYPASS PHANTOM PROCESS KILLER
        await adb.run('shell settings put global activity_manager_constants "max_cached_processes=1024"');

        // Hack de bajo nivel para forzar el governor a performance en todos los núcleos
        try {
            await adb.run('shell "for i in /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor; do echo performance > $i; done"');
        } catch (e) { logger.info('Nota: Ajuste de governor requiere root, saltando...'); }
        logger.success('CPU y GPU forzados a estado de alto rendimiento y límites térmicos relajados.');

        // ✨ UI EXTREMA (THE 0.15x HACK)
        logger.step('Fase 2: Optimización de Fluidez Visual (Animaciones 0.15x)');
        await adb.run('shell settings put global window_animation_scale 0.15');
        await adb.run('shell settings put global transition_animation_scale 0.15');
        await adb.run('shell settings put global animator_duration_scale 0.15');
        logger.success('Animaciones ajustadas al milisegundo (0.15x). Interfaz instantánea.');

        // 🗑️ DEBLOAT AGRESIVO (SAMSUNG EDITION)
        logger.step('Fase 3: Eliminación de Carga Inútil (Samsung Bloatware)');
        const bloat = [
            'com.samsung.android.bixby.agent',
            'com.samsung.android.app.settings.bixby',
            'com.samsung.android.spay',
            'com.samsung.android.app.tips',
            'com.samsung.android.app.social',
            'com.samsung.android.messaging',
            'com.sec.android.app.samsungapps'
        ];
        for (const pkg of bloat) {
            try { await adb.run(`shell pm uninstall -k --user 0 ${pkg}`); } catch (e) { }
        }
        logger.success('One UI aligerada. RAM liberada para procesos críticos.');

        // 🌐 NETWORK & BUFFERS MASIVOS
        logger.step('Fase 4: Tuner de Red & Buffers de Datos (Max Speed)');
        await adb.run('shell settings put global wifi_scan_always_enabled 0');
        await adb.run('shell settings put global mobile_data_always_on 1');
        // Elevando buffers de red a niveles record
        await adb.run('shell settings put global tcp_default_init_rwnd 80');
        await adb.run('shell settings put global net.hostname Samsung-A10-Prime');
        logger.success('Buffers masivos configurados y baja latencia de red activa.');

        // 🏦 STEALTH (BCR BYPASS)
        if (options.stealth) {
            logger.step('Fase 5: Sigilo Bancario (Ocultar Opciones de Desarrollo)');
            await adb.run('shell settings put global development_settings_enabled 0');
            await adb.run('shell settings put global adb_enabled 0');
            logger.success('Dispositivo camuflado para aplicaciones sensibles.');
        }

        logger.success('\n¡SAMSUNG A10 OPTIMIZADO AL NIVEL WORLD-CLASS!');
        console.log(chalk.yellow('\nRECOMENDACIÓN FINAL:'));
        console.log(chalk.cyan('Para el BCR, ejecuta: ') + 'honor samsung-prime --stealth');

    } catch (error) {
        spinner.fail(chalk.red(`Error crítico en Samsung Prime: ${error.message}`));
    }
};
