import { Position } from './model.js'
import logger from '../../services/logger/index.js';
import { Symbols } from '../symbol/model.js';
import _ from 'lodash';
import moment from 'moment/moment.js';
import { getHistoricalRates } from 'dukascopy-node';
import {
    checkResult, convertTimeFrameForDukascopy, isTradingTime, mainFuncForBacktest, outputBacktestSchema
} from '../../services/algo/backtest/index.js';
import { Algorithm } from '../algorithm/model.js';
import { Backtest } from '../backtest/model.js';
import { savePositions } from '../backtest/utils/index.js';


export const actions = {
    getPositionsBeautified: async function({ query, body }, res) {
        try {
            const { dateFrom, dateTo } = query;
            const { algoId, symbolId, timeframe } = body;
            if (!dateFrom || !dateTo) return res.status(400).send({ message: 'Missing parameters' });
            const dateFromToUse = moment(dateFrom).utc();
            const dateToToUse = moment(dateTo).utc();
            if (!dateFromToUse.isValid() || !dateToToUse.isValid()) return res.status(400).send({ message: 'Invalid date format' });
            if (dateFromToUse.isAfter(dateToToUse)) return res.status(400).send({ message: 'dateFrom must be before dateTo' });
            if (dateFromToUse.isAfter(moment())) return res.status(400).send({ message: 'dateFrom must be in the past' });

            const foundAlgo = await Algorithm.findById(algoId).lean();
            if (_.isNil(foundAlgo)) return res.status(400).send({ message: 'Algorithm not found' });

            const foundSymbol = await Symbols.findById(symbolId).lean();
            if (_.isNil(foundSymbol)) return res.status(400).send({ message: 'Symbol not found' });

            const positions = await Position.aggregate([{
                $match: {
                    openTimestamp: { $gte: dateFromToUse.toDate(), $lte: dateToToUse.toDate() },
                    closeTimestamp: { $gte: dateFromToUse.toDate(), $lte: dateToToUse.toDate() },
                    algoId: foundAlgo._id,
                    symbolId: foundSymbol._id,
                    timeframe: timeframe
                }
            }, {
                $group: {
                    _id: null,
                    totalPips: { $sum: '$pips' },
                    totalWins: { $sum: { $cond: [{ $eq: ['$outcome', 'Win'] }, 1, 0] } },
                    totalLosses: { $sum: { $cond: [{ $eq: ['$outcome', 'Loss'] }, 1, 0] } },
                    totalPositions: { $sum: 1 },
                    avgPips: { $avg: '$pips' },
                    avgWinPips: { $avg: { $cond: [{ $eq: ['$outcome', 'Win'] }, '$pips', null] } },
                    avgLossPips: { $avg: { $cond: [{ $eq: ['$outcome', 'Loss'] }, '$pips', null] } },
                    maxWinPips: { $max: { $cond: [{ $eq: ['$outcome', 'Win'] }, '$pips', null] } },
                    maxLossPips: { $max: { $cond: [{ $eq: ['$outcome', 'Loss'] }, '$pips', null] } },
                    algoId: { $first: '$algoId' }, // assuming algoId is the same for all positions in the range
                    symbolId: { $first: '$symbolId' }, // assuming symbolId is the same for all positions in the range
                    timeframe: { $first: '$timeframe' }
                }
            }, {
                $project: {
                    _id: 0,
                    totalPips: 1,
                    totalWins: 1,
                    totalLosses: 1,
                    totalPositions: 1,
                    winPercentage: { $multiply: [{ $divide: ['$totalWins', '$totalPositions'] }, 100] },
                    lossPercentage: { $multiply: [{ $divide: ['$totalLosses', '$totalPositions'] }, 100] },
                    avgPips: 1,
                    avgWinPips: 1,
                    avgLossPips: 1,
                    maxWinPips: 1,
                    maxLossPips: 1,
                    algoId: 1,
                    symbolId: 1,
                    timeframe: 1,
                    dateFrom: { $literal: dateFromToUse.toDate() },
                    dateTo: { $literal: dateToToUse.toDate() }
                }
            }]);
            if (!positions.length) return res.status(200).send({});

            // Populate algoId and symbolId
            const populatedData = await Position.populate(positions[0], [
                { path: 'algoId', model: 'Algorithm' },
                { path: 'symbolId', model: 'Symbols' }
            ])

            return res.status(200).send(populatedData);
        } catch (e) {
            logger.error(e);
            return res.status(500).send({ message: e.message ?? e });
        }
    },
    getPositionsRaw: async function({ query }, res) {
        try {
            const { dateFrom, dateTo } = query;
            if (!dateFrom || !dateTo) return res.status(400).send({ message: 'Missing parameters' });
            const dateFromToUse = moment(dateFrom).utc();
            const dateToToUse = moment(dateTo).utc();
            if (!dateFromToUse.isValid() || !dateToToUse.isValid()) return res.status(400).send({ message: 'Invalid date format' });
            if (dateFromToUse.isAfter(dateToToUse)) return res.status(400).send({ message: 'dateFrom must be before dateTo' });
            if (dateFromToUse.isAfter(moment())) return res.status(400).send({ message: 'dateFrom must be in the past' });


            const positions = await Position.find({
                openTimestamp: { $gte: dateFromToUse, $lte: dateToToUse },
                closeTimestamp: { $gte: dateFromToUse, $lte: dateToToUse }
            })
            return res.status(200).send(positions);
        } catch (e) {
            logger.error(e);
            return res.status(500).send({ message: e.message ?? e });
        }
    }, getHistoricalData: async function({ query }, res) {
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
                instrument: _.split(symbolToUse.symbolPair, '/').join('').toLowerCase(), dates: {
                    from: dateFromToUse, to: dateToToUse
                }, timeframe: convertTimeFrameForDukascopy(timeframe), format: 'json'
            });
            return res.status(200).send(historicalData);
        } catch (e) {
            logger.error(e);
            return res.status(500).send({ message: e.message ?? e });
        }
    }, createBacktest: async function({ params, body }, res) {
        try {

            const { timeframe, symbolId, algorithmId } = body;
            const dateFrom = moment(body.dateFrom).utc();
            const dateTo = moment(body.dateTo).utc();

            logger.debug({ dateFrom, dateTo })
            // if (!isTradingTime(dateFrom)) return res.status(400).send({ message: `The market is close! ${dateFrom}` });
            if (!dateFrom.isValid() || !dateTo.isValid()) return res.status(400).send({ message: 'Invalid date format' });
            if (dateFrom.isAfter(dateTo)) return res.status(400).send({ message: 'dateFrom must be before dateTo' });
            if (dateFrom.isAfter(moment())) return res.status(400).send({ message: 'dateFrom must be in the past' });
            if (dateTo.isAfter(moment())) return res.status(400).send({ message: 'dateTo must be in the past' });
            if (dateFrom.isSame(dateTo)) return res.status(400).send({ message: 'dateFrom and dateTo must be different' });
            const symbolToUse = await Symbols.findById(symbolId, 'symbolPair').lean();
            if (_.isNil(symbolToUse)) return res.status(400).send({ message: 'Symbol not found' });
            const algorithmToUse = await Algorithm.findById(algorithmId, 'script language candles').lean();
            if (_.isNil(algorithmToUse)) return res.status(400).send({ message: 'Algorithm not found' });

            Promise.resolve(mainFuncForBacktest({
                dateFrom,
                dateTo,
                timeframe,
                symbol: symbolToUse,
                algorithm: algorithmToUse,
                candlePeriods: algorithmToUse.candles,
            }))
                .then(async result => {
                    if (result.length === 0) throw new Error('No result found');
                    const resultValidate = outputBacktestSchema.validate(result);
                    if (resultValidate.error) throw new Error('Invalid output schema');
                    const positions = await checkResult(result, symbolToUse, algorithmToUse.candles, dateFrom, dateTo, 3);
                    await savePositions(positions, symbolToUse._id, algorithmToUse._id, timeframe);
                })
                .catch(async error => {
                    logger.error(`Errore durante il backtest: ${error}`);
                });
            return res.status(201).send({ message: 'Backtest created successfully' });
        } catch (error) {
            logger.error(error);
            return res.status(500).send({ message: error.message ?? error });
        }
    },
}
