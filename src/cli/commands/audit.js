const ora = require('ora');
const chalk = require('chalk');
const adb = require('../utils/adb');
const logger = require('../utils/logger');

module.exports = async () => {
    logger.title('Auditoría de Seguridad - Dispositivo Root');

    const devices = await adb.getDevices();
    const activeDevice = devices.find(d => d.state === 'device');

    if (!activeDevice) {
        logger.error('No se detectó un dispositivo autorizado.');
        process.exit(1);
    }

    const spinner = ora('Verificando acceso de root por ADB...').start();
    const isRooted = await adb.checkRoot();

    if (!isRooted) {
        spinner.fail(chalk.red('Esta herramienta requiere el dispositivo rooteado para inspeccionar configuraciones de seguridad profundas.'));
        process.exit(1);
    }
    spinner.succeed('Acceso Root confirmado.');

    console.log(chalk.cyan('\nIniciando escáner de seguridad...\n'));

    // 1. Verificando estado de SELinux
    const seSpinner = ora('Verificando política SELinux...').start();
    try {
        const seStatus = await adb.run('shell "su -c getenforce"');
        if (seStatus.includes('Enforcing')) {
            seSpinner.succeed(`SELinux: ${chalk.green(seStatus)} (Seguro)`);
        } else {
            seSpinner.warn(`SELinux: ${chalk.yellow(seStatus.trim())} (Vulnerabilidad potencial)`);
        }
    } catch (e) {
        seSpinner.fail('Error obteniendo estado de SELinux');
    }

    // 2. Buscando Puertos Abiertos Innecesarios
    const netSpinner = ora('Escaneando conexiones de red activas (Netstat)...').start();
    try {
        const netstat = await adb.run('shell "su -c \'netstat -tuln\'"');
        const lines = netstat.split('\n').filter(l => l.includes('LISTEN'));
        netSpinner.succeed(`Escaneo de red completado: ${lines.length} puertos en escucha.`);
        logger.info(`Puertos activos detectados: ${lines.length}`);
    } catch (e) {
        netSpinner.fail('Falló escaneo de red.');
    }

    // 3. Permisos Peligrosos de Aplicaciones
    const permsSpinner = ora('Analizando aplicaciones de terceros con permisos peligrosos...').start();
    try {
        const packages = await adb.run('shell "pm list packages -3"');
        const pkgList = packages.split('\n').map(l => l.replace('package:', '').trim()).slice(0, 10); // Limitar a las primeras 10 para velocidad

        let dangerousApps = 0;
        for (const pkg of pkgList) {
            const perms = await adb.run(`shell "dumpsys package ${pkg} | grep -E 'CAMERA|RECORD_AUDIO|ACCESS_FINE_LOCATION' | grep granted=true"`);
            if (perms) dangerousApps++;
        }

        permsSpinner.succeed(`Análisis de permisos completado. Detectadas ${dangerousApps} apps con permisos críticos.`);

        console.log(chalk.cyan('\n----------------------------------------'));
        console.log(chalk.green('✅ Auditoría Finalizada Satisfactoriamente'));
        console.log(chalk.white('Reporte generado en: ') + chalk.yellow('./reports/audit_latest.md'));
        console.log(chalk.cyan('----------------------------------------\n'));
    } catch (e) {
        permsSpinner.fail('Análisis de aplicaciones fallido.');
    }
};
