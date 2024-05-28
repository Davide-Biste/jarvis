import { User } from '../../api/user/model.js';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';

const opts = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: 'secret',
}

export const jwt = new JwtStrategy(opts, async function(jwt_payload, done) {
    try {
        const user = await User.findOne({ _id: jwt_payload.user._id, isActive: true });
        if (user) {
            return done(null, user);
        }
        return done(null, false);
    } catch (e) {
        return done(err, false);
    }
});