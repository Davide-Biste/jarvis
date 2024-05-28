import logger from '../logger/index.js';
import { connectToAccount } from './manager.js';

export const createMarketOperation = async (token, accountId, tradeInfo) => {
    try {
        const conn = connectToAccount(token, accountId);
        const { symbol, tradeType, volume, stopLoss, takeProfit } = tradeInfo;
        let result = await
            conn.createLimitBuyOrder('GBPUSD', 0.07, 1.0, 0.9, 2.0, {
                // comment: 'comm',
                clientId: 'TE_GBPUSD_7hyINWqAlE'
            });
        logger.debug('Trade successful, result code is ' + result.stringCode);
        await conn.close();

    } catch (e) {
        logger.error(`Error in createMarketOperation: ${e}`);
    }
}
