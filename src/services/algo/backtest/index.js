import { fetchCandlesBeforeDate } from '../../utils/index.js';
import moment from 'moment';
import { executeAlgo } from '../index.js';
import ccxt from 'ccxt';
import logger from '../../../services/logger/index.js';


export const mainFuncForBacktest = async function(data) {
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
            const fetchedData = await fetchCandlesBeforeDate(exchange, symbol.symbolPair, timeframe, new Date(date), 14);
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

export const checkResult = async function(data) {
    try {
        logger.debug({ data })
        const onlyOpenPositions = data.filter(trade => trade.result !== null);
        if (onlyOpenPositions.length === 0) {
            return {
                totalTrades: 0,
                percentageWinningTrades: 0,
                percentageLosingTrades: 0,
                profitFactor: 0,
                expectedPayoff: 0
            }
        }
        const totalTrades = onlyOpenPositions.length;
        const winningTrades = onlyOpenPositions.filter(trade => trade.result === 'win').length;
        const losingTrades = onlyOpenPositions.filter(trade => trade.result === 'loss').length;
        const percentageWinningTrades = (winningTrades / totalTrades) * 100;
        const percentageLosingTrades = (losingTrades / totalTrades) * 100;
        const profitFactor = winningTrades / losingTrades;
        const expectedPayoff = (percentageWinningTrades * profitFactor) - (percentageLosingTrades);
        return {
            totalTrades,
            percentageWinningTrades,
            percentageLosingTrades,
            profitFactor,
            expectedPayoff
        };
    } catch (e) {
        throw new Error(e);
    }
}

// region Utils Func
const calculateRangeBasedByTimeframe = async (dateFrom, dateTo, timeframe) => {
    try {
        const range = [];
        let currentDate = moment(dateFrom); // Assicurati che sia un clone se dateFrom è un oggetto Moment
        const minutesToAdd = extractCorrectTimeframe(timeframe);
        while (currentDate.isBefore(dateTo)) {
            range.push(moment(currentDate)); // Clona l'oggetto data prima di pusharlo
            currentDate.add(minutesToAdd, 'minutes'); // Moment modifica l'oggetto "in place"
        }
        return range;
    } catch (e) {
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
                return 1;
        }
    } catch (e) {
        new Error(e)
    }
}
// endregion