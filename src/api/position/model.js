import mongoose, { Schema } from 'mongoose';

const positionSchema = new mongoose.Schema({
    symbolId: { type: Schema.Types.ObjectId, ref: 'Symbol', required: true },
    algoId: { type: Schema.Types.ObjectId, ref: 'Algo', required: true },
    operation: { type: String, required: true, enum: ['buy', 'sell'] },
    outcome: { type: String, required: true, enum: ['Win', 'Loss'] },
    openTimestamp: { type: Date, required: true }, //in timestamp
    closeTimestamp: { type: Date, required: true }, //in timestamp
    entryPrice: { type: Number, required: true },
    closePrice: { type: Number, required: true },
    timeframe: { type: String, required: true, enum: ['1m', '5m', '15m', '30m', '1h', '4h', '1d'] },
    sl: { type: Number, required: true },
    tp: { type: Number, required: true },
    pips: { type: Number, required: true },
}, { collection: 'positions' });

export const Position = mongoose.model('Position', positionSchema);
