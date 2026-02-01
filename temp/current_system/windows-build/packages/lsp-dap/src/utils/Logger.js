/**
 * Z-Evo Logger Utility
 * Standardized logging for all LSP-DAP components
 */

class Logger {
    constructor(componentName) {
        this.componentName = componentName;
        this.level = process.env.LOG_LEVEL || 'info';
    }

    debug(message, ...args) {
        if (this.shouldLog('debug')) {
            console.log(`[DEBUG] [${this.componentName}] ${message}`, ...args);
        }
    }

    info(message, ...args) {
        if (this.shouldLog('info')) {
            console.log(`[INFO] [${this.componentName}] ${message}`, ...args);
        }
    }

    warn(message, ...args) {
        if (this.shouldLog('warn')) {
            console.warn(`[WARN] [${this.componentName}] ${message}`, ...args);
        }
    }

    error(message, ...args) {
        if (this.shouldLog('error')) {
            console.error(`[ERROR] [${this.componentName}] ${message}`, ...args);
        }
    }

    shouldLog(level) {
        const levels = ['debug', 'info', 'warn', 'error'];
        const currentLevelIndex = levels.indexOf(this.level);
        const messageLevelIndex = levels.indexOf(level);
        
        return messageLevelIndex >= currentLevelIndex;
    }

    setLevel(level) {
        this.level = level;
    }
}

module.exports = { Logger };
