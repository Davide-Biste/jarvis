import logger from '../logger/index.js';
import { createConnection } from './api.cjs';

export const connectToAccount = async (token, accountId) => {
    try {
        const api = createConnection(token);
        const account = await api.metatraderAccountApi.getAccount(accountId);
        const initialState = account.state;
        const deployedStates = ['DEPLOYING', 'DEPLOYED'];

        if (!deployedStates.includes(initialState)) {
            logger.debug('Deploying account');
            await account.deploy();
        }

        logger.debug('Waiting for API server to connect to broker (may take couple of minutes)');
        await account.waitConnected();

        let connection = account.getRPCConnection();
        await connection.connect();
        return connection;
    } catch (e) {
        logger.error(`Error in connection to account ${e}`);
    }
}
