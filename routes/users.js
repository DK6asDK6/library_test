const express = require('express');
const router = express.Router();
const User = require('../models/user');
const { validateUser, validationHandler } = require('../middleware/validation');

// Создание пользователя
router.post('/', validateUser, validationHandler, async (req, res) => {
    try {
        const user = new User(req.body);
        await user.save();
        res.status(201).json(user);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Пользователь с таким логином уже существует' });
        }
        res.status(400).json({ error: error.message });
    }
});

// Получение всех пользователей
router.get('/', async (req, res) => {
    try {
        const users = await User.find();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
