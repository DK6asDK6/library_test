require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');

const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');
const fileRoutes = require('./routes/files');

const app = express();

// Middleware
app.use(express.json());

// Подключение к MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB');
}).catch(err => {
    console.error('MongoDB connection error:', err);
});

// Регистрация маршрутов
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/files', fileRoutes);

// Базовый маршрут
app.get('/', (req, res) => {
    res.send('Node.js + MongoDB server is running!');
});

// Обработка 404
/*
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

*/

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
