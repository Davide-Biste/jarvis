import { Position } from '../../position/model.js';
import logger from '../../../services/logger/index.js';
import { Backtest } from '../model.js';
import pkg from 'bluebird';
import _ from 'lodash';

const { Promise } = pkg;

export async function savePositions(positions, symbolId, algoId, timeframe) {
    try {
        const formattedPositions = _.map(positions, pos => {
            if (pos.result !== 'no outcome') {
                return {
                    ...pos,
                    symbolId: symbolId,
                    algoId: algoId,
                    timeframe: timeframe,
                }
            }
        })
        const filteredPositions = formattedPositions.filter(pos => pos !== undefined);
        const bulkOps = filteredPositions.map(pos => ({
            updateOne: {
                filter: {
                    timeframe: pos.timeframe,
                    symbolId: symbolId,
                    algoId: algoId,
                    operation: pos.operation,
                    outcome: pos.outcome,
                    openTimestamp: pos.openTimestamp,
                    closeTimestamp: pos.closeTimestamp,
                    entryPrice: pos.entryPrice,
                    closePrice: pos.closePrice,
                    sl: pos.sl,
                    tp: pos.tp,
                    pips: pos.pips,
                },
                update: pos,
                upsert: true
            }
        }));
        const result = await Position.bulkWrite(bulkOps);

        if (result.upsertedCount > 0) {
            console.log('Posizioni inserite con successo.');
        } else {
            console.log('Nessuna nuova posizione da inserire.');
        }
    } catch (error) {
        await Backtest.findByIdAndUpdate(backtestId, {
            status: 'error',
            statusMessage: 'Errore durante il salvataggio delle posizioni'
        });
        logger.error('Errore durante il salvataggio delle posizioni:', error);
    }
}
