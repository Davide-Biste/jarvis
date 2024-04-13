import { Scheduler } from './model.js';
import logger from '../../services/logger/index.js';

export const actions = {
    createSchedule: async ({ body, res }) => {
        try {
            body.status = 'active';
            const createdSchedule = await Scheduler.create(body);
            return res.status(201).send(createdSchedule);
        } catch (e) {
            logger.error(e);
            return res.status(500).send({ message: e.message ?? e });
        }
    },
    getAllSchedule: async ({ params, body, res }) => {
        try {
            const agenda = await Scheduler.find({}).populate('symbol algorithms');
            return res.status(200).send(agenda)
        } catch (e) {
            logger.error(e);
            return res.status(500).send({ message: e.message ?? e });
        }
    }
}