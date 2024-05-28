import { Router } from 'express';
import { actions } from './controller.js';
import { Auth } from '../../services/strategies/index.js';

const router = new Router();

router.get('/backtest/:backtestId', Auth('jwt'), actions.getPositions);
router.get('/backtest/:backtestId/date', Auth('jwt'), actions.getPositionByRangeDate);

export default router;
