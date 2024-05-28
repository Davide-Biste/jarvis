import mongoose, { Schema } from 'mongoose';

const subscriptionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    algorithm: { type: mongoose.Schema.Types.ObjectId, ref: 'Algorithm' },
    active: { type: Boolean, default: true }
}, { timestamps: true });

export const Subscription = mongoose.model('Subscription', subscriptionSchema);