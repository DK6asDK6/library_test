const express = require('express');
const router = express.Router();
const Post = require('../models/post');
const { validatePost, validationHandler } = require('../middleware/validation');

// Создание поста
router.post('/', validatePost, validationHandler, async (req, res) => {
    try {
        const post = new Post(req.body);
        await post.save();
        res.status(201).json(post);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Получение всех постов с заполнением данных отправителя
router.get('/', async (req, res) => {
    try {
        const posts = await Post.find()
            .populate('sender_id', 'login access') // Получаем только логин и роль пользователя
            .populate('files_id');
        res.json(posts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Получение поста по ID
router.get('/:id', async (req, res) => {
    try {
        const post = await Post.findById(req.params.id)
            .populate('sender_id', 'login access')
            .populate('files_id');

        if (!post) {
            return res.status(404).json({ error: 'Пост не найден' });
        }

        res.json(post);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Обновление поста
router.put('/:id', validatePost, validationHandler, async (req, res) => {
    try {
        const post = await Post.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!post) {
            return res.status(404).json({ error: 'Пост не найден' });
        }

        res.json(post);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Удаление поста
router.delete('/:id', async (req, res) => {
    try {
        const post = await Post.findByIdAndDelete(req.params.id);

        if (!post) {
            return res.status(404).json({ error: 'Пост не найден' });
        }

        res.json({ message: 'Пост успешно удалён' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
