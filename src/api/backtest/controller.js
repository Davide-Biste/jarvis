import { Backtest } from './model.js'
import moment from 'moment';
import _ from 'lodash';
import { Algorithm } from '../algorithm/model.js';
import { Position } from '../position/model.js';
import { Symbols } from '../symbol/model.js';
import {
    checkResult, convertTimeFrameForDukascopy,
    isTradingTime,
    mainFuncForBacktest,
    outputBacktestSchema
} from '../../services/algo/backtest/index.js';
import logger from '../../services/logger/index.js';
import { getHistoricalRates } from 'dukascopy-node';
import { savePositions } from './utils/index.js';


export const actions = {
    getBacktests: async function({ query }, res) {
        try {
            const { limit, page, status } = query;
            const queryToUse = {};
            if (status) queryToUse.status = status;
            const backtests = await Backtest.find(queryToUse)
                .limit(parseInt(limit) || 10)
                .skip(parseInt(page) || 0)
                .sort({ createdAt: -1 })
                .lean();
            return res.status(200).send(backtests);
        } catch (e) {
            logger.error(e);
            return res.status(500).send({ message: e.message ?? e });
        }
    },
    getBacktestById: async function({ params, body }, res) {
        try {
            const foundBacktest = await Backtest.findById(params.id);
            if (_.isNil(foundBacktest)) return res.status(404).send({ message: 'Backtest not found' });
            return res.status(200).send(foundBacktest);
        } catch (e) {
            logger.error(e);
            return res.status(500).send({ message: e.message ?? e });
        }
    },
    getBacktestByAlgoId: async function({ params, body }, res) {
        try {
            const foundAlgo = await Algorithm.findById(params.id);
            if (_.isNil(foundAlgo)) return res.status(404).send({ message: 'Algorithm not found' });
            const backtests = await Backtest.find({ 'inputData.algorithmId': foundAlgo._id }).populate('inputData.symbolId inputData.algorithmId')
                .lean()
            if (backtests.length === 0) return res.status(404).send({ message: 'No backtests found' });
            return res.status(200).send(backtests);
        } catch (e) {
            logger.error(e);
            return res.status(500).send({ message: e.message ?? e });
        }
    },
    getHistoricalData: async function({ query }, res) {
        try {
            let { symbolId, dateFrom, dateTo, timeframe } = query;
            if (!dateFrom || !dateTo || !timeframe || !symbolId) return res.status(400).send({ message: 'Missing parameters' });
            const symbolToUse = await Symbols.findOne({ _id: symbolId }, 'symbolPair').lean();
            if (_.isNil(symbolToUse)) return res.status(400).send({ message: 'Symbol not found' });
            const dateFromToUse = moment(dateFrom).utc();
            const dateToToUse = moment(dateTo).utc();
            if (!dateFromToUse.isValid() || !dateToToUse.isValid()) return res.status(400).send({ message: 'Invalid date format' });
            if (dateFromToUse.isAfter(dateToToUse)) return res.status(400).send({ message: 'dateFrom must be before dateTo' });
            if (dateFromToUse.isAfter(moment())) return res.status(400).send({ message: 'dateFrom must be in the past' });
            if (dateToToUse.isAfter(moment())) return res.status(400).send({ message: 'dateTo must be in the past' });
            if (dateFromToUse.isSame(dateToToUse)) return res.status(400).send({ message: 'dateFrom and dateTo must be different' });
            const historicalData = await getHistoricalRates({
                instrument: _.split(symbolToUse.symbolPair, '/').join('').toLowerCase(),
                dates: {
                    from: dateFromToUse,
                    to: dateToToUse
                },
                timeframe: convertTimeFrameForDukascopy(timeframe),
                format: 'json'
            });
            return res.status(200).send(historicalData);
        } catch (e) {
            logger.error(e);
            return res.status(500).send({ message: e.message ?? e });
        }
    },
    createBacktest: async function({ params, body }, res) {
        try {
            const dateFrom = moment(body.dateFrom).utc();
            const dateTo = moment(body.dateTo).utc();

            logger.debug({ dateFrom, dateTo })
            if (!isTradingTime(dateFrom)) return res.status(400).send({ message: `The market is close! ${dateFrom}` });
            if (!dateFrom.isValid() || !dateTo.isValid()) return res.status(400).send({ message: 'Invalid date format' });
            if (dateFrom.isAfter(dateTo)) return res.status(400).send({ message: 'dateFrom must be before dateTo' });
            if (dateFrom.isAfter(moment())) return res.status(400).send({ message: 'dateFrom must be in the past' });
            if (dateTo.isAfter(moment())) return res.status(400).send({ message: 'dateTo must be in the past' });
            if (dateFrom.isSame(dateTo)) return res.status(400).send({ message: 'dateFrom and dateTo must be different' });
            const symbolToUse = await Symbols.findById(body.symbolId, 'symbolPair').lean();
            if (_.isNil(symbolToUse)) return res.status(400).send({ message: 'Symbol not found' });
            const algorithmToUse = await Algorithm.findById(body.algorithmId, 'script language candles').lean();
            if (_.isNil(algorithmToUse)) return res.status(400).send({ message: 'Algorithm not found' });
            const createBacktest = await Backtest.create({ inputData: body, status: 'running' });

            Promise.resolve(mainFuncForBacktest({
                dateFrom: createBacktest.inputData.dateFrom,
                dateTo: createBacktest.inputData.dateTo,
                timeframe: createBacktest.inputData.timeframe,
                symbol: symbolToUse,
                algorithm: algorithmToUse,
                candlePeriods: algorithmToUse.candles,
            }))
                .then(async result => {
                    if (result.length === 0) throw new Error('No result found');
                    logger.debug({ backtestResult: result })
                    const resultValidate = outputBacktestSchema.validate(result);
                    if (resultValidate.error) throw new Error('Invalid output schema');
                    const {
                        calculateOutcome,
                        positions
                    } = await checkResult(result, symbolToUse, algorithmToUse.candles, dateFrom, dateTo, 3);
                    await Backtest.findByIdAndUpdate(createBacktest._id, {
                        status: 'completed',
                        statusMessage: null,
                        result: calculateOutcome
                    });
                    await savePositions(positions, createBacktest._id, createBacktest.inputData.timeframe);
                })
                .catch(async error => {
                    logger.error(`Errore durante il backtest: ${error}`);
                    await Backtest.findByIdAndUpdate(createBacktest._id, {
                        status: 'failed',
                        statusMessage: error.message ?? error
                    });
                });
            return res.status(201).send(createBacktest);
        } catch (error) {
            logger.error(error);
            return res.status(500).send({ message: error.message ?? error });
        }
    },
    deleteBacktest: async function({ params, body }, res) {
        try {
            const foundBacktest = await Backtest.findById(params.id);
            if (_.isNil(foundBacktest)) return res.status(404).send({ message: 'Backtest not found' });
            await Position.deleteMany({ backtestId: params.id });
            await Backtest.findByIdAndDelete(params.id);
            return res.status(200).send({ message: 'Backtest deleted' });
        } catch (e) {
            logger.error(e);
            return res.status(500).send({ message: e.message ?? e });
        }
    }
}
