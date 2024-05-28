import { Algorithm } from '../algorithm/model.js';
import _ from 'lodash';
import { Subscription } from './model.js';
import logger from '../../services/logger/index.js';


export const actions = {
    subscribeUserToAlgo: async function({ params, body, user }, res) {
        try {
            const foundAlgorithm = await Algorithm.findById(body.algorithmId);
            if (_.isNil(foundAlgorithm)) return res.status(404).send({ message: 'Algorithm not found' });
            // Create a subscription
            const subscription = new Subscription({
                user: user._id,
                algorithm: foundAlgorithm._id,
            });
            await subscription.save();
            return res.status(200).send(subscription);
        } catch (e) {
            logger.error(e);
            return res.status(500).send({ message: e.message ?? e });
        }
    },
    getMySubscriptions: async function({ body, user }, res) {
        try {
            const subscriptions = await Subscription.find({ user: user._id }).populate('algorithm');
            return res.status(200).send(subscriptions);
        } catch (e) {
            logger.error(e);
            return res.status(500).send({ message: e.message ?? e });
        }
    }
}