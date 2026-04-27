const express = require('express');
const router = express.Router();
const File = require('../models/file');

// Загрузка файла
router.post('/', async (req, res) => {
    try {
        // В реальном приложении здесь будет парсинг multipart/form-data
        // Для примера предположим, что файл приходит в виде base64 строки
        const fileBuffer = Buffer.from(req.body.file, 'base64');
        const file = new File({ file: fileBuffer });
        await file.save();
        res.status(201).json(file);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Получение файла
router.get('/:id', async (req, res) => {
    try {
        const file = await File.findById(req.params.id);
        if (!file) return res.status(404).json({ error: 'File not found' });

        // Устанавливаем заголовок Content-Type на основе типа файла (в реальном приложении нужно определить тип)
        res.set('Content-Type', 'application/octet-stream');
        res.send(file.file);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
