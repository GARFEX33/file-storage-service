import winston from 'winston';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Formato personalizado para los logs
const logFormat = printf(({ level, message, timestamp: ts, stack }) => {
  return `${ts} ${level}: ${stack || message}`;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    colorize(),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }), // Para que el stack trace se imprima si está disponible
    logFormat
  ),
  transports: [
    new winston.transports.Console(),
    // Se podrían añadir transportes a archivos aquí si es necesario
    // new winston.transports.File({ filename: 'error.log', level: 'error' }),
    // new winston.transports.File({ filename: 'combined.log' }),
  ],
  exceptionHandlers: [ // Para capturar excepciones no manejadas
    new winston.transports.Console(),
    // new winston.transports.File({ filename: 'exceptions.log' })
  ],
  rejectionHandlers: [ // Para capturar promesas no manejadas
    new winston.transports.Console(),
    // new winston.transports.File({ filename: 'rejections.log' })
  ]
});

export default logger;