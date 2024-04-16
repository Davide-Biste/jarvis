import mongoose, { Schema } from 'mongoose';


const inputDataSchema = new mongoose.Schema({
    dateFrom: {
        type: Date,
        required: true
    },
    dateTo: {
        type: Date,
        required: true
    },
    timeframe: {
        type: String,
        required: true
    },
    symbolId: {
        type: Schema.Types.ObjectId,
        required: true
    },
    algorithmId: {
        type: Schema.Types.ObjectId,
        required: true
    }
});

const resultSchema = new mongoose.Schema({
    percentageWinningTrades: {
        type: Number,
        required: true
    },
    percentageLosingTrades: {
        type: Number,
        required: true
    },
    totalTrades: {
        type: Number,
        required: true
    },
    profitFactor: {
        type: Number,
        required: true
    },
    pips: {
        type: Number,
        required: true
    },
    win: {
        type: Number,
        required: true
    },
    loss: {
        type: Number,
        required: true
    }
});

const backtestSchema = new mongoose.Schema({
    inputData: inputDataSchema,
    status: {
        type: String,
        required: true,
        enum: ['running', 'completed', 'failed'],
    },
    statusMessage: {
        type: String,
        required: false,
        default: null
    },
    result: {
        type: resultSchema,
        required: false,
        default: null
    },
}, { timestamps: true });

export const Backtest = mongoose.model('Backtest', backtestSchema);