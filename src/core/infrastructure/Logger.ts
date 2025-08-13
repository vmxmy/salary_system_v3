/**
 * 日志记录器
 * 
 * 提供统一的日志记录接口
 * 支持不同级别的日志和结构化日志
 */

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    FATAL = 4
}

export interface LogContext {
    userId?: string;
    requestId?: string;
    module?: string;
    action?: string;
    [key: string]: any;
}

export interface ILogger {
    debug(message: string, context?: LogContext): void;
    info(message: string, context?: LogContext): void;
    warn(message: string, context?: LogContext): void;
    error(message: string, context?: LogContext): void;
    fatal(message: string, context?: LogContext): void;
}

/**
 * 日志记录器实现
 */
export class Logger implements ILogger {
    private static instance: Logger;
    private level: LogLevel = LogLevel.INFO;
    private handlers: LogHandler[] = [];
    
    private constructor() {
        // 默认添加控制台处理器
        this.addHandler(new ConsoleLogHandler());
    }
    
    static getInstance(): Logger {
        if (!this.instance) {
            this.instance = new Logger();
        }
        return this.instance;
    }
    
    setLevel(level: LogLevel): void {
        this.level = level;
    }
    
    addHandler(handler: LogHandler): void {
        this.handlers.push(handler);
    }
    
    removeHandler(handler: LogHandler): void {
        const index = this.handlers.indexOf(handler);
        if (index > -1) {
            this.handlers.splice(index, 1);
        }
    }
    
    debug(message: string, context?: LogContext): void {
        this.log(LogLevel.DEBUG, message, context);
    }
    
    info(message: string, context?: LogContext): void {
        this.log(LogLevel.INFO, message, context);
    }
    
    warn(message: string, context?: LogContext): void {
        this.log(LogLevel.WARN, message, context);
    }
    
    error(message: string, context?: LogContext): void {
        this.log(LogLevel.ERROR, message, context);
    }
    
    fatal(message: string, context?: LogContext): void {
        this.log(LogLevel.FATAL, message, context);
    }
    
    private log(level: LogLevel, message: string, context?: LogContext): void {
        if (level < this.level) {
            return;
        }
        
        const logEntry: LogEntry = {
            timestamp: new Date(),
            level,
            message,
            context
        };
        
        for (const handler of this.handlers) {
            handler.handle(logEntry);
        }
    }
}

/**
 * 日志条目
 */
export interface LogEntry {
    timestamp: Date;
    level: LogLevel;
    message: string;
    context?: LogContext;
}

/**
 * 日志处理器基类
 */
export abstract class LogHandler {
    abstract handle(entry: LogEntry): void;
    
    protected formatEntry(entry: LogEntry): string {
        const levelStr = LogLevel[entry.level];
        const timestamp = entry.timestamp.toISOString();
        const contextStr = entry.context ? JSON.stringify(entry.context) : '';
        
        return `[${timestamp}] [${levelStr}] ${entry.message} ${contextStr}`;
    }
}

/**
 * 控制台日志处理器
 */
export class ConsoleLogHandler extends LogHandler {
    handle(entry: LogEntry): void {
        const formatted = this.formatEntry(entry);
        
        switch (entry.level) {
            case LogLevel.DEBUG:
                console.debug(formatted);
                break;
            case LogLevel.INFO:
                console.info(formatted);
                break;
            case LogLevel.WARN:
                console.warn(formatted);
                break;
            case LogLevel.ERROR:
            case LogLevel.FATAL:
                console.error(formatted);
                break;
        }
    }
}

/**
 * 文件日志处理器（浏览器环境下保存到IndexedDB）
 */
export class FileLogHandler extends LogHandler {
    private buffer: LogEntry[] = [];
    private bufferSize = 100;
    private dbName = 'ApplicationLogs';
    private storeName = 'logs';
    
    constructor(bufferSize?: number) {
        super();
        if (bufferSize) {
            this.bufferSize = bufferSize;
        }
        this.initDB();
    }
    
    handle(entry: LogEntry): void {
        this.buffer.push(entry);
        
        if (this.buffer.length >= this.bufferSize) {
            this.flush();
        }
    }
    
    private async initDB(): Promise<void> {
        if (typeof indexedDB === 'undefined') {
            return;
        }
        
        const request = indexedDB.open(this.dbName, 1);
        
        request.onupgradeneeded = (event) => {
            const db = (event.target as any).result;
            if (!db.objectStoreNames.contains(this.storeName)) {
                db.createObjectStore(this.storeName, { 
                    keyPath: 'id', 
                    autoIncrement: true 
                });
            }
        };
    }
    
    private async flush(): Promise<void> {
        if (this.buffer.length === 0) {
            return;
        }
        
        try {
            const db = await this.openDB();
            const transaction = db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            
            for (const entry of this.buffer) {
                store.add({
                    ...entry,
                    timestamp: entry.timestamp.toISOString()
                });
            }
            
            this.buffer = [];
        } catch (error) {
            console.error('Failed to flush logs to IndexedDB:', error);
        }
    }
    
    private openDB(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
}

/**
 * 远程日志处理器（发送到服务器）
 */
export class RemoteLogHandler extends LogHandler {
    private buffer: LogEntry[] = [];
    private bufferSize = 50;
    private endpoint: string;
    private flushInterval: number = 30000; // 30秒
    private timer?: NodeJS.Timeout;
    
    constructor(endpoint: string, bufferSize?: number, flushInterval?: number) {
        super();
        this.endpoint = endpoint;
        
        if (bufferSize) {
            this.bufferSize = bufferSize;
        }
        
        if (flushInterval) {
            this.flushInterval = flushInterval;
        }
        
        this.startTimer();
    }
    
    handle(entry: LogEntry): void {
        this.buffer.push(entry);
        
        if (this.buffer.length >= this.bufferSize) {
            this.flush();
        }
    }
    
    private startTimer(): void {
        this.timer = setInterval(() => {
            this.flush();
        }, this.flushInterval);
    }
    
    private async flush(): Promise<void> {
        if (this.buffer.length === 0) {
            return;
        }
        
        const logs = [...this.buffer];
        this.buffer = [];
        
        try {
            await fetch(this.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    logs: logs.map(entry => ({
                        ...entry,
                        timestamp: entry.timestamp.toISOString(),
                        level: LogLevel[entry.level]
                    }))
                })
            });
        } catch (error) {
            console.error('Failed to send logs to remote server:', error);
            // 可以考虑将失败的日志重新加入buffer
        }
    }
    
    destroy(): void {
        if (this.timer) {
            clearInterval(this.timer);
        }
        this.flush();
    }
}