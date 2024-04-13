import _ from 'lodash';
import { User } from './model.js'
import logger from '../../services/logger/index.js';


export const actions = {
    findUserById: async function({ params, body }, res) {
        try {
            const foundUser = await User.findById(params.id).select('-password');
            if (_.isNil(foundUser)) return res.status(404).send({ message: 'User not found' });
            return res.status(200).send(foundUser);
        } catch (e) {
            logger.error(e);
            return res.status(500).send({ message: e.message ?? e });
        }
    },
    findMe: async function({ params, body, user }, res) {
        try {
            const foundUser = await User.findById(user._id).select('-password');
            if (_.isNil(foundUser)) return res.status(404).send({ message: 'User not found' });
            return res.status(200).send(foundUser);
        } catch (e) {
            logger.error(e);
            return res.status(500).send({ message: e.message ?? e });
        }
    },
    createUser: async function({ params, body }, res) {
        try {
            body.role = 'user';
            const createdUser = await User.create(body);
            return res.status(201).send(createdUser);
        } catch (e) {
            logger.error(e);
            return res.status(500).send({ message: e.message ?? e });
        }

    },
    updateById: async function({ params, body }, res) {
        try {
            const foundUser = await User.findById(params.id);
            if (_.isNil(foundUser)) return res.status(404).send({ message: 'User not found' });
            foundUser.overwrite({ ...foundUser._doc, ...body });
            const updatedUser = await foundUser.save();
            delete updatedUser.password;
            return res.status(201).send(updatedUser);
        } catch (e) {
            logger.error(e);
            return res.status(500).send({ message: e.message ?? e });
        }

    },
    updateMe: async function({ params, body, user }, res) {
        try {
            const foundUser = await User.findById(user._id);
            if (_.isNil(foundUser)) return res.status(404).send({ message: 'User not found' });
            foundUser.overwrite({ ...foundUser._doc, ...body });
            const updatedUser = await foundUser.save();
            delete updatedUser.password;
            return res.status(201).send(updatedUser);
        } catch (e) {
            logger.error(e);
            return res.status(500).send({ message: e.message ?? e });
        }

    },
    deleteById: async function({ params, body }, res) {
        try {
            const foundUser = await User.findById(params.id);
            if (_.isNil(foundUser)) return res.status(404).send({ message: 'User not found' });

            let isUniqueNewUsername = true;
            let incrementDeleted = 0;
            let username = foundUser.username;

            do {
                try {
                    foundUser.isActive = false;
                    foundUser.username = incrementDeleted === 0 ? 'deleted_' + username : 'deleted_' + username + '_' + incrementDeleted;

                    await foundUser.save();
                    isUniqueNewUsername = false;
                } catch (e) {
                    incrementDeleted++;
                    foundUser.username = '';
                }
            } while (isUniqueNewUsername);

            return res.sendStatus(204);
        } catch (e) {
            logger.error(e);
            return res.status(500).send({ message: e.message ?? e });
        }

    },
    checkUniqunessOfUsername: async function({ params }, res) {
        try {
            const objResponse = {
                exists: true,
                username: params.username
            }
            const found = await User.countDocuments({ username: params.username });
            if (found === 0) objResponse.exists = false;
            return res.status(200).send(objResponse);
        } catch (e) {
            logger.error(e);
            return res.status(500).send({ message: e.message ?? e });
        }
    },
}