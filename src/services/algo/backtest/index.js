import { fetchCandlesBeforeDate } from '../../utils/index.js';
import moment from 'moment-timezone';
import { executeAlgo } from '../index.js';
import ccxt from 'ccxt';
import logger from '../../../services/logger/index.js';
import Joi from 'joi';
import _ from 'lodash';
import { getHistoricalRates } from 'dukascopy-node';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import pkg from 'bluebird';

const { Promise } = pkg;


export const mainFuncForBacktest = async function(data) {
    const { dateFrom, dateTo, timeframe, symbol, algorithm, candlePeriods } = data;
    // Recupera i dati storici con il buffer
    const historicalData = await getHistoricalRatesWithBuffer(symbol, dateFrom, dateTo, timeframe, 'json', candlePeriods);
    if (historicalData.length === 0) {
        throw new Error('No data found')
    }

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
    dataPeriods.shift()
    const results = [];
    for (const periodData of dataPeriods) {
        const result = await executeAlgo(periodData, algorithm);
        results.push({
            timestampOpenPosition: periodData[periodData.length - 1]?.timestamp, //Ora del'apertura dell'operazione
            // open: periodData[periodData.length - 1].open,
            // close: periodData[periodData.length - 1].close,
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
                calculateOutcome: {
                    candlePeriods,
                    percentageWinningTrades: 0,
                    percentageLosingTrades: 0,
                    totalTrades: 0,
                    profitFactor: 0,
                    pips: 0,
                    win: 0,
                    loss: 0
                },
                positions: [],
            }
        }
        let win = 0;
        let loss = 0;
        let pips = 0;
        for (const trade of res) {
            try {
                if (trade.outcome === 'Win') {
                    win++;
                } else if (trade.outcome === 'Loss') {
                    loss++;
                }
                if (!_.isNil(trade.pips)) {
                    console.log(trade.pips, 'pips')
                    pips += parseInt(trade.pips);
                } else {
                    logger.debug(`Trade without pips ${trade}`)
                }
            } catch (e) {
                console.log(e, 'pips stronza', trade)
            }
        }

        const percentageWinningTrades = (win / (win + loss)) * 100;
        const percentageLosingTrades = (loss / (win + loss)) * 100;
        const totalTrades = win + loss;
        const profitFactor = win / loss;
        return {
            calculateOutcome: {
                candlePeriods,
                percentageWinningTrades,
                percentageLosingTrades,
                totalTrades,
                profitFactor,
                pips,
                win,
                loss
            },
            positions: await Promise.map(res, async trade => {
                return {
                    openTimestamp: moment.utc(trade.enterDate).valueOf(),
                    closeTimestamp: moment.utc(trade.outcomeDate).valueOf(),
                    entryPrice: trade.entry,
                    closePrice: trade.closePrice,
                    result: _.lowerCase(trade.outcome)
                }
            })
        }
    } catch (e) {
        throw new Error(e);
    }
}

export const outputBacktestSchema = Joi.array().items(Joi.object({
    timestampOpenPosition: Joi.number().required(),
    result: Joi.alternatives().try(
        Joi.object({
            operation: Joi.string().required() || null,
            entry: Joi.number().required(),
            tp: Joi.number().required(),
            percent_tp: Joi.number(),
            sl: Joi.number().required(),
            percent_sl: Joi.number(),
        }),
        Joi.valid(null)
    )
}));
// region Utils Func

// date is a moment date
export const isTradingTime = (date) => {
    const dayOfWeek = date.day();
    const hour = date.hour();

    if (dayOfWeek === 6) return false;
    if (dayOfWeek === 5 && hour >= 22) return false;
    if (dayOfWeek === 0 && hour < 22) return false;

    return true;
};

function extractDataPeriods(data, startDate, candlesPerPeriod) {
    const periods = [];
    const dataSize = data.length;
    logger.debug({ startDate: moment(startDate) })

    // Trova l'indice della data di inizio nel tuo array di dati
    const startDateIndex = data.findIndex(candle => moment(candle?.timestamp).isSame(moment(startDate)));

    // Verifica se la data di inizio è stata trovata
    if (startDateIndex === -1) {
        throw new Error(`La data di inizio non è stata trovata nell'array di dati ${moment(startDate)}`);
    }

    let startIndex = startDateIndex; // Indice dell'inizio del primo periodo
    let endIndex = parseInt(startIndex) - parseInt(candlesPerPeriod); // Indice della fine del primo periodo

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
    if (futureData.length === 0) {
        throw new Error('No future data found')
    }
    for (const trade of trades) {
        const { timestampOpenPosition, result } = trade;
        const { operation, entry, tp, sl } = result;

        try {
            const endIndex = futureData.findIndex(candle => moment(candle.timestamp).isSame(moment(timestampOpenPosition)));

            if (endIndex !== -1) {
                let outcome = 'No Outcome';
                let outcomeDate = null;
                let closePrice = null;
                let pips = 0;

                // Cerca la data di chiusura del trade nei dati futuri
                for (let i = endIndex + 1; i < futureData.length; i++) {
                    try {
                        const { timestamp, open, high, low, close, volume } = futureData[i];

                        if (operation === 'buy' && high >= tp) {
                            outcome = 'Win';
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
                            outcome = 'Win';
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
                    } catch (e) {
                        console.log(e, futureData[i])
                    }
                }
                results.push({
                    operation,
                    outcome,
                    enterDate: moment(timestampOpenPosition).utc().format('YYYY-MM-DD HH:mm'),
                    outcomeDate: moment(outcomeDate).utc().format('YYYY-MM-DD HH:mm'),
                    entry,
                    closePrice,
                    sl,
                    tp,
                    pips: outcome === 'No Outcome' ? null : parseFloat(pips).toFixed(2),
                    details: outcome === 'No Outcome'
                        ? 'Neither stop loss nor take profit was reached within the available data.'
                        : `The trade reached ${outcome} at ${moment(outcomeDate).utc().format('YYYY-MM-DD HH:mm')} with a close price of ${closePrice}, resulting in ${pips.toFixed(2)} pips.`
                });
            } else {
                results.push({
                    timestampOpenPosition,
                    error: 'Failed to find the closing date in historical data.'
                });
            }
        } catch (error) {
            console.error(`Error fetching data for ${timestampOpenPosition}: ${error.message}`);
            results.push({
                timestampOpenPosition,
                error: `Failed to fetch or process data: ${error.message}`
            });
        }
    }

    return results;
}


const getHistoricalRatesWithBuffer = async (symbol, from, to, timeframe, format, bufferCandles = 0) => {
    try {
        //Ho un numero di candele che mi interessano, bene, prendo e moltiplico per due per stare largo
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
        const fromWithBuffer = moment(from).subtract(bufferCandles * 2 * timeframeInMilliseconds, 'milliseconds').utc();
        const toWithBuffer = moment(to).add(1 * timeframeInMilliseconds, 'milliseconds').utc();

        const dataWithBuffer = await getHistoricalRates({
            instrument: symbol.symbolPair ? _.split(symbol.symbolPair, '/').join('').toLowerCase() : symbol,
            dates: {
                from: fromWithBuffer.toDate(),
                to: toWithBuffer.toDate()
            },
            ignoreFlats: true,
            timeframe: convertTimeFrameForDukascopy(timeframe),
            format,
            useCache: true,
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

export const convertTimeFrameForDukascopy = (timeframe) => {
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
