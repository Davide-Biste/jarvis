import { User } from '../../api/user/model.js';
import { BasicStrategy } from 'passport-http';
import jwt from 'jsonwebtoken';

export const basic = new BasicStrategy(async (username, password, done) => {
    const user = await User.findOne({ username: username, isActive: true });
    if (!user) {
        return done(null, false);
    } //non esiste "Unauthorized"
    user.isValidPassword(password).then(res => {
        if (res) {
            const token = jwt.sign(
                {
                    user: { _id: user._id, username: username, role: user.role },
                },
                'secret',
                {
                    expiresIn: '30d',
                }
            );
            delete user._doc.password;
            return done(null, { token, user });
        }
        return done(null, false);

    }).catch(e => {
        return console.log({ errorLogin: e });
    })
})