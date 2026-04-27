const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
    file: {
        type: Buffer,
        required: [true, 'File is required'],
    }
}, { timestamps: true });

module.exports = mongoose.model('File', fileSchema);