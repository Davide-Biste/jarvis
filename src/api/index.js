import { Router } from 'express';

import users from './user/index.js';
import auth from './auth/index.js';
import schedule from './scheduler/index.js';
import algorithm from './algorithm/index.js';
import symbol from './symbol/index.js';
import subscription from './subscription/index.js';
import backtest from './backtest/index.js';

const router = new Router();

router.use('/user', users);
router.use('/auth', auth);
router.use('/schedule', schedule);
router.use('/algo', algorithm);
router.use('/symbol', symbol);
router.use('/subscription', subscription);
router.use('/backtest', backtest)

export default router;