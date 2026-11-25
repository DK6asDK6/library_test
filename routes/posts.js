const {createLogger} = require('../utils/logger');
const log = createLogger('posts');

const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Post = require('../models/post');

const upload = require('../middleware/upload');
const { validatePost, validationHandler } = require('../middleware/validation');
const { getCorrectionVariants } = require('../middleware/spellcheck');

/*
 * Post creation request (access 1 or more required)
 * Route: api/posts/{uid - user ID (or 0 if guest)}
 * Request body:
 *  - post: structure with fields: title, text, link, access, tags[]
 */
router.post('/:uid', upload.array('files', 20), validatePost, validationHandler, async (req, res, next) => {
    try {
        let admin = null;
        const files = req.files || [];
        const uid = req.params.uid;

        let isApproved = 0;

        if (uid !== "0") {
            admin = await User.findById(uid);
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

        // Normalize tags: deduplicate by category+value
        const rawTags = Array.isArray(postData.tags) ? postData.tags : [];
        const tagsMap = new Map();
        rawTags.forEach(t => {
            if (!t || !t.category || !t.value) return;
            const key = `${t.category}::${String(t.value).trim().toLowerCase()}`;
            if (!tagsMap.has(key)) {
                tagsMap.set(key, {
                    category: t.category,
                    value: String(t.value).trim()
                });
            }
        });
        const tags = Array.from(tagsMap.values());

        const post = new Post({
            sender_id: uid,
            sender_name: admin.login || 'Неизвестен',
            title: postData.title,
            text: postData.text || '',
            link: postData.link || '',
            tags: tags,
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

/*
 * Get all posts (if not admin, approved only)
 * Route: api/posts/{uid - user ID (or 0 if guest)}
 * Request body:
 *  - filters (optional) - JSON with additional filters:
 *      - title - title substring
 *      - tags - array of tag values (any match)
 *      - tagCategories - array of categories (restrict)
 */
router.get('/:uid', async (req, res, next) => {
    try {
        const uid = req.params.uid;
        let userAccess = 0;

        let wordConditions = [];
        let tagConditions = [];

        if (uid !== "0") {
            const user = await User.findById(uid);
            if (user) {
                userAccess = user.access;
            }
        }

        log.info('request query:', req.query);

        let tagFilter = null;
        if (req.query && req.query.filters) {
            const userFilters = JSON.parse(req.query.filters);

            // --- Text search ---
            let searchTitle = "";
            if (userFilters && userFilters.title) {
                searchTitle = userFilters.title.trim();
                const wordVariants = getCorrectionVariants(searchTitle);
                wordConditions = wordVariants.map(variants => ({
                    $or: [
                        ...variants.map(variant => ({
                            title: {$regex: variant, $options: 'i'}
                        })),
                        ...variants.map(variant => ({
                            text: {$regex: variant, $options: 'i'}
                        }))
                    ]
                }));
            }

            // --- Tag filter: match any of provided tag values ---
            if (userFilters && Array.isArray(userFilters.tags) && userFilters.tags.length > 0) {
                const values = userFilters.tags
                    .map(v => String(v).trim())
                    .filter(Boolean);

                const tagQuery = { 'tags.value': { $in: values } };

                // If tagCategories provided, restrict categories
                if (Array.isArray(userFilters.tagCategories) && userFilters.tagCategories.length > 0) {
                    tagQuery['tags.category'] = { $in: userFilters.tagCategories };
                }

                // Ensure same array element matches both conditions using $elemMatch
                tagConditions.push({
                    tags: {
                        $elemMatch: {
                            value: { $in: values },
                            ...(Array.isArray(userFilters.tagCategories) && userFilters.tagCategories.length > 0
                                ? { category: { $in: userFilters.tagCategories } }
                                : {})
                        }
                    }
                });
            }
        }

        let query = {
            access: { $lte: userAccess }
        };

        if (wordConditions.length > 0) {
            query.$and = wordConditions;
        }
        if (tagConditions.length > 0) {
            query.$and = (query.$and || []).concat(tagConditions);
        }

        let posts = await Post.find(query, {
            _id: 1,
            sender_id: 1,
            sender_name: 1,
            title: 1,
            text: 1,
            link: 1,
            files: 1,
            tags: 1,
            isApproved: 1,
            access: 1
        });

        if (userAccess < 2) {
            posts = posts.filter(item => item.isApproved === 1);
        }

        // Attach author name
        for (let post of posts) {
            post = post.toObject();
            if (!post.sender_name || post.sender_name === '') {
                const user = await User.findById(post.sender_id);
                post.sender_name = user ? user.login : 'Неизвестен';
            }
        }

        return res.json(posts.reverse());
    } catch (error) {
        log.error('have an error:', error);
        console.error('Error in /:uid:', error);
        next(error);
    }
});



/*
 * Get one post request
 * Route: api/posts/one/{id - post ID}/{uid - user ID (or 0 if guest)}
 * Request body: None
 * Response body: full post
 */
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

/*
 * Approve/Revoke post request
 * Route: api/posts/appr/{uid - user ID (or 0 if guest)}
 * Request body:
 *  - postId - post ID
 *  - isApproved - true if approved, false id revoked
 * Response body:
 *  - message
 */
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

/*
 * Post remove request
 * Route: api/posts/{id - post ID}/{uid - user ID (or 0 if guest)}
 * Request body: none
 * Response body:
 *  - message
 */
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

/*
 * Get tag cloud (counts by category+value)
 * Route: api/posts/tags/cloud/{uid - user ID (or 0 if guest)}
 * Response: { [category]: [{value, count}] }
 */
router.get('/tags/cloud/:uid', async (req, res, next) => {
    try {
        const uid = req.params.uid;
        let userAccess = 0;
        if (uid !== "0") {
            const user = await User.findById(uid);
            if (user) userAccess = user.access;
        }

        // Guests see only approved
        const match = userAccess < 2
            ? { $match: { isApproved: 1 } }
            : { $match: {} };

        const agg = await Post.aggregate([
            match,
            { $unwind: '$tags' },
            {
                $group: {
                    _id: { category: '$tags.category', value: '$tags.value' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);

        // Group by category
        const cloud = {};
        agg.forEach(item => {
            const cat = item._id.category;
            if (!cloud[cat]) cloud[cat] = [];
            cloud[cat].push({ value: item._id.value, count: item.count });
        });

        return res.json(cloud);
    } catch (error) {
        console.error('❌ Ошибка агрегации тегов:', error);
        next(error);
    }
});

module.exports = router;

/*
 * END OF 'posts.js' FILE
 */