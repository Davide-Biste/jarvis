import { Router } from 'express';
import { actions } from './controller.js';
import { Auth } from '../../services/strategies/index.js';

const router = new Router();

router.get('/', Auth('jwt'), actions.getBacktests);
router.get('/historical', Auth('jwt'), actions.getHistoricalData);
router.get('/:id', Auth('jwt-admin'), actions.getBacktestById);
router.get('/algo/:id', Auth('jwt'), actions.getBacktestByAlgoId);
router.get('/aggregate/:algoId', Auth('jwt'), actions.aggregateBacktest);
router.post('/', Auth('jwt-admin'), actions.createBacktest);
router.delete('/:id', Auth('jwt-admin'), actions.deleteBacktest);


export default router;
