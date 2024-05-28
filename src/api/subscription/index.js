import { Router } from 'express';
import { actions } from './controller.js';
import { Auth } from '../../services/strategies/index.js';

const router = new Router();

router.post('/', Auth('jwt'), actions.subscribeUserToAlgo);
router.get('/', Auth('jwt'), actions.getMySubscriptions);

export default router;