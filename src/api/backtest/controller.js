import { Backtest } from './model.js'
import moment from 'moment';
import _ from 'lodash';
import { Algorithm } from '../algorithm/model.js';
import { Symbols } from '../symbol/model.js';
import { checkResult, mainFuncForBacktest, outputBacktestSchema } from '../../services/algo/backtest/index.js';
import logger from '../../services/logger/index.js';


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
    createBacktest: async function({ params, body }, res) {
        try {
            const dateFrom = moment(body.dateFrom).tz('UTC');
            const dateTo = moment(body.dateTo).tz('UTC');
            logger.debug({ dateFrom, dateTo })
            if (!dateFrom.isValid() || !dateTo.isValid()) return res.status(400).send({ message: 'Invalid date format' });
            if (dateFrom.isAfter(dateTo)) return res.status(400).send({ message: 'dateFrom must be before dateTo' });
            if (dateFrom.isAfter(moment())) return res.status(400).send({ message: 'dateFrom must be in the past' });
            if (dateTo.isAfter(moment())) return res.status(400).send({ message: 'dateTo must be in the past' });
            if (dateFrom.isSame(dateTo)) return res.status(400).send({ message: 'dateFrom and dateTo must be different' });
            const symbolToUse = await Symbols.findById(body.symbolId, 'symbolPair').lean();
            if (_.isNil(symbolToUse)) return res.status(400).send({ message: 'Symbol not found' });
            const algorithmToUse = await Algorithm.findById(body.algorithmId, 'script language').lean();
            if (_.isNil(algorithmToUse)) return res.status(400).send({ message: 'Algorithm not found' });
            const createBacktest = await Backtest.create({ inputData: body, status: 'running' });

            Promise.resolve(mainFuncForBacktest({
                dateFrom: createBacktest.inputData.dateFrom,
                dateTo: createBacktest.inputData.dateTo,
                timeframe: createBacktest.inputData.timeframe,
                symbol: symbolToUse,
                algorithm: algorithmToUse
            }, 200))
                .then(async result => {
                    if (result.length === 0) throw new Error('No data fetched');
                    logger.debug({ backtestResult: result })
                    const resultValidate = outputBacktestSchema.validate(result);
                    if (resultValidate.error) throw new Error('Invalid output schema');
                    const calculateOutcome = await checkResult(resultValidate, symbolToUse.symbolPair);
                    await Backtest.findByIdAndUpdate(createBacktest._id, {
                        status: 'completed',
                        statusMessage: null,
                        result: calculateOutcome
                    });
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
    }
}