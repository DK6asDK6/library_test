/*
 * User API managing file
 * IMPORTS:
 *  - from express:
 *      - router - router for processing requests connected to user
 *  - from models/user:
 *      - User - MongoDB schema for 'users' collection
 *  - from middleware/validation:
 *      - validateUser: User validation requirements
 *  - validationHandler - function to check validation, returns error code.
 * EXPORTS:
 *  - router - request (for user API) handler
 */

const express = require('express');
const router = express.Router();
const User = require('../models/user');
const { validateUser, validationHandler } = require('../middleware/validation');

// User creation
router.post('/', validateUser, validationHandler, async (req, res, next) => {
    try {
        const user = new User(req.body);
        await user.save();
        res.status(201).json(user);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ error: 'User already exists' });
        }
        next(error);
        // res.status(400).json({ error: error.message });
    }
});

// Get all users
router.get('/', async (req, res, next) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (error) {
        next(error);
        // res.status(500).json({ error: error.message });
    }
});

// User log in
router.post('/login', async (req, res, next) => {
    try{
        const { login, password } = req.body;

        if (!login || !password) return res.status(400).json({ error: 'Login and password required' });

        const user = await User.findOne({login});
        if (!user) return res.status(400).json({ error: 'Incorrect username or password' });

        const isValid = await user.isValidPassword(password);
        if (!isValid) return res.status(400).json({ error: 'Incorrect password or login' });

        res.json({
            message: 'Authenticated successfully',
            user: {
                _id: user._id,
                login: user.login,
                access: user.access
            }
        })

    } catch (error) {
        next(error);
        // res.status(500).json({ error: error.message });
    }
});

module.exports = router;

/*
 * END OF 'users.js' FILE
 */
