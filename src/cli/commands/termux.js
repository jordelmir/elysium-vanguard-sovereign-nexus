const chalk = require('chalk');
const ora = require('ora');
const adb = require('../utils/adb');
const logger = require('../utils/logger');

module.exports = async () => {
    logger.title('CONFIGURACIÓN PROFESIONAL DE TERMUX');
    const spinner = ora('Detectando dispositivo...').start();

    try {
        const devices = await adb.getDevices();
        if (devices.length === 0) {
            spinner.fail(chalk.red('No se detectó el Honor V2.'));
            return;
        }
        spinner.succeed(chalk.green('Honor Magic V2 conectado.'));

        logger.step('Paso 1: Desactivando Phantom Process Killer (Android 12/13+)');
        await adb.run('shell settings put global settings_config_tracker_max_phantom_processes 2147483647');
        logger.success('Límite de procesos fantasma eliminado. Termux podrá compilar sin cierres.');

        logger.step('Paso 2: Optimizando permisos de ejecución');
        await adb.run('shell cmd power set-fixed-performance-mode-enabled true');

        logger.info('\n--- INSTRUCCIONES EN TERMUX ---');
        console.log(chalk.cyan('1. Actualiza repositorios: ') + 'pkg update && pkg upgrade');
        console.log(chalk.cyan('2. Instala base de compilación: ') + 'pkg install build-essential git python nodejs-lts openjdk-17');
        console.log(chalk.cyan('3. Acceso a archivos: ') + 'termux-setup-storage');
        console.log(chalk.cyan('4. Para compilar APKs: ') + 'pkg install ecj apksigner dx');

        logger.success('\nEntorno de desarrollo preparado en el dispositivo.');

    } catch (error) {
        spinner.fail(chalk.red(`Error en configuración de Termux: ${error.message}`));
    }
};
