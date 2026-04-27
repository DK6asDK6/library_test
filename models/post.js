const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    sender_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required']
    },
    title: {
        type: String,
        required: [true, 'Title is required'],
        maxlength: [200, 'Title must have less than 200 characters'],
    },
    text: String,
    link: String,
    files_id: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'File'
    }]
}, { timestamps: true });

module.exports = mongoose.model('Post', postSchema);