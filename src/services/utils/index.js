import moment from 'moment';
import logger from '../logger/index.js';

export const getMarketPrice = async (exchange, symbol, timeframe, from, to = moment.now()) => {
    try {
        const dateFrom = moment(from).startOf('minutes').unix() * 1000;
        return await exchange.fetchOHLCV(symbol, timeframe, dateFrom, 1000);
    } catch (e) {
        logger.error(e);
    }
}

export const fetchCandlesBeforeDate = async (exchange, symbol, timeframe, endDate, limit = 1000) => {
    if (!exchange.has.fetchOHLCV) {
        throw new Error(`Il metodo fetchOHLCV non è supportato dall'exchange ${exchange.id}`);
    }
    // Converti la data di fine in un timestamp
    const endTimestamp = moment(endDate).valueOf();

    // Calcola il timestamp di partenza sottraendo il numero di millisecondi corrispondente alle candele richieste
    // Nota: il valore di una candela (in millisecondi) dipende dal timeframe che utilizzi
    const timeframeMilliseconds = exchange.parseTimeframe(timeframe) * 1000;
    const startTimestamp = endTimestamp - (timeframeMilliseconds * limit);

    try {
        // Fetch the OHLCV data
        logger.debug({
            symbol,
            timeframe,
            startTimestamp: moment(startTimestamp).format('YYYY-MM-DD HH:mm:ss'),
            endTimestamp: moment(endTimestamp).format('YYYY-MM-DD HH:mm:ss'),
            limit
        })
        const ohlcv = await exchange.fetchOHLCV(symbol, timeframe, startTimestamp, limit);
        logger.debug({ ohlcv })
        logger.debug({ primoTimestamp: ohlcv[0][0] })
        if (ohlcv.length > 0 && ohlcv[ohlcv.length - 1][0] <= endTimestamp) {
            return ohlcv;
        }
        if (ohlcv.length === 0) {
            throw new Error('Non è stato possibile recuperare le candele desiderate.');
        }
    } catch (error) {
        logger.error(error);
        throw error;
    }
}


export const calculateStartDate = (timeframe, numberOfCandles, endDate = moment()) => {
    const match = timeframe.match(/(\d+)([mhd])/);
    if (!match) throw new Error('Timeframe non supportato');

    const quantity = parseInt(match[1], 10);
    const units = match[2];

    let duration;
    switch (units) {
        case 'm':
            duration = moment.duration(quantity * numberOfCandles, 'minutes');
            break;
        case 'h':
            duration = moment.duration(quantity * numberOfCandles, 'hours');
            break;
        case 'd':
            duration = moment.duration(quantity * numberOfCandles, 'days');
            break;
        // Puoi aggiungere ulteriori casi qui, come settimane ('w') o mesi ('M'), se necessario
        default:
            throw new Error('Timeframe non supportato');
    }

    // Se endDate è una stringa o un numero, lo convertiamo in un oggetto moment
    const endDateMoment = moment(endDate);

    const startDate = endDateMoment.subtract(duration);
    startDate.toDate().setSeconds(0, 0); // Imposta anche i millisecondi a 0 se vuoi una precisione al secondo
    return startDate.toDate(); // Converti l'oggetto moment in un oggetto Date nativo di JavaScript
};