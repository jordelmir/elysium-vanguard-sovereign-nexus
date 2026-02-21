const ora = require('ora');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const adb = require('../utils/adb');
const logger = require('../utils/logger');

module.exports = async () => {
    logger.title('Backup de Particiones Críticas');

    const devices = await adb.getDevices();
    const activeDevice = devices.find(d => d.state === 'device');

    if (!activeDevice) {
        logger.error('No se detectó un dispositivo autorizado. Usa "honor detect" primero.');
        process.exit(1);
    }

    const backupDir = path.join(process.cwd(), 'backups', activeDevice.id);
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }

    const spinner = ora('Verificando acceso de root por ADB...').start();
    const isRooted = await adb.checkRoot();

    if (!isRooted) {
        spinner.fail(chalk.red('Se requiere acceso Root para hacer backup de particiones directamente via ADB.'));
        logger.warn('Para hacer backup sin root, debes reiniciar en modo Fastboot o TWRP.');
        console.log(chalk.cyan('\n¿Deseas reiniciar en Bootloader/Fastboot ahora para continuar el backup?'));
        console.log(chalk.white('Ejecuta: ') + chalk.yellow('adb reboot bootloader'));
        process.exit(1);
    }

    spinner.succeed('Acceso Root confirmado.');

    const partitions = [
        { name: 'boot', path: '/dev/block/by-name/boot' },
        { name: 'recovery', path: '/dev/block/by-name/recovery' },
        { name: 'vbmeta', path: '/dev/block/by-name/vbmeta' }
    ];

    console.log(chalk.cyan('\nIniciando extracción de particiones...'));

    for (const part of partitions) {
        const partSpinner = ora(`Extrayendo partición: ${part.name}`).start();
        try {
            // Verificar si la partición existe
            const exists = await adb.run(`shell "su -c 'ls ${part.path}'"`);
            if (exists.includes('No such file')) {
                partSpinner.warn(`Partición ${part.name} no encontrada. Saltando.`);
                continue;
            }

            const outFilePath = path.join(backupDir, `${part.name}.img`);

            // Copiar la partición a un lugar accesible en el dispositivo
            await adb.run(`shell "su -c 'dd if=${part.path} of=/sdcard/${part.name}.img'"`);

            // Traer el archivo a la PC
            await adb.run(`pull /sdcard/${part.name}.img "${outFilePath}"`);

            // Limpiar el dispositivo
            await adb.run(`shell "su -c 'rm /sdcard/${part.name}.img'"`);

            partSpinner.succeed(`Backupeado: ${part.name}.img -> ${outFilePath}`);
        } catch (error) {
            partSpinner.fail(`Error al extraer ${part.name}: ${error.message}`);
        }
    }

    logger.success(`Proceso de backup finalizado. Revisa la carpeta: ${backupDir}`);
};
