const fs = require('fs');
const path = require('path');

class Logger {
    constructor() {
        this.logDir = path.join(__dirname, '../logs');
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
        this.cleanOldLogs();
    }
    
    cleanOldLogs() {
        try {
            const files = fs.readdirSync(this.logDir);
            const now = Date.now();
            const maxAge = 30 * 24 * 60 * 60 * 1000;
            
            files.forEach(file => {
                const filePath = path.join(this.logDir, file);
                const stats = fs.statSync(filePath);
                if (now - stats.mtimeMs > maxAge) {
                    fs.unlinkSync(filePath);
                }
            });
        } catch (error) {}
    }
    
    getLogFile() {
        const date = new Date().toISOString().split('T')[0];
        return path.join(this.logDir, `${date}.log`);
    }
    
    log(message, type = 'INFO', data = null) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${type}] ${message}${data ? '\n' + JSON.stringify(data, null, 2) : ''}\n`;
        
        const colors = {
            INFO: '\x1b[36m',
            WARN: '\x1b[33m',
            ERROR: '\x1b[31m',
            SUCCESS: '\x1b[32m',
            DEBUG: '\x1b[35m'
        };
        
        const reset = '\x1b[0m';
        const color = colors[type] || colors.INFO;
        console.log(`${color}${logMessage.trim()}${reset}`);
        
        try {
            fs.appendFileSync(this.getLogFile(), logMessage);
        } catch (error) {}
    }
    
    info(message, data = null) { this.log(message, 'INFO', data); }
    warn(message, data = null) { this.log(message, 'WARN', data); }
    error(message, data = null) { this.log(message, 'ERROR', data); }
    success(message, data = null) { this.log(message, 'SUCCESS', data); }
    debug(message, data = null) {
        if (process.env.NODE_ENV === 'development') {
            this.log(message, 'DEBUG', data);
        }
    }
}

module.exports = new Logger();