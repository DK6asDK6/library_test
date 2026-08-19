const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Post = require('../models/post');

const upload = require('../middleware/upload');
const { validatePost, validationHandler } = require('../middleware/validation');
const { getCorrectionVariants } = require('../middleware/spellcheck');

// ============================================
// POST /:uid - Создание поста
// ============================================
router.post('/:uid', upload.array('files', 20), validatePost, validationHandler, async (req, res, next) => {
    try {
        let admin = null;
        const files = req.files || [];
        const uid = req.params.uid;

        let isApproved = 0;

        if (uid !== "0") {
            admin = await User.findById(uid);  // ← ДОБАВЛЕН await
        }

        if (!admin) {
            return res.status(404).json({ error: 'Access forbidden - user not found' });
        }

        const fileMetadata = files.map(file => ({
            originalName: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            url: `/uploads/${file.filename}`
        }));

        if (req.body.forceApprove === true && admin.access === 2) {
            isApproved = 1;
        }

        const postData = req.body.post || {};
        const post = new Post({
            sender_id: uid,
            sender_name: admin.login || 'Неизвестен',  // ← ИМЯ АВТОРА
            title: postData.title,
            text: postData.text || '',
            link: postData.link || '',
            access: postData.access || 0,
            isApproved: isApproved,
            files: fileMetadata
        });

        await post.save();
        return res.status(201).json(post);
    } catch (error) {
        console.error('❌ Ошибка создания поста:', error);
        next(error);
    }
});

// ============================================
// GET /:uid - Получение всех постов
// ============================================
router.get('/:uid', async (req, res, next) => {
    try {
        const uid = req.params.uid;
        let userAccess = 0;

        if (uid !== "0") {
            const user = await User.findById(uid);
            if (user) {
                userAccess = user.access;
            }
        }

        const userFilters = req.query.filters || null;
        let searchTitle = "";
        let wordConditions = [];

        if (userFilters && userFilters.title) {
            searchTitle = userFilters.title.trim();
            const wordVariants = getCorrectionVariants(searchTitle);
            wordConditions = wordVariants.map(variants => ({
                $or: variants.map(variant => ({
                    title: { $regex: variant, $options: 'i' }
                }))
            }));
        }

        let query = {
            access: { $lte: userAccess }
        };

        if (wordConditions.length > 0) {
            query.$and = wordConditions;
        }

        let posts = await Post.find(query, {
            _id: 1,
            sender_id: 1,
            sender_name: 1,
            title: 1,
            text: 1,
            link: 1,
            files: 1,
            isApproved: 1,
            access: 1
        });

        if (userAccess < 2) {
            posts = posts.filter(item => item.isApproved === 1);
        }

        // 🔥 ДОБАВЛЯЕМ ИМЯ АВТОРА
        for (let post of posts) {
            post = post.toObject();
            if (!post.sender_name || post.sender_name === '') {
                const user = await User.findById(post.sender_id);
                post.sender_name = user ? user.login : 'Неизвестен';
            }
        }

        return res.json(posts);
    } catch (error) {
        console.error('Error in /:uid:', error);
        next(error);
    }
});

// ============================================
// GET /one/:id/:uid - Получение одного поста
// ============================================
router.get('/one/:id/:uid', async (req, res, next) => {
    try {
        const post = await Post.findById(req.params.id);
        const uid = req.params.uid;
        let access = 0;

        if (uid !== "0") {
            const user = await User.findById(uid);
            if (user) {
                access = user.access;
            }
        }

        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        if (access === 2 || post.isApproved === 1) {
            return res.json(post);
        } else {
            return res.status(403).json({ error: 'Access forbidden' });
        }
    } catch (error) {
        next(error);
    }
});

// ============================================
// POST /appr/:uid - Одобрение/отзыв поста
// ============================================
router.post('/appr/:uid', async (req, res, next) => {
    try {
        const uid = req.params.uid;
        let admin = null;

        if (uid !== "0") {
            admin = await User.findById(uid);
        }

        if (!admin || admin.access < 2) {
            return res.status(403).json({ error: 'Access forbidden - admin rights required' });
        }

        const { postId, isApproved } = req.body;

        if (!postId) {
            return res.status(400).json({ error: 'postId is required' });
        }

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ error: 'No post found' });
        }

        post.isApproved = isApproved ? 1 : -1;
        await post.save();

        return res.json({ message: 'Success', isApproved: post.isApproved });
    } catch (error) {
        next(error);
    }
});

// ============================================
// DELETE /:uid/:id - Удаление поста (только админ)
// ============================================
router.delete('/:uid/:id', async (req, res) => {
    try {
        const { uid, id } = req.params;

        const admin = await User.findById(uid);
        if (!admin || admin.access !== 2) {
            return res.status(403).json({ error: 'Forbidden: Admin rights required' });
        }

        const deletedPost = await Post.findByIdAndDelete(id);
        if (!deletedPost) {
            return res.status(404).json({ error: 'Post not found' });
        }

        return res.status(200).json({ message: 'Post deleted successfully', postId: id });
    } catch (error) {
        console.error('Error deleting post:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;

/*
 * END OF 'posts.js' FILE
 */