import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { encryptData } from '../../services/passwordCrypt/cryptToken.js';

const roles = ['user', 'admin'];

const metaApiSchema = new mongoose.Schema({
    token: {
        type: String,
        required: true
    },
    accountId: {
        type: String,
        required: true
    }
});

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        max: 19,
        required: true,
    },
    password: {
        type: String,
        max: 100,
        required: true,
    },
    isActive: {
        type: Boolean,
        default: true
    },
    role: {
        type: String, enum: roles,
        default: 'user'
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    metaApi: {
        type: metaApiSchema,
        default: null
    }
}, { timestamps: true });

// password
userSchema.pre('save', async function(next) { //crypt password before saving
    try {
        if (!this.isModified('password')) return next();
        this.password = await bcrypt.hash(this.password, 10);
        next();
    } catch (e) {
        console.log({ errorHash: e });
    }

})

// username
userSchema.pre('save', async function(next) {
    try {
        if (!this.isModified('username')) return next();
        const checkUniqueUsername = await User.findOne({ username: this.username });
        if (checkUniqueUsername) {
            throw new Error('Username already taken');
        }
    } catch (e) {
        return next(e);
    }
})

// metaApi
userSchema.pre('save', async function(next) {
    try {
        if (!this.isModified('metaApi')) return next();
        const tokenEncrypted = encryptData(this.metaApi.token, process.env.CRYPT_KEY);
        const accountIdEncrypted = encryptData(this.metaApi.accountId, process.env.CRYPT_KEY);
        this.metaApi = {
            token: tokenEncrypted,
            accountId: accountIdEncrypted
        }
    } catch (e) {
        return next(e);
    }
});

userSchema.methods.isValidPassword = async function(password) {
    const user = this;
    return bcrypt.compare(password, user.password);
}

export const User = mongoose.model('User', userSchema);