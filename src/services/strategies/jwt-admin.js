import { User } from '../../api/user/model.js';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';

const opts = {
    role: 'admin',
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: 'secret',
}

export const jwtAdmin = new JwtStrategy(opts, async function(jwt_payload, done) {
    if (jwt_payload.user.role === opts.role) {
        try {
            const user = await User.findOne({ _id: jwt_payload.user._id, isActive: true });
            if (user) {
                return done(null, user);
            }
            return done(null, false);
        } catch (err) {
            if (err) {
                return done(err, false);
            }
        }
    } else {
        return done(null, false);
    }
});