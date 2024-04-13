import mongoose, { Schema } from 'mongoose';

const validTimeframes = ['1m', '5m', '15m', '1h', '4h', '1d', '1w', '1M']

const schedulerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    symbol: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'Symbols'
    },
    timeframe: {
        type: String,
        required: true,
        enum: validTimeframes
    },
    candleNumber: {
        type: Number,
        required: true,
        default: 100
    },
    algorithms: {
        type: [Schema.Types.ObjectId],
        ref: 'Algorithm'
    },
    status: {
        type: String,
        required: true,
        enum: ['active', 'deleted', 'paused'],
        default: 'active'
    },
}, { timestamps: true });
export const Scheduler = mongoose.model('Scheduler', schedulerSchema);