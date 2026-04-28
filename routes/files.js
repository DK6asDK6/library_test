/*
 * Files API managing file
 * IMPORTS:
 *  - from express:
 *      - router - router for processing requests connected to files
 *  - from models/post:
 *      - User - MongoDB schema for 'posts' collection
 *  - from middleware/validation:
 *      - validateUser: User validation requirements
 *      - validationHandler - function to check validation, returns error code.
 *  - multer - library to handle file transfer
 *  - path
 * EXPORTS:
 *  - router - request (for post API) handler
 */

const express = require('express');
const router = express.Router();
const File = require('../models/file');
const { validateFile, validationHandler } = require('../middleware/validation');
const multer = require('multer');
const path = require('path');

// multer settings to operate with multipart/form-data
const storage = multer.memoryStorage(); // File is stored as Buffer
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 150 * 1024 * 1024 // No more than 150 MB allowed
    },
    fileFilter: (req, file, cb) => {
        // All types are allowed
        cb(null, true);
    }
});

// Downloading file (using multipart/form-data)
router.post('/', upload.single('file'), validateFile, validationHandler, async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'File was not found' });
        }

        const file = new File({
            file: req.file.buffer // Saving file as Buffer
        });

        await file.save();

        res.status(201).json({
            message: 'File downloaded successfully.',
            file: {
                _id: file._id,
                size: file.file.length,
                originalName: req.file.originalname,
                mimetype: req.file.mimetype
            }
        });
    } catch (error) {
        next(error);
        // res.status(500).json({ error: error.message });
    }
});

// Downloading several files (using multipart/form-data)
router.post('/multiple', upload.array('files'), async (req, res, next) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'Files were not found' });
        }

        const savedFiles = [];
        for (const file of req.files) {
            const newFile = new File({
                file: file.buffer
            });
            await newFile.save();
            savedFiles.push({
                _id: newFile._id,
                size: newFile.file.length,
                originalName: file.originalname,
                mimetype: file.mimetype
            });
        }

        res.status(201).json({
            message: `${savedFiles.length} files uploaded successfully.`,
            files: savedFiles
        });
    } catch (error) {
        // res.status(500).json({ error: error.message });
        next(error);
    }
});

// Get file from ID
router.get('/:id', async (req, res, next) => {
    try {
        const file = await File.findById(req.params.id);

        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }

        res.set('Content-Type', file.mimetype || 'application/octet-stream');
        res.set('Content-Disposition', `attachment; filename="${file._id}${path.extname(file.originalName || '')}"`);

        res.send(file.file);
    } catch (error) {
        // res.status(500).json({ error: error.message });
        next(error);
    }
});

// Deleting file from ID
router.delete('/:id', async (req, res, next) => {
    try {
        const file = await File.findByIdAndDelete(req.params.id);

        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }

        res.json({ message: 'File deleted successfully.' });
    } catch (error) {
        // res.status(500).json({ error: error.message });
        next(error);
    }
});

// Get metadata from file's ID
router.get('/info/:id', async (req, res, next) => {
    try {
        const file = await File.findById(req.params.id);

        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }

        res.json({
            _id: file._id,
            size: file.file.length,
            createdAt: file.createdAt,
            updatedAt: file.updatedAt
        });
    } catch (error) {
        // res.status(500).json({ error: error.message });
        next(error);
    }
});

module.exports = router;

/*
 * END OF 'files.js' FILE
 */
