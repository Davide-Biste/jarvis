import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const roles = ['user', 'admin'];

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
    metaApiToken: {
        type: String,
        default: null
    },
}, { timestamps: true });

userSchema.pre('save', async function(next) { //crypt password before saving
    try {
        if (!this.isModified('password')) return next();
        this.password = await bcrypt.hash(this.password, 10);
        next();
    } catch (e) {
        console.log({ errorHash: e });
    }

})

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


userSchema.methods.isValidPassword = async function(password) {
    const user = this;
    console.log(password)
    return bcrypt.compare(password, user.password);
}

export const User = mongoose.model('User', userSchema);