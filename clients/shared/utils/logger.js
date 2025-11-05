"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.Logger = void 0;
class Logger {
    constructor(context = 'ZippyCoin') {
        this.context = context;
    }
    info(message, data) {
        this.log('INFO', message, data);
    }
    warn(message, data) {
        this.log('WARN', message, data);
    }
    error(message, data) {
        this.log('ERROR', message, data);
    }
    debug(message, data) {
        if (process.env.NODE_ENV === 'development') {
            this.log('DEBUG', message, data);
        }
    }
    log(level, message, data) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            context: this.context,
            message,
            ...(data && { data })
        };
        console.log(JSON.stringify(logEntry));
    }
}
exports.Logger = Logger;
exports.logger = new Logger();
//# sourceMappingURL=logger.js.map