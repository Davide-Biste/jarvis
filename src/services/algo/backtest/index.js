import { fetchCandlesBeforeDate } from '../../utils/index.js';
import moment from 'moment-timezone';
import { executeAlgo } from '../index.js';
import ccxt from 'ccxt';
import logger from '../../../services/logger/index.js';
import Joi from 'joi';
import _ from 'lodash';


export const mainFuncForBacktest = async function(data, limit) {
    const { dateFrom, dateTo, timeframe, symbol, algorithm } = data;

    // Calcola il backtest da a
    const start = moment(dateFrom).tz('UTC');
    const end = moment(dateTo).tz('UTC');

    const range = await calculateRangeBasedByTimeframe(start, end, timeframe);
    console.log({ range })

    if (range.length === 0) {
        throw new Error('Invalid date range');
    }

    const results = [];
    const exchange = new ccxt.currencycom();
    for (let currentDate of range) {
        try {
            currentDate = currentDate.tz('UTC');
            logger.debug(`Current date: ${currentDate.format('YYYY-MM-DD HH:mm')}`);
            const fetchedData = await fetchCandlesBeforeDate(exchange, symbol.symbolPair, timeframe, currentDate, limit);
            logger.debug(`Fetched data for ${currentDate.format('YYYY-MM-DD HH:mm')}: ${fetchedData.length} candles`)
            logger.debug(`First candle: ${moment(fetchedData[0][0]).tz('Europe/Rome').format('YYYY-MM-DD HH:mm')}`)
            logger.debug(`Last candle: ${moment(fetchedData[fetchedData.length - 1][0]).tz('Europe/Rome').format('YYYY-MM-DD HH:mm')}`)
            const lastDate = moment(fetchedData[fetchedData.length - 1][0]).tz('UTC');
            if (!lastDate.isSame(currentDate)) {
                logger.debug(`Current Date: ${currentDate}, Fetched date: ${lastDate}`)
                throw Error('Calculated date does not match the fetched data')
            }
            const result = await executeAlgo(fetchedData, algorithm);
            results.push({
                date: currentDate.format('YYYY-MM-DD HH:mm'),
                result,
            });
        } catch (e) {
            logger.error(`Error during market price retrieval or algorithm execution: ${e}`);
            return [];
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
        let win = 0;
        let loss = 0;
        let pips = 0;
        for (const trade of res) {
            if (trade.outcome === 'Profit') {
                win++;
            } else if (trade.outcome === 'Loss') {
                loss++;
            }
            pips += parseInt(trade.pips);
        }
        console.log({ win, loss, pips })

        const percentageWinningTrades = (win / (win + loss)) * 100;
        const percentageLosingTrades = (loss / (win + loss)) * 100;
        const totalTrades = win + loss;
        const profitFactor = win / loss;
        return {
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
        let currentDate = moment(dateFrom).tz('UTC');
        const minutesToAdd = extractCorrectTimeframe(timeframe);
        while (currentDate.isBefore(dateTo)) {
            if (isTradingTime(currentDate)) {
                range.push(moment(currentDate));
            }
            currentDate.add(minutesToAdd, 'minutes');
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

const isTradingTime = (utcDate) => {
    // Controlla che la data fornita sia un oggetto moment UTC
    if (!moment.isMoment(utcDate) || !utcDate.isUTC()) {
        throw new Error('The date must be a moment.js object in UTC');
    }

    const dayOfWeek = utcDate.day(); // 0 è Domenica, 6 è Sabato
    const hour = utcDate.hour();

    // Controlla se è fuori dall'orario di trading UTC
    // Forex Trading è chiuso da Venerdì 22:00 UTC a Domenica 22:00 UTC
    if (dayOfWeek === 6) return false; // Sabato tutto il giorno
    if (dayOfWeek === 5 && hour >= 22) return false; // Venerdì dopo le 22:00 UTC
    if (dayOfWeek === 0 && hour < 22) return false; // Domenica prima delle 22:00 UTC

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

        const { entryPrice, stopLoss, takeProfit, action } = result;
        const since = moment(date).add(1, 'minute').toDate().getTime();

        try {
            const ohlcv = await fetchAllOHLCV(exchange, symbol, '1m', since);
            // for (let i = 0; i < ohlcv.length; i++) {
            //     console.log({ ohlcv: moment(ohlcv[i][0]).utc().format('YYYY-MM-DD HH:mm') })
            // }
            let outcome = 'No Outcome';
            let outcomeDate = null;
            let closePrice = null;
            let pips = 0;
            for (const [time, open, high, low, close, volume] of ohlcv) {
                if (action === 'Buy' && high >= takeProfit) {
                    outcome = 'Profit';
                    outcomeDate = new Date(time).toISOString();
                    closePrice = takeProfit;
                    pips = (takeProfit - entryPrice) * 10000;
                    break;
                } else if (action === 'Buy' && low <= stopLoss) {
                    outcome = 'Loss';
                    outcomeDate = new Date(time).toISOString();
                    closePrice = stopLoss;
                    pips = -(entryPrice - stopLoss) * 10000;
                    break;
                } else if (action === 'Sell' && low <= takeProfit) {
                    outcome = 'Profit';
                    outcomeDate = new Date(time).toISOString();
                    closePrice = takeProfit;
                    pips = (entryPrice - takeProfit) * 10000;
                    break;
                } else if (action === 'Sell' && high >= stopLoss) {
                    outcome = 'Loss';
                    outcomeDate = new Date(time).toISOString();
                    closePrice = stopLoss;
                    pips = -(stopLoss - entryPrice) * 10000;
                    break;
                }
            }

            results.push({
                action,
                outcome,
                enterDate: moment(date).utc().format('YYYY-MM-DD HH:mm'),
                outcomeDate: moment(outcomeDate).utc().format('YYYY-MM-DD HH:mm'),
                entryPrice,
                closePrice,
                stopLoss,
                takeProfit,
                pips: outcome === 'No Outcome' ? null : pips.toFixed(2),
                details: outcome === 'No Outcome'
                    ? 'Neither stop loss nor take profit was reached within the available data.'
                    : `The trade reached ${outcome} at ${outcomeDate} with a close price of ${closePrice}, resulting in ${pips.toFixed(2)} pips.`
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