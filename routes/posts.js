/*
 * Posts API managing file
 * IMPORTS:
 *  - from express:
 *      - router - router for processing requests connected to зщыеы
 *  - from models/post:
 *      - User - MongoDB schema for 'posts' collection
 *  - from middleware/validation:
 *      - validateUser: User validation requirements
 *      - validationHandler - function to check validation, returns error code.
 * EXPORTS:
 *  - router - request (for post API) handler
 */

const express = require('express');
const router = express.Router();
const Post = require('../models/post');
const { validatePost, validationHandler } = require('../middleware/validation');

// Post creation
router.post('/', validatePost, validationHandler, async (req, res, next) => {
    try {
        const post = new Post(req.body);
        await post.save();
        res.status(201).json(post);
    } catch (error) {
        next(error);
        // res.status(400).json({ error: error.message });
    }
});

// Get all posts
router.get('/', async (req, res) => {
    try {
        const posts = await Post.find()
            .populate('sender_id', 'login access') // Получаем только логин и роль пользователя
            .populate('files_id');
        res.json(posts);
    } catch (error) {
        next(error);
        // res.status(500).json({ error: error.message });
    }
});

// Get post with mentioned ID
router.get('/:id', async (req, res, next) => {
    try {
        const post = await Post.findById(req.params.id)
            .populate('sender_id', 'login access')
            .populate('files_id');

        if (!post) {
            return res.status(404).json({ error: 'Пост не найден' });
        }

        res.json(post);
    } catch (error) {
        next(error);
        // res.status(500).json({ error: error.message });
    }
});

// Post updating
router.put('/:id', validatePost, validationHandler, async (req, res, next) => {
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
        // res.status(400).json({ error: error.message });
        next(error);
    }
});

// Post deleting
router.delete('/:id', async (req, res, next) => {
    try {
        const post = await Post.findByIdAndDelete(req.params.id);

        if (!post) {
            return res.status(404).json({ error: 'Пост не найден' });
        }

        res.json({ message: 'Пост успешно удалён' });
    } catch (error) {
        // res.status(500).json({ error: error.message });
        next(error);
    }
});

module.exports = router;

/*
 * END OF 'posts.js' FILE
 */