const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    login: {
        type: String,
        required: [true, 'Username is required'],
        unique: [true, 'Username has to be unique'],
        minlength: [5, 'Username must be at least 5 characters'],
        maxlength: [30, 'Username must be at maximum of 30 characters'],
        validate: {
            validator: (v) =>
            {
              return /^[a-zA-Z0-9_]+$/.test(v);
            },
            message: 'Login can only contain letters and numbers or \'_\' symbol'
        }
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
    },
    access: {
        type: Number,
        default: 1
    }
    }, { timestamps: true });

module.exports = mongoose.model('User', userSchema);