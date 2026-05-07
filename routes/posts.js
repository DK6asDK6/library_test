/*
 * Posts API managing file (route 'api/posts/...')
 * IMPORTS:
 *  - from express:
 *      - router - router for processing requests connected to posts
 *  - from models/post:
 *      - Post - MongoDB schema for 'posts' collection
 *  - from modelt/user:
 *      - User - MongoDB schema for 'users' collection
 *  - from middleware/validation:
 *      - validatePost: Post validation requirements
 *      - validationHandler - function to check validation, returns error code.
 *  - from middleware/upload:
 *      - upload
 * EXPORTS:
 *  - router - request (for post API) handler
 */

const express = require('express');
const router = express.Router();
const User = require('../models/user')
const Post = require('../models/post');
const { validatePost, validationHandler } = require('../middleware/validation');

/*
 * Post creation (without files) request (access 1 or more required)
 * Route: api/posts/{uid}
 * Request body:
 *  - post: structure with following fields:
 *      - title: string 1-200 symbols in length
 *      - text (optional): post's text, default: null string
 *      - link (optional): link to archive page (if exists), default: null string
 *      - access (optional): access level to see this post, default: 0
 * Response body:
 *  - post - whole post structure
 */
router.post('/:uid', validatePost, validationHandler, upload.array('files', 20), async (req, res, next) => {
    try {
        const admin = User.findById(req.params.uid);
        const files = req.files || []

        const fileMetadata = files.map(file =>({
            originalName: file.originalName,
            // filename: file.filename,
            // path: file.path,
            mimetype: file.mimetype,
            size: file.size,
            url: `/uploads/${file.filename}`
        }));

        if (!admin)
            res.status(404).send('Access forbidden');

        const post = new Post(req.body.post);
        post.sender_id = req.params.uid;
        post.files = fileMetadata;
        await post.save();
        res.status(201).json(post);
    } catch (error) {
        next(error);
        // res.status(400).json({ error: error.message });
    }
});

/* Get all posts (if not admin, approved only)
 * Route: api/posts/{uid - optional}
 * Request body: None
 * Response body:
 *  - posts: array of posts info (_id, title, sender_id, isApproved, sender_name)
 */
router.get('/:uid?', async (req, res) => {
    try {
        const uid = req.params.uid;
        let access = 0;

        if (uid) {
            let user = User.findById(uid);

            if (user)
                access = user.access;
        }

        let posts = await Post.find({access: {$lte: access}},
            {_id:1, sender_id: 1, title: 1, isApproved: 1});

        if (access < 2)
            posts = posts.filter(item => item.isApproved);

        for (let post of posts) {
            post.sender_name = await User.findById(post.sender_id).login;
        }

        res.json(posts);
    } catch (error) {
        next(error);
        // res.status(500).json({ error: error.message });
    }
});

// Get post with mentioned ID
router.get('/:id', async (req, res, next) => {
    try {
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
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