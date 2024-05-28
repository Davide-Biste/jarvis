import passport from 'passport';
import { jwt } from './jwt.js';
import { basic } from './basic-auth.js';
import { jwtAdmin } from './jwt-admin.js';

export function initPassportStrategies() {
    passport.use('basic', basic);
    passport.use('jwt', jwt);
    passport.use('jwt-admin', jwtAdmin);
}

export const Auth = (strategy) => passport.authenticate(strategy, { session: false })