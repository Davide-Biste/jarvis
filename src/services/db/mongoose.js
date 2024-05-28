import mongoose from 'mongoose';
import 'dotenv/config';
import logger from '../logger/index.js';

export default async function mongooseConnection() {
    try {
        logger.info('Connecting to Mongoose...')
        await mongoose.connect(process.env.MONGO_URL);
        logger.info('Connected to Mongoose');
    } catch (e) {
        logger.error({ ErrorConnectionDB: e });
    }
}