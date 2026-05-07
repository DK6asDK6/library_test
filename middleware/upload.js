/*
 * File downloading settings file
 * IMPORTS:
 *  - multer
 *  - path
 *  - crypto
 * EXPORTS:
 *  - upload: multer downloading file settings
 */

const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(8).toString('hex');
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 150 * 1024 * 1024 // max 150 MiB
    },
    fileFilter: (req, file, cb) => {
        cb(null, true) //added for case we need to filter files by type
    }
})
