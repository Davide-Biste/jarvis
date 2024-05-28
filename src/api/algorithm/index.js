import {Router} from 'express';
import {actions} from './controller.js';
import {Auth} from '../../services/strategies/index.js';

const router = new Router();

router.get('/', Auth('jwt'), actions.getAllAlgos);
router.get('/:id', Auth('jwt'), actions.findAlgoById);
router.post('/', Auth('jwt-admin'), actions.createAlgo);
router.post('/:algoId/schedule/:scheduleId', Auth('jwt-admin'), actions.connectAlgoToScheduler);
router.put('/:id', Auth('jwt-admin'), actions.updateAlgorithm);

export default router;