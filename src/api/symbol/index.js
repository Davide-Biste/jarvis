import { Router } from 'express';
import { actions } from './controller.js';
import { Auth } from '../../services/strategies/index.js';

const router = new Router();


router.get('/', Auth('jwt-admin'), actions.getSymbols);
router.get('/supported', Auth('jwt-admin'), actions.supportedSymbols);
router.post('/', Auth('jwt-admin'), actions.createSymbol);
router.post('/validate', Auth('jwt-admin'), actions.validateSymbol);

export default router;
