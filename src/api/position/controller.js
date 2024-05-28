import { Position } from './model.js'
import logger from '../../services/logger/index.js';


export const actions = {
    getPositions: async function({ params, query }, res) {
        try {
            const { limit, page, dateFrom, dateTo } = query;

            const queryToUse = {
                backtestId: params.backtestId,
                openTimestamp: {
                    $gte: new Date(dateFrom),
                },
                closeTimestamp: {
                    $lte: new Date(dateTo),
                }
            };
            const positions = await Position.find(queryToUse)
                .limit(parseInt(limit) || 10)
                .skip(parseInt(page) || 0)
                .sort({ createdAt: -1 })
                .lean();
            return res.status(200).send(positions);
        } catch (e) {
            logger.error(e);
            return res.status(500).send({ message: e.message ?? e });
        }
    },
    getPositionByRangeDate: async function({ params, query }, res) {
        try {
            // const { limit, page, dateFrom, dateTo } = query;
            const { dateFrom, dateTo } = query;
            const queryToUse = {
                backtestId: params.backtestId,
                openTimestamp: {
                    $gte: new Date(dateFrom),
                },
                closeTimestamp: {
                    $lte: new Date(dateTo),
                }
            };
            const positions = await Position.find(queryToUse)
                .sort({ openTimestamp: 1 })
                .lean();
            return res.status(200).send(positions);
        } catch (e) {
            logger.error(e);
            return res.status(500).send({ message: e.message ?? e });
        }
    }
}
