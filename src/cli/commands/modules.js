const ora = require('ora');
const chalk = require('chalk');
const adb = require('../utils/adb');
const logger = require('../utils/logger');

module.exports = async (action, modulePath) => {
    const isRooted = await adb.checkRoot();
    if (!isRooted) {
        logger.error('Se requieren privilegios ROOT para gestionar módulos Magisk.');
        process.exit(1);
    }

    switch (action) {
        case 'list':
            const lSpinner = ora('Obteniendo lista de módulos Magisk...').start();
            try {
                // Magisk guarda los módulos en /data/adb/modules
                const list = await adb.run('shell "su -c ls /data/adb/modules"');
                lSpinner.succeed('Módulos instalados:');
                if (list.trim()) {
                    list.split('\n').forEach(m => console.log(chalk.cyan(`  • ${m.trim()}`)));
                } else {
                    console.log(chalk.yellow('  No hay módulos instalados.'));
                }
            } catch (e) {
                lSpinner.fail('Error al listar módulos: ' + e.message);
            }
            break;

        case 'install':
            if (!modulePath) {
                logger.error('Debes proporcionar la ruta al archivo .zip del módulo.');
                return;
            }
            const iSpinner = ora(`Instalando módulo: ${modulePath}...`).start();
            try {
                const targetPath = `/data/local/tmp/module.zip`;
                await adb.run(`push ${modulePath} ${targetPath}`);
                await adb.run(`shell "su -c 'magisk --install-module ${targetPath}'"`);
                iSpinner.succeed('Módulo instalado correctamente. Reinicia para aplicar cambios.');
            } catch (e) {
                iSpinner.fail('Fallo en la instalación: ' + e.message);
            }
            break;

        case 'remove':
            if (!modulePath) {
                logger.error('Debes proporcionar el ID del módulo a eliminar.');
                return;
            }
            const rSpinner = ora(`Eliminando módulo: ${modulePath}...`).start();
            try {
                await adb.run(`shell "su -c 'rm -rf /data/adb/modules/${modulePath}'"`);
                rSpinner.succeed('Módulo marcado para eliminación. Reinicia el dispositivo.');
            } catch (e) {
                rSpinner.fail('Error al eliminar módulo.');
            }
            break;

        default:
            logger.info('Uso: honor modules <list|install|remove> [path/id]');
    }
};
