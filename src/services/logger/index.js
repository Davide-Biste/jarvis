import 'dotenv/config';
import winston from 'winston';
import chalk from 'chalk';

const logLevel = process.env.LOG_LEVEL || 'info'; // Se LOG_LEVEL non è impostato, default a 'info'

const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'white',
    debug: 'magenta',
};

winston.addColors(colors);

// Crea un formato personalizzato che includa il colore e il timestamp
const customFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(
        (info) => {
            const { timestamp, level, message } = info;
            const colorize = chalk[colors[level]] || chalk.white;
            return `${chalk.gray(timestamp)} ${colorize(level.toUpperCase())}: ${JSON.stringify(message)}`;
        }
    )
);

// Crea un logger con due trasporti: Console e File
const logger = winston.createLogger({
    levels: winston.config.npm.levels,
    format: customFormat,
    transports: [
        new winston.transports.Console({
            level: logLevel,
        }),
        // // Se desideri che anche il file rispetti il livello LOG_LEVEL, configuralo di conseguenza
        // new winston.transports.File({
        //     filename: 'combined.log',
        //     level: logLevel, // Usa il valore di LOG_LEVEL qui se necessario
        // }),
    ],
});

export default logger;

// Usa il logger nel tuo codice
// logger.error('Questo è un messaggio di errore');
// logger.warn('Questo è un messaggio di warning');
// logger.info('Questo è un messaggio di info');
// logger.debug('Questo è un messaggio di debug');
