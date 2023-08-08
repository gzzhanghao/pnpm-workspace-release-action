import chalk from 'chalk';

export function createLogger(name: string) {
  const scope = chalk.gray(`[${name}]`);
  return {
    info: createLogFn(`${chalk.gray('❯')} ${scope}`, console.log),
    succ: createLogFn(`${chalk.green('✔')} ${scope}`, console.log),
    warn: createLogFn(`${chalk.yellow('⚠')} ${scope}`, console.warn),
    fail: createLogFn(`${chalk.red('✗')} ${scope}`, console.error),
  };
}

function createLogFn(prefix: string, logFn: (...args: unknown[]) => void) {
  return (...args: unknown[]) => logFn(prefix, ...args);
}
