const chalk = require('chalk');

const logger = {
    info: (message) => {
        console.log(chalk.blue('ℹ INFO: ') + message);
    },
    success: (message) => {
        console.log(chalk.green('✔ SUCCESS: ') + message);
    },
    warn: (message) => {
        console.log(chalk.yellow('⚠ WARNING: ') + message);
    },
    error: (message) => {
        console.log(chalk.red('✖ ERROR: ') + message);
    },
    title: (message) => {
        console.log('\n' + chalk.bgMagenta.white.bold(` ${message} `) + '\n');
    },
    step: (message) => {
        console.log(chalk.cyan('➜ ') + message);
    }
};

module.exports = logger;
