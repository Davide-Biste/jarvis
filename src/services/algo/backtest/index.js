import { fetchCandlesBeforeDate } from '../../utils/index.js';
import moment from 'moment-timezone';
import { executeAlgo } from '../index.js';
import ccxt from 'ccxt';
import logger from '../../../services/logger/index.js';
import Joi from 'joi';
import _ from 'lodash';
import { getHistoricalRates } from 'dukascopy-node';


export const mainFuncForBacktest = async function(data, limit) {
    const { dateFrom, dateTo, timeframe, symbol, algorithm, candlePeriods } = data;
    // Recupera i dati storici con il buffer
    const historicalData = await getHistoricalRatesWithBuffer(symbol, dateFrom, dateTo, timeframe, 'json');

    // Determina l'incremento basato sul timeframe
    const increment = {
        '1m': 1,
        '15m': 15,
        '1h': 60,
        '4h': 240,
        '1d': 1440
    }[timeframe];

    if (!increment) {
        throw new Error(`Unsupported timeframe: ${timeframe}`);
    }

    const dataPeriods = extractDataPeriods(historicalData, dateFrom, candlePeriods);
    const results = [];
    for (const periodData of dataPeriods) {
        const result = await executeAlgo(periodData, algorithm);
        results.push({
            periodData: periodData.length,
            start: moment(periodData[0].timestamp).format('YYYY-MM-DD HH:mm'),
            end: moment(periodData[periodData.length - 1].timestamp).format('YYYY-MM-DD HH:mm'),
            result,
        });
    }
    return results;
}

export const checkResult = async function(data, symbol, candlePeriods, dateFrom, dateTo, marginDays) {
    try {
        const onlyOpenPositions = data.filter(trade => trade.result !== null);
        const res = await checkTradeOutcomes(onlyOpenPositions, symbol, dateFrom, dateTo, marginDays);
        if (res.length === 0) {
            return {
                candlePeriods,
                percentageWinningTrades: 0,
                percentageLosingTrades: 0,
                totalTrades: 0,
                profitFactor: 0,
                pips: 0,
                win: 0,
                loss: 0
            }
        }
        let win = 0;
        let loss = 0;
        let pips = 0;
        for (const trade of res) {
            if (trade.outcome === 'Profit') {
                win++;
            } else if (trade.outcome === 'Loss') {
                loss++;
            }
            if (trade.pips !== null) {
                pips += parseInt(trade.pips);
            } else {
                logger.debug(`Trade without pips ${trade}`)
            }
        }

        const percentageWinningTrades = (win / (win + loss)) * 100;
        const percentageLosingTrades = (loss / (win + loss)) * 100;
        const totalTrades = win + loss;
        const profitFactor = win / loss;
        return {
            candlePeriods,
            percentageWinningTrades,
            percentageLosingTrades,
            totalTrades,
            profitFactor,
            pips,
            win,
            loss
        }
    } catch (e) {
        throw new Error(e);
    }
}


// export const outputBacktestSchema = Joi.array().items(Joi.object({
//     date: Joi.string().required(),
//     result: Joi.alternatives().try(
//         Joi.object({
//             action: Joi.string().required(),
//             entryPrice: Joi.number().required(),
//             stopLoss: Joi.number().required(),
//             takeProfit: Joi.number().required(),
//             recommendation: Joi.string().required()
//         }),
//         Joi.valid(null)
//     )
// }));
export const outputBacktestSchema = Joi.array().items(Joi.object({
    date: Joi.string().required(),
    result: Joi.alternatives().try(
        Joi.object({
            operation: Joi.string().required(),
            entry: Joi.number().required(),
            tp: Joi.number().required(),
            percent_tp: Joi.number().required(),
            sl: Joi.number().required(),
            percent_sl: Joi.number().required(),
        }),
        Joi.valid(null)
    )
}));
// region Utils Func

const extractCorrectTimeframe = (timeframe) => {
    try {
        switch (timeframe) {
            case '1m':
                return 1;
            case '5m':
                return 5;
            case '15m':
                return 15;
            case '1h':
                return 60;
            case '4h':
                return 240;
            case '1d':
                return 1440;
            default:
                throw Error('Invalid timeframe')
        }
    } catch (e) {
        new Error(e)
    }
}

// date is a moment date
const isTradingTime = (date) => {
    const dayOfWeek = date.day();
    const hour = date.hour();

    if (dayOfWeek === 6) return false;
    if (dayOfWeek === 5 && hour >= 22) return false;
    if (dayOfWeek === 0 && hour < 22) return false;

    return true;
};

function extractDataPeriods(data, startDate, candlesPerPeriod = 14) {
    const periods = [];
    const dataSize = data.length;

    // Trova l'indice della data di inizio nel tuo array di dati
    const startDateIndex = data.findIndex(candle => moment(candle.timestamp).isSame(moment(startDate)));

    // Verifica se la data di inizio è stata trovata
    if (startDateIndex === -1) {
        throw new Error('La data di inizio non è stata trovata nell\'array di dati');
    }

    let startIndex = startDateIndex; // Indice dell'inizio del primo periodo
    let endIndex = startIndex - candlesPerPeriod; // Indice della fine del primo periodo

    // Ciclo attraverso i dati estraendo i periodi
    while (startIndex <= dataSize) {
        const periodData = data.slice(endIndex, startIndex);
        periods.push(periodData); // Inserisce il periodo di dati nell'array

        // Aggiorna gli indici per il prossimo periodo
        startIndex++; // Aggiorna l'indice di inizio
        endIndex++; // Aggiorna l'indice di fine
    }

    return periods;
}

async function checkTradeOutcomes(trades, symbol, dateFrom, dateTo, marginDays) {
    const results = [];
    const futureData = await getHistoricalRatesWithBuffer(symbol, dateFrom, moment(dateTo).add(marginDays, 'days').toDate(), '1m', 'json');

    for (const trade of trades) {
        const { end, result } = trade;
        const { operation, entry, tp, sl } = result;

        try {
            const endIndex = futureData.findIndex(candle => moment(candle.timestamp).isSame(moment(end)));

            if (endIndex !== -1) {
                let outcome = 'No Outcome';
                let outcomeDate = null;
                let closePrice = null;
                let pips = 0;

                // Cerca la data di chiusura del trade nei dati futuri
                for (let i = endIndex + 1; i < futureData.length; i++) {
                    const { timestamp, open, high, low, close, volume } = futureData[i];

                    if (operation === 'buy' && high >= tp) {
                        outcome = 'Profit';
                        outcomeDate = timestamp;
                        closePrice = tp;
                        pips = (tp - entry) * 10000;
                        break;
                    } else if (operation === 'buy' && low <= sl) {
                        outcome = 'Loss';
                        outcomeDate = timestamp;
                        closePrice = sl;
                        pips = -(entry - sl) * 10000;
                        break;
                    } else if (operation === 'sell' && low <= tp) {
                        outcome = 'Profit';
                        outcomeDate = timestamp;
                        closePrice = tp;
                        pips = (entry - tp) * 10000;
                        break;
                    } else if (operation === 'sell' && high >= sl) {
                        outcome = 'Loss';
                        outcomeDate = timestamp;
                        closePrice = sl;
                        pips = -(sl - entry) * 10000;
                        break;
                    }
                }

                results.push({
                    operation,
                    outcome,
                    enterDate: moment(end).utc().format('YYYY-MM-DD HH:mm'),
                    outcomeDate: moment(outcomeDate).utc().format('YYYY-MM-DD HH:mm'),
                    entry,
                    closePrice,
                    sl,
                    tp,
                    pips: outcome === 'No Outcome' ? null : pips.toFixed(2),
                    details: outcome === 'No Outcome'
                        ? 'Neither stop loss nor take profit was reached within the available data.'
                        : `The trade reached ${outcome} at ${moment(outcomeDate).utc().format('YYYY-MM-DD HH:mm')} with a close price of ${closePrice}, resulting in ${pips.toFixed(2)} pips.`
                });
            } else {
                results.push({
                    end,
                    error: 'Failed to find the closing date in historical data.'
                });
            }
        } catch (error) {
            console.error(`Error fetching data for ${end}: ${error.message}`);
            results.push({
                end,
                error: `Failed to fetch or process data: ${error.message}`
            });
        }
    }

    return results;
}


const getHistoricalRatesWithBuffer = async (symbol, from, to, timeframe, format, bufferCandles = 200) => {
    try {
        const timeframeInMilliseconds = {
            '1m': 60000,              // 1 minuto in millisecondi
            '15m': 900000,            // 15 minuti in millisecondi
            '1h': 3600000,            // 1 ora in millisecondi
            '4h': 14400000,           // 4 ore in millisecondi
            '1d': 86400000            // 1 giorno in millisecondi
        }[timeframe];

        if (!timeframeInMilliseconds) {
            throw new Error(`Unsupported timeframe: ${timeframe}`);
        }
        // Calcola il timestamp di inizio per il backtest includendo il buffer
        const fromWithBuffer = moment.tz(from, 'Europe/Rome').subtract(bufferCandles * timeframeInMilliseconds, 'milliseconds');

        const dataWithBuffer = await getHistoricalRates({
            instrument: symbol.symbolPair ? _.split(symbol.symbolPair, '/').join('').toLowerCase() : symbol,
            dates: {
                from: fromWithBuffer.toDate(),
                to: to
            },
            timeframe: convertTimeFrameForDukascopy(timeframe),
            format
        });

        logger.debug({
            first: moment(dataWithBuffer[0].timestamp).tz('Europe/Rome').format('YYYY-MM-DD HH:mm:ss'),
            last: moment(dataWithBuffer[dataWithBuffer.length - 1].timestamp).tz('Europe/Rome').format('YYYY-MM-DD HH:mm:ss')
        })
        return dataWithBuffer;
    } catch (error) {
        logger.error(error);
    }
};

const convertTimeFrameForDukascopy = (timeframe) => {
    switch (timeframe) {
        case '1m':
            return 'm1';
        case '15m':
            return 'm15';
        case '1h':
            return 'h1';
        case '4h':
            return 'h4';
        case '1d':
            return 'd1';
        default:
            throw new Error('Unsupported timeframe');
    }
};
// endregion