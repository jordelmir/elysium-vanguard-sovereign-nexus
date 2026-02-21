#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const detectCmd = require('./commands/detect');
const backupCmd = require('./commands/backup');
const rootCmd = require('./commands/root');
const audit = require('./commands/audit');
const optimize = require('./commands/optimize');
const termuxSetup = require('./commands/termux');
const samsung = require('./commands/samsung');
const modules = require('./commands/modules');

const program = new Command();

program
    .name('honor')
    .description('Herramienta profesional para rooteo y gestión de Honor Magic V2')
    .version('1.0.0');

program
    .command('detect')
    .description('Detecta el dispositivo conectado y muestra información técnica')
    .action(detectCmd);

program
    .command('backup')
    .description('Realiza un backup de las particiones críticas (Requiere Root)')
    .action(backupCmd);

program
    .command('root')
    .description('Inicia el proceso de rooteo automatizado')
    .action(rootCmd);

program
    .command('audit')
    .description('Realiza una auditoría de seguridad profunda (Requiere Root)')
    .action(auditCmd);

program
    .command('optimize')
    .description('Optimiza el rendimiento y aplica perfiles de overclock')
    .option('-d, --debloat', 'Elimina bloatware de Honor para liberar RAM')
    .option('-o, --overclock', 'Aplica perfiles de alto rendimiento (Mejor con Root)')
    .option('-f, --force-120hz', 'Fuerza 120Hz constantes sin LTPO dinámico')
    .option('-m, --max-power', 'Fuerza el CPU/GPU a su estado de mayor rendimiento')
    .option('-l, --low-latency', 'Optimiza la red para reducir el lag en juegos online')
    .option('-p, --productivity', 'Habilita multiventana forzada y modo escritorio experimental')
    .option('-s, --stealth', 'Oculta las opciones de desarrollador para evitar detecciones (BCR, Bancos)')
    .action(optimizeCmd);

program
    .command('termux-setup')
    .description('Prepara el dispositivo para compilar APKs y Web Apps en Termux')
    .action(termuxCmd);

program
    .command('samsung-prime')
    .description('Optimización extrema para Samsung Galaxy A10 (Performance, 0.15x, Stealth)')
    .option('-s, --stealth', 'Finaliza y oculta el modo desarrollo para BCR')
    .action(samsungCmd);

// Aquí añadiremos los demás comandos luego (modules, dashboard)

// Mostrar ayuda por defecto si no se pasan argumentos
if (!process.argv.slice(2).length) {
    console.log(chalk.magenta.bold('\n👑 Honor Root Toolkit - Desarrollado por un Ingeniero Top Mundial\n'));
    program.outputHelp();
    process.exit(1);
}

program
    .command('modules <action> [param]')
    .description('Gestionar módulos Magisk (list, install, remove)')
    .action((action, param) => modules(action, param));

program.parse(process.argv);
