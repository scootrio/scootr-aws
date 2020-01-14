const chalk = require('chalk');

const program = 'scootr';
const level = l => '[' + l + ']:';

module.exports = {
  trace(...args) {
    console.log(chalk.gray(program, level('trc'), ...args));
  },

  debug(...args) {
    console.log(program, level(chalk.magenta('dbg')), ...args);
  },

  info(...args) {
    console.log(program, level(chalk.bold.blue('inf')), ...args);
  },

  warn(...args) {
    console.log(program, level(chalk.bold.yellow('wrn')), ...args);
  },

  error(...args) {
    console.error(program, level(chalk.bold.red('err')), ...args);
  }
};
