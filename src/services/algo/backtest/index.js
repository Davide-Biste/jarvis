import { fetchCandlesBeforeDate } from '../../utils/index.js';
import moment from 'moment-timezone';
import { executeAlgo } from '../index.js';
import ccxt from 'ccxt';
import logger from '../../../services/logger/index.js';
import Joi from 'joi';
import _ from 'lodash';


export const mainFuncForBacktest = async function(data, limit) {
    const { dateFrom, dateTo, timeframe, symbol, algorithm } = data;

    const start = moment(dateFrom);
    const end = moment(dateTo);

    const range = await calculateRangeBasedByTimeframe(start, end, timeframe);

    if (range.length === 0) {
        throw new Error('Invalid date range');
    }

    const results = [];
    const exchange = new ccxt.currencycom();
    for (const date of range) {
        try {
            const fetchedData = await fetchCandlesBeforeDate(exchange, symbol.symbolPair, timeframe, new Date(date), limit);
            const result = await executeAlgo(fetchedData, algorithm);
            results.push({
                date: moment(fetchedData[fetchedData.length - 1][0]).format('YYYY-MM-DD HH:mm'),
                result,
            });
        } catch (e) {
            logger.error(`Error during market price retrieval or algorithm execution: ${e}`);
            throw e;
        }
    }
    return results;
}

export const checkResult = async function(data, symbol) {
    try {
        const onlyOpenPositions = data.filter(trade => trade.result !== null);

        //check the valid trade if have win position or not
        const res = await checkTradeOutcomes(onlyOpenPositions, symbol);
        console.log({ res })

        // if (onlyOpenPositions.length === 0) {
        //     return {
        //         totalTrades: 0,
        //         percentageWinningTrades: 0,
        //         percentageLosingTrades: 0,
        //         profitFactor: 0,
        //         expectedPayoff: 0
        //     }
        // }
        // const totalTrades = onlyOpenPositions.length;
        // const winningTrades = onlyOpenPositions.filter(trade => trade.result === 'win').length;
        // const losingTrades = onlyOpenPositions.filter(trade => trade.result === 'loss').length;
        // const percentageWinningTrades = (winningTrades / totalTrades) * 100;
        // const percentageLosingTrades = (losingTrades / totalTrades) * 100;
        // const profitFactor = winningTrades / losingTrades;
        // const expectedPayoff = (percentageWinningTrades * profitFactor) - (percentageLosingTrades);
        // return {
        //     totalTrades,
        //     percentageWinningTrades,
        //     percentageLosingTrades,
        //     profitFactor,
        //     expectedPayoff
        // };
    } catch (e) {
        throw new Error(e);
    }
}

export const outputBacktestSchema = Joi.array().items(Joi.object({
    date: Joi.string().required(),
    result: Joi.alternatives().try(
        Joi.object({
            action: Joi.string().required(),
            entryPrice: Joi.number().required(),
            stopLoss: Joi.number().required(),
            takeProfit: Joi.number().required(),
            recommendation: Joi.string().required()
        }),
        Joi.valid(null)
    )
}));
// region Utils Func
const calculateRangeBasedByTimeframe = async (dateFrom, dateTo, timeframe) => {
    try {
        const range = [];
        let currentDate = moment(dateFrom).tz('Europe/Rome'); // Assicurati che sia un clone se dateFrom è un oggetto Moment
        const minutesToAdd = extractCorrectTimeframe(timeframe);
        while (currentDate.isBefore(dateTo)) {
            if (isTradingTime(currentDate)) {
                range.push(moment(currentDate)); // Clona l'oggetto data prima di pusharlo
            }
            currentDate.add(minutesToAdd, 'minutes'); // Moment modifica l'oggetto "in place"
        }
        return range;
    } catch (e) {
        logger.error(`Error during range calculation: ${e}`)
        throw new Error(e)
    }
}

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

const isTradingTime = (date) => {
    // Converti la data in timezone italiana 'Europe/Rome'
    const romeDate = date.tz('Europe/Rome');
    const dayOfWeek = romeDate.day();
    const hour = romeDate.hour();

    // Controlla se è fuori dall'orario di trading
    if (dayOfWeek === 0 && hour < 23) return false; // Domenica prima delle 23:00
    if (dayOfWeek === 5 && hour >= 23) return false; // Venerdì dopo le 23:00
    if (dayOfWeek === 6) return false; // Sabato tutto il giorno

    return true;
};

async function fetchAllOHLCV(exchange, symbol, timeframe, since, limit = 1000) {
    let allData = [];
    let fetching = true;
    while (fetching) {
        const data = await exchange.fetchOHLCV(symbol, timeframe, since, limit);
        if (data.length > 0) {
            allData = allData.concat(data);
            since = data[data.length - 1][0] + 1;  // Aggiorna 'since' al timestamp dell'ultimo elemento
        } else {
            fetching = false;
        }
    }
    return allData;
}

async function checkTradeOutcomes(trades, symbol) {
    const exchange = new ccxt.currencycom();
    await exchange.loadMarkets();

    const results = [];

    for (const trade of trades) {
        const { date, result } = trade;
        if (!result) continue;

        const { entryPrice, stopLoss, takeProfit } = result;
        const since = new Date(date).getTime() + 60000;

        try {
            const ohlcv = await fetchAllOHLCV(exchange, symbol, '1m', since);
            let outcome = 'No Outcome';
            let outcomeTime = null;
            let pips = 0;
            console.log({ ohlcv: ohlcv[0] })
            console.log({ entryPrice, stopLoss, takeProfit })
            for (const [time, open, high, low, close, volume] of ohlcv) {
                if (high >= takeProfit) {
                    outcome = 'Profit';
                    outcomeTime = new Date(time).toISOString();
                    pips = result.action === 'Buy' ? (takeProfit - entryPrice) * 10000 : (entryPrice - takeProfit) * 10000;
                    break;
                } else if (low <= stopLoss) {
                    outcome = 'Loss';
                    outcomeTime = new Date(time).toISOString();
                    pips = result.action === 'Buy' ? (entryPrice - stopLoss) * 10000 : (stopLoss - entryPrice) * 10000;
                    break;
                }
            }

            results.push({
                enterDate: new Date(date).toISOString(),
                outcome,
                outcomeTime,
                pips: outcome === 'No Outcome' ? null : pips.toFixed(2), // Limita la precisione a 2 decimali per i pips
                details: outcome === 'No Outcome'
                    ? 'Neither stop loss nor take profit was reached within the available data.'
                    : `The trade reached ${outcome} at ${outcomeTime} resulting in ${pips.toFixed(2)} pips.`
            });
        } catch (error) {
            console.error(`Error fetching data for ${date}: ${error.message}`);
            results.push({
                date,
                error: `Failed to fetch or process data: ${error.message}`
            });
        }
    }

    return results;
}

// endregion