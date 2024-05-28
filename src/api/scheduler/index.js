import { Router } from 'express';
import { actions } from './controller.js';
import { Auth } from '../../services/strategies/index.js';

const router = new Router();

router.post('/', Auth('jwt-admin'), actions.createSchedule);
router.get('/', Auth('jwt-admin'), actions.getAllSchedule)

export default router;