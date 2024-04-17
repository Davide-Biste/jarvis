import mongoose, { Schema } from 'mongoose';

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
}, { timestamps: true });

export const Algorithm = mongoose.model('Algorithm', algorithmSchema);