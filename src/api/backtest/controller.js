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

    aggregateBacktest: async function({ query, params }, res) {
        try {
            const { from, to } = query;
            const foundAlgo = await Algorithm.findById(params.algoId);
            if (_.isNil(foundAlgo)) return res.status(404).send({ message: 'Algorithm not found' });
            if (!from || !to) {
                const backtests = await Backtest.find({ 'inputData.algorithmId': foundAlgo._id }).lean();
                if (backtests.length === 0) return res.status(404).send({ message: 'No backtests found' });
                return res.status(200).send(backtests);
            }


        } catch (e) {
            logger.error(e);
            return res.status(500).send({ message: e.message ?? e });
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
