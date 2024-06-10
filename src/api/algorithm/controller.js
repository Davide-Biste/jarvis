import { Algorithm } from './model.js'
import _ from 'lodash';
import { Scheduler } from '../scheduler/model.js';
import logger from '../../services/logger/index.js';
import { Position } from '../position/model.js';


export const actions = {
    getAllAlgos: async function({ params, body }, res) {
        try {
            const foundAlgo = await Algorithm.find();
            return res.status(200).send(foundAlgo);
        } catch (e) {
            logger.error(e)
            return res.status(500).send({ message: e.message ?? e });
        }
    },
    createAlgo: async function({ params, body }, res) {
        try {
            const createdAlgorithm = await Algorithm.create(body);
            return res.status(201).send(createdAlgorithm);
        } catch (e) {
            logger.error(e);
            return res.status(500).send({ message: e.message ?? e });
        }
    },
    findAlgoById: async function({ params, body }, res) {
        try {
            const foundAlgorithm = await Algorithm.findById(params.id);
            if (_.isNil(foundAlgorithm)) return res.status(404).send({ message: 'Algorithm not found' });
            return res.status(200).send(foundAlgorithm);
        } catch (e) {
            logger.error(e);
            return res.status(500).send({ message: e.message ?? e });
        }
    },
    connectAlgoToScheduler: async function({ params, body }, res) {
        try {
            const foundAlgorithm = await Algorithm.findById(params.algoId);
            if (_.isNil(foundAlgorithm)) return res.status(404).send({ message: 'Algorithm not found' });
            const foundScheduler = await Scheduler.findById(params.scheduleId);
            if (_.isNil(foundScheduler)) return res.status(404).send({ message: 'Scheduler not found' });
            foundScheduler.algorithms.push(foundAlgorithm._id);
            await foundScheduler.save();
            return res.status(200).send({ 'message': 'Algorithm connected to scheduler successfully' });
        } catch (e) {
            logger.error(e);
            return res.status(500).send({ message: e.message ?? e });
        }

    },
    updateAlgorithm: async function({ params, body }, res) {
        try {
            const updatedAlgorithm = await Algorithm.findByIdAndUpdate(params.id, body);
            if (_.isNil(updatedAlgorithm)) return res.status(404).send({ message: 'Algorithm not found' });
            return res.status(200).send(updatedAlgorithm);
        } catch (e) {
            logger.error(e);
            return res.status(500).send({ message: e.message ?? e });

        }
    },
    deleteAlgorithm: async function({ params, body }, res) {
        try {
            const foundAlgorithm = await Algorithm.findById(params.id);
            if (_.isNil(foundAlgorithm)) return res.status(404).send({ message: 'Algorithm not found' });
            const deletePositions = await Position.deleteMany({ algoId: params.id });
            const deletedAlgorithm = await Algorithm.findByIdAndDelete(foundAlgorithm._id);
            return res.status(200).send(deletedAlgorithm);
        } catch (e) {
            logger.error(e);
            return res.status(500).send({ message: e.message ?? e });
        }
    }
}