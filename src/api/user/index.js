import { Router } from 'express';
import { actions } from './controller.js';
import { Auth } from '../../services/strategies/index.js';

const router = new Router();

router.get('/me', Auth('jwt'), actions.findMe);
router.get('/:id', Auth('jwt-admin'), actions.findUserById);
router.post('/', actions.createUser);
router.put('/me', Auth('jwt'), actions.updateMe);
router.put('/:id', Auth('jwt-admin'), actions.updateById);
router.delete('/:id', Auth('jwt-admin'), actions.deleteById);
router.get('/checkusernamevalidity/:username', actions.checkUniqunessOfUsername);

export default router;