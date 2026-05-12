/*
 * Main server file
 * IMPORTS:
 *  - dotenv:
 *  - express
 *  - mongoose
 *  - from routes/users:
 *      - userRoutes: user authentification functions
 *  - from routes/posts:
 *      - postRoutes: post managing functions
 *  - from routes/files:
 *      - fileRoutes: file managing functions
 * EXPORTS: None.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended: true}));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {}).then(() => {
    console.log('Connected to MongoDB');
}).catch(err => {
    console.error('MongoDB connection error:', err);
});

// API routes registration
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);



// Basic route
app.get('/', (req, res) => {
    res.send('Node.js + MongoDB server is running!');
});


// Error 404 handling
/*
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});
*/

// Server launching
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

/*
 * END OF 'server.js' FILE
 */