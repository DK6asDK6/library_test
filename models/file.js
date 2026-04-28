/*
 * File collection model file
 * IMPORTS:
 *  - mongoose - library for creating structured models
 * EXPORTS:
 *  - File - schema for 'files' collection
 */

const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
    file: {
        type: Buffer,
        required: [true, 'File is required'],
    }
}, { timestamps: true });

module.exports = mongoose.model('File', fileSchema);

/*
 * END OF 'file.js' FILE
 */