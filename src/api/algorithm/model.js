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
    }
}, { timestamps: true });

export const Algorithm = mongoose.model('Algorithm', algorithmSchema);