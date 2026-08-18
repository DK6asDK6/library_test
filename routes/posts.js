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
 *  - from middleware/spellcheck:
 *      - getCorrectionVariants - function to handle user's input mistakes while searching
 * EXPORTS:
 *  - router - request (for post API) handler
 */

const express = require('express');
const router = express.Router();
const User = require('../models/user')
const Post = require('../models/post');

const upload = require('../middleware/upload');
const { validatePost, validationHandler } = require('../middleware/validation');
const {getCorrectionVariants} = require('../middleware/spellcheck');


/*
 * Post creation (without files) request (access 1 or more required)
 * Route: api/posts/{uid - user ID (or 0 if guest)}
 * Request body:
 *  - post: structure with following fields:
 *      - title: string 1-200 symbols in length
 *      - text (optional): post's text, default: null string
 *      - link (optional): link to archive page (if exists), default: null string
 *      - access (optional): access level to see this post, default: 0
 *      - forceApprove (optional): force approve post (admins only)
 * Response body:
 *  - post - whole post structure
 */
router.post('/:uid', upload.array('files', 20), validatePost, validationHandler, async (req, res, next) => {
    try {
        let admin = null;
        const files = req.files || []
        const uid = req.params.uid;

        let isApproved = false;
        let post = null;

        if (uid !== "0")
            admin = User.findById(uid);

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

        if (req.body.forceApprove !== undefined)
            if (req.body.forceApprove === true)
                if (admin.access === 2)
                    isApproved = true;
                else
                    res.status(404).send('Access forbidden');

        post = new Post(req.body.post);
        post.sender_id = req.params.uid;
        post.files = fileMetadata;

        await post.save();
        res.status(201).json(post);
    } catch (error) {
        next(error);
    }
});


/* Get all posts (if not admin, approved only)
 * Route: api/posts/{uid - user ID (or 0 if guest)}
 * Request body:
 *  - filters (optional) - JSON with additional filters
 *      - title - title substring to search
 * Response body:
 *  - posts: array of posts info (_id, title, sender_id, isApproved, sender_name)
 */
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
            title: 1,
            isApproved: 1,
            access: 1
        });

        if (userAccess < 2) {
            posts = posts.filter(item => item.isApproved === 1);
        }

        for (let post of posts) {
            const user = await User.findById(post.sender_id);
            post = post.toObject();
            post.sender_name = user ? user.login : 'Unknown';
        }

        res.json(posts);

    } catch (error) {
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

        if (uid !== "0"){
            let user = User.findById(uid)

            if (user)
                access = user.access;
        }

        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        } else if (access === 2 || post.isApproved === 1)
            res.json(post);
        else
            res.status(404).send('Access forbidden');


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
    try{
        const uid = req.params.uid;
        let admin = null;

        if (uid !== "0")
            admin = await User.findById(uid);

        if (!admin || admin.access < 2)
            res.status(404).send('Access forbidden');

        const {postId, isApproved} = req.body;

        const post = await Post.findById(postId);

        if (!post)
            res.status(404).send('No post found');

        if (isApproved)
            post.isApproved = 1;
        else
            post.isApproved = -1;

        post.save();

        res.json({message: 'Success'});

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
router.delete('/:id/:uid', async (req, res, next) => {
    try {
        const {id, uid} = req.params;
        let admin = null;

        if (uid !== "0")
            admin = await User.findById(uid);

        if (!admin || admin.access < 2)
            res.status(404).send('Access forbidden');

        const post = await Post.findByIdAndDelete(id);

        if (!post) {
            return res.status(404).json({ error: 'No post found' });
        }

        res.json({ message: 'Success' });
    } catch (error) {
        // res.status(500).json({ error: error.message });
        next(error);
    }
});

module.exports = router;

/*
 * END OF 'posts.js' FILE
 */