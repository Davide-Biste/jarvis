import mongoose, { Schema } from 'mongoose';

const closingPositionMethod = ['tpsl', 'manual', 'oppositeSignal']

const algorithmSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    description: {
        type: String,
    },
    script: {
        type: String,
        required: true,
    },
    language: {
        type: String,
        required: true,
        enum: ['python', 'javascript']
    },
    status: {
        type: String,
        required: true,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    candles: {
        type: Number,
        required: true,
    },
    methodOfClosingPosition: {
        type: String,
        required: true,
        enum: closingPositionMethod,
        default: 'tpsl'
    }
}, { timestamps: true });

export const Algorithm = mongoose.model('Algorithm', algorithmSchema);