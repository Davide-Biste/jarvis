import { Router } from 'express';
import { actions } from './controller.js';
import { Auth } from '../../services/strategies/index.js';

const router = new Router();

router.get('/', Auth('jwt'), actions.getBacktests);
router.post('/', Auth('jwt-admin'), actions.createBacktest);


export default router;