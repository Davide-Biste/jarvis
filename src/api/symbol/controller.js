import { Symbols } from './model.js';
import logger from '../../services/logger/index.js'
import ccxt from 'ccxt';

export const actions = {
    getSymbols: async (req, res) => {
        try {
            const { limit, page } = req.query;
            const symbols = await Symbols.find()
                .limit(parseInt(limit) || 10)
                .skip(parseInt(page) || 0)
                .sort({ createdAt: -1 })
                .lean();
            return res.status(200).send(symbols);
        } catch (e) {
            logger.error(e);
            return res.status(500).send({ message: e.message ?? e });
        }
    },
    createSymbol: async (req, res) => {
        try {
            const createdSchedule = await Symbols.create(req.body);
            return res.status(201).send(createdSchedule);
        } catch (e) {
            logger.error(e);
            return res.status(500).send({ message: e.message ?? e });
        }
    },
    validateSymbol: async ({ params, body, res }) => {
        try {
            const { symbol } = body;
            logger.debug(`Validating symbol ${symbol}`)
            if (!symbol) return res.status(400).send({ message: 'Missing symbol' });
            const exchange = new ccxt.currencycom();
            const loadMarkets = await exchange.loadMarkets();
            if (loadMarkets === undefined) return res.status(500).send({ message: 'Error loading markets' });
            if (!exchange.markets[symbol]) return res.status(400).send({ message: 'Invalid symbol' });
            return res.status(200).send({ message: 'Valid symbol' });
        } catch (e) {
            logger.error(e);
            return res.status(500).send({ message: e.message ?? e });
        }
    },
    supportedSymbols: async (req, res) => {
        try {
            const exchange = new ccxt.currencycom();
            const loadMarkets = await exchange.loadMarkets();
            if (loadMarkets === undefined) return res.status(500).send({ message: 'Error loading markets' });
            const symbols = Object.keys(loadMarkets);
            return res.status(200).send(symbols);
        } catch (e) {
            logger.error(e);
            return res.status(500).send({ message: e.message ?? e });
        }
    }
}
