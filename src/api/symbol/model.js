import mongoose from 'mongoose';

const symbolSchema = new mongoose.Schema({
    symbolPair: {
        type: String,
        required: true,
    },
    longName: {
        type: String,
        max: 100
    },
}, { timestamps: true });

export const Symbols = mongoose.model('Symbols', symbolSchema);