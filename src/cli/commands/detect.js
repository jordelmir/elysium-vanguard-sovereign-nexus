const ora = require('ora');
const chalk = require('chalk');
const adb = require('../utils/adb');
const logger = require('../utils/logger');

module.exports = async () => {
    logger.title('Detección de Dispositivo Honor');

    const spinner = ora('Buscando dispositivos conectados via ADB...').start();

    try {
        const devices = await adb.getDevices();

        if (devices.length === 0) {
            spinner.fail(chalk.red('No se encontraron dispositivos conectados.'));
            logger.info('Asegúrate de que la "Depuración USB" está activada y el cable conectado.');
            process.exit(1);
        }

        spinner.succeed(chalk.green(`Se ha detectado ${devices.length} dispositivo(s)`));

        for (const device of devices) {
            console.log(chalk.cyan('\n----------------------------------------'));
            console.log(chalk.white.bold(`📱 ID del dispositivo: `) + chalk.yellow(device.id));
            console.log(chalk.white.bold(`🔌 Estado: `) + (device.state === 'device' ? chalk.green('Autorizado') : chalk.red(device.state)));

            if (device.state === 'device') {
                const spinner2 = ora('Obteniendo información del sistema...').start();
                try {
                    const model = await adb.getProp('ro.product.model');
                    const brand = await adb.getProp('ro.product.brand');
                    const board = await adb.getProp('ro.board.platform');
                    const androidVer = await adb.getProp('ro.build.version.release');
                    const isRooted = await adb.checkRoot();

                    spinner2.succeed('Información obtenida correctamente');

                    console.log(chalk.white(`   Marca: `) + chalk.cyan(brand));
                    console.log(chalk.white(`   Modelo: `) + chalk.cyan(model));
                    console.log(chalk.white(`   Plataforma (SoC): `) + chalk.cyan(board));
                    console.log(chalk.white(`   Android Version: `) + chalk.cyan(androidVer));
                    console.log(chalk.white(`   Privilegios Root: `) + (isRooted ? chalk.green('✔ SÍ') : chalk.red('✖ NO')));

                    if (brand.toLowerCase().includes('honor')) {
                        console.log(chalk.green.bold('\n✅ Compatibilidad confirmada con dispositivo Honor!'));
                    } else {
                        console.log(chalk.yellow.bold('\n⚠ Atención: El dispositivo detectado no parece ser un Honor.'));
                    }
                } catch (e) {
                    spinner2.fail('Error obteniendo información. Verifica que la pantalla esté encendida y hayas autorizado el PC.');
                }
            }
            console.log(chalk.cyan('----------------------------------------\n'));
        }

    } catch (error) {
        spinner.fail(chalk.red('Error crítico durante la detección ADB.'));
        logger.error(error.message);
    }
};
