import { Router } from 'express';
import passport from 'passport';


const router = new Router();

router.post('/login', passport.authenticate('basic', { session: false }), (req, res) => {
    return res.status(200).send(req.user);
});


export default router;