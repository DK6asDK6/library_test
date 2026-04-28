/*
 * User collection model file
 * IMPORTS:
 *  - mongoose - library for creating structured models
 *  - bcrypt - library for hashing passwords
 * EXPORTS:
 *  - User - schema for 'users' collection
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

/*
 * User schema structure
 * Fields:
 *  - login - username. Contains string 5-30 characters length, has to be unique
 *  - password - user's hashed password
 *  - access - user's access to posts and editing them.
 *             0 - guest (unregistered), 1 - moderator (common registered), 2 - admin.
 *             on register, access is 1, can be changed only by admin
 */
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

userSchema.pre('save', async function () {
   if (!this.isModified('password')) return;

   try {
       const salt = await bcrypt.genSalt(10);
       this.password = await bcrypt.hash(this.password, salt);
   }catch(err) {
       throw err;
   }
});

userSchema.methods.isValidPassword = async function (password) {
    return bcrypt.compare(password, this.password);
}

module.exports = mongoose.model('User', userSchema);

/*
 * END OF 'user.js' FILE
 */