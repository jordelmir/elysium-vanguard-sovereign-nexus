const ora = require('ora');
const chalk = require('chalk');
const adb = require('../utils/adb');
const logger = require('../utils/logger');
const { execSync } = require('child_process');
const fs = require('fs');

module.exports = async () => {
    logger.title('One-Click Root Automatizado - Honor Magic V2');

    // 1. Detectar dispositivo en ADB o Fastboot
    const spinner = ora('Verificando estado del dispositivo...').start();
    let devices = await adb.getDevices();
    let activeDevice = devices.find(d => d.state === 'device');

    if (!activeDevice) {
        // Verificar si está en fastboot
        try {
            const fastbootOutput = execSync('fastboot devices').toString();
            if (fastbootOutput.includes('fastboot')) {
                spinner.succeed('Dispositivo detectado en modo Fastboot.');
                activeDevice = { id: 'fastboot_device', state: 'fastboot' };
            } else {
                throw new Error('No device');
            }
        } catch (e) {
            spinner.fail(chalk.red('No se detectó dispositivo ni en ADB ni en Fastboot.'));
            logger.info('Conecta el dispositivo y autoriza la depuración USB o ponlo en Fastboot Mode.');
            process.exit(1);
        }
    } else {
        spinner.succeed(`Dispositivo ADB detectado: ${activeDevice.id}`);
    }

    // 2. Comprobar root existente
    if (activeDevice.state !== 'fastboot') {
        const isRooted = await adb.checkRoot();
        if (isRooted) {
            logger.success('El dispositivo ya tiene acceso Root (su). No es necesario ejecutar el proceso again.');
            process.exit(0);
        }
    }

    // 3. Flujo de trabajo automatizado
    console.log(chalk.cyan('\nIniciando secuencia de Rooteo...'));

    // Validar bootloader unlock via script shell
    try {
        logger.step('Paso 1: Iniciando script one_click_root.sh...');
        execSync('sh scripts/one_click_root.sh', { stdio: 'inherit' });
    } catch (error) {
        logger.error(`Falló la ejecución del script de rooteo: ${error.message}`);
        process.exit(1);
    }

    logger.success('Secuencia de Rooteo finalizada.');
};
