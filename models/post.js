/*
 * Posts collection model file
 * IMPORTS:
 *  - mongoose - library for creating structured models
 * EXPORTS:
 *  - Post - schema for 'posts' collection
 */

const mongoose = require('mongoose');

/*
 * Post schema structure
 * Fields:
 *  - sender_id - sender ID, referred to 'User' schema
 *  - sender_name - sender username
 *  - title - post's title, up to 200 symbols
 *  - text - inner text (if exists).
 *  - link - link to Web Archive page (if exists)
 *  - files - array of files' metadata
 */
const postSchema = new mongoose.Schema({
    sender_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required']
    },
    sender_name: {
        type: String,
        required: [true, 'Author username is required']
    },
    title: {
        type: String,
        required: [true, 'Title is required'],
        maxlength: [200, 'Title must have less than 200 characters'],
    },
    text: String,
    link: String,
    files: [{
        // originalName: String, // original filename
        filename: String,     // server-saved filename
        // path: String,         // file path
        mimeType: String,     // MIME-type
        size: Number,         // Size (in bytes)
        url: String,          // Public URL
    }],
    access: {
        type: Number,
        default: 0
    },
    isApproved: {
        type: Number,
        default: 0 // 0 - needed to approve, 1 - approved, -1 - revoked
    }
}, { timestamps: true });

module.exports = mongoose.model('Post', postSchema);

/*
 * END OF 'post.js' FILE
 */