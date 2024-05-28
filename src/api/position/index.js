import { Router } from 'express';
import { actions } from './controller.js';
import { Auth } from '../../services/strategies/index.js';

const router = new Router();

// router.get('/backtest/:backtestId', Auth('jwt'), actions.getPositions);
// router.get('/backtest/:backtestId/date', Auth('jwt'), actions.getPositionByRangeDate);
router.get('/historical', Auth('jwt'), actions.getHistoricalData);
router.get('/beautified', Auth('jwt'), actions.getPositionsBeautified);
router.get('/raw', Auth('jwt'), actions.getPositionsRaw);
router.post('/backtest', Auth('jwt-admin'), actions.createBacktest);

export default router;
