import chalk from 'chalk';

type LogLevel = 'info' | 'success' | 'warning' | 'error' | 'debug';

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    let formattedMessage = `${prefix} ${message}`;
    if (data) {
      formattedMessage += ` ${JSON.stringify(data)}`;
    }
    
    return formattedMessage;
  }

  info(message: string, data?: any) {
    if (this.isDevelopment) {
      console.log(chalk.blue(this.formatMessage('info', message, data)));
    }
  }

  success(message: string, data?: any) {
    console.log(chalk.green(this.formatMessage('success', message, data)));
  }

  warning(message: string, data?: any) {
    console.log(chalk.yellow(this.formatMessage('warning', message, data)));
  }

  error(message: string, error?: any) {
    console.error(chalk.red(this.formatMessage('error', message, error?.message || error)));
    if (error?.stack && this.isDevelopment) {
      console.error(chalk.red(error.stack));
    }
  }

  debug(message: string, data?: any) {
    if (this.isDevelopment) {
      console.log(chalk.gray(this.formatMessage('debug', message, data)));
    }
  }

  request(method: string, path: string, status?: number) {
    if (!this.isDevelopment) return;
    
    const statusColor = status && status >= 400 ? chalk.red : status && status >= 300 ? chalk.yellow : chalk.green;
    console.log(`${chalk.cyan(method)} ${path}${status ? ` ${statusColor(status)}` : ''}`);
  }
}

export const logger = new Logger();
