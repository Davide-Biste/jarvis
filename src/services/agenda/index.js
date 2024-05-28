import logger from '../../services/logger/index.js';
import { Scheduler } from '../../api/scheduler/model.js';
import _ from 'lodash';
import { fetchCandlesBeforeDate } from '../utils/index.js';
import { executeAlgo } from '../algo/index.js';
import { Agenda } from '@hokify/agenda';
import ccxt from 'ccxt';
import moment from 'moment';
import { Subscription } from '../../api/subscription/model.js';
import { createMarketOperation } from '../meta-api/index.js';
import { decryptData } from '../passwordCrypt/cryptToken.js';

const agenda = new Agenda({
    db: {
        address: process.env.MONGO_URL,
        collection: 'agendaJobs',
    }
});

const disable_agenda = process.env.DISABLE_AGENDA === 'true';

export const AGENDA_JOBS = {
    GET_MARKET_DATA: 'get market data',
};

// Definisci il job una volta. Il nome del job è usato come identificatore.
agenda.define(AGENDA_JOBS.GET_MARKET_DATA, async (job, done) => {
    try {
        const data = job.attrs.data;
        logger.debug(`Data: ${JSON.stringify(data)}`);
        const schedule = await Scheduler.findById(data.scheduleId).populate('symbol algorithms').lean();
        if (_.isNil(schedule)) throw new Error('Schedule not found');
        const endDate = moment().startOf('minute').toDate();
        const exchange = new ccxt.currencycom();
        const fetchedData = await fetchCandlesBeforeDate(exchange, schedule.symbol.symbolPair, schedule.timeframe, endDate, schedule.algorithms.candles);
        if (!_.isEmpty(schedule.algorithms)) {
            for (const algo of schedule.algorithms) {
                // Da capire come gestire più esecuzioni di algoritmi diversi
                const algoResult = await executeAlgo(fetchedData, algo);

                // Logica per eseguire l'operazione sull'exchange del trader
                logger.info(`Algorithm - ${algo.name} - result: ${algoResult} - lastDate: ${moment(endDate).format('YYYY-MM-DD HH:mm')}`);
                if (algoResult) {
                    const subscribedUser = await Subscription.find({ algorithm: algo._id }).populate('user');
                    Promise.resolve(subscribedUser).then(async (users) => {
                        for (const user of users) {
                            if (!user.user.metaApi) continue;
                            const decriptedToken = decryptData(user.user.metaApi.token, process.env.CRYPT_KEY);
                            const decryptedAccountId = decryptData(user.user.metaApi.accountId, process.env.CRYPT_KEY);
                            await createMarketOperation(decriptedToken, decryptedAccountId, algoResult);
                        }
                    });
                }
                done();
            }
        } else {
            logger.error(`Algorithm not found for job - ${job.attrs.name} - lastDate: ${moment(endDate).format('YYYY-MM-DD HH:mm')}`);
            done();
        }
        done();
    } catch (error) {
        logger.error(`Error in job - ${job.attrs.name}`);
        logger.error(`Error details: ${error.message}`);
        logger.error(`Stack: ${error.stack}`);
        done(error);
    }
});


(async function() {
    if (disable_agenda) {
        logger.info('Agenda is disabled');
        return;
    }
    await agenda.start();
    const jobs = await Scheduler.find({ status: 'active' }, 'timeframe name');
    for (const job of jobs) {
        let cronExpression = '';
        switch (job.timeframe) {
            case '1m':
                cronExpression = '* 0-22 * * 1-5'; // Ogni minuto, dalle 00:00 alle 22:59, da lunedì a venerdì
                break;
            case '5m':
                cronExpression = '*/5 0-22 * * 1-5'; // Ogni 5 minuti, dalle 00:00 alle 22:59, da lunedì a venerdì
                break;
            case '15m':
                cronExpression = '*/15 0-22 * * 1-5'; // Ogni 15 minuti, dalle 00:00 alle 22:59, da lunedì a venerdì
                break;
            case '1h':
                cronExpression = '0 0-22 * * 1-5'; // All'inizio di ogni ora, dalle 00:00 alle 22:59, da lunedì a venerdì
                break;
            case '4h':
                cronExpression = '0 */4 0-20 * * 1-5'; // All'inizio di ogni 4 ore, dalle 00:00 alle 20:59, da lunedì a venerdì
                // Nota: L'ultimo timeframe "4h" va da 20:00 a 20:59 per non superare le 22:00
                break;
            case '1d':
                cronExpression = '0 0 * * 1-5'; // All'inizio di ogni giorno lavorativo, alla mezzanotte, da lunedì a venerdì
                break;
            // Aggiungi qui altri case per altri timeframe
        }
        if (cronExpression) {
            // Schedula ogni job individualmente con i propri dati.
            logger.info(`Scheduling job - ${job.name} - ${cronExpression}`);
            await agenda.every(cronExpression, AGENDA_JOBS.GET_MARKET_DATA, { scheduleId: job._id }, {
                timezone: 'Europe/Rome',
            });
        } else {
            logger.error(`Cron expression not found for timeframe - ${job.timeframe}`);
        }
    }
})();

export default agenda;
