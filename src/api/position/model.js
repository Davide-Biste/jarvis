import mongoose, { Schema } from 'mongoose';

const positionSchema = new mongoose.Schema({
    backtestId: { type: Schema.Types.ObjectId, ref: 'Backtest', required: true },
    openTimestamp: { type: Date, required: true }, //in timestamp
    closeTimestamp: { type: Date, required: true }, //in timestamp
    entryPrice: { type: Number, required: true },
    closePrice: { type: Number, required: true },
    timeframe: { type: String, required: true, enum: ['1m', '5m', '15m', '30m', '1h', '4h', '1d'] },
    result: { type: String, required: true, enum: ['win', 'loss'] },
}, { collection: 'positions' });

export const Position = mongoose.model('Position', positionSchema);
