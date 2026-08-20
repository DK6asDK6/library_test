/*
 * Main server file
 * IMPORTS:
 *  - dotenv:
 *  - express
 *  - mongoose
 *  - from middleware/spellcheck:
 *      - initSpellChecker: spellchecker initialization function
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

// Spellchecker initialization
require('./middleware/spellcheck').initSpellChecker();

const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended: true}));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log('Connected to MongoDB');
}).catch(err => {
    console.error('MongoDB connection error:', err);
});

// API routes registration
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);

// Setting front/index.html as index file
app.use(express.static('front', {index: 'index.html'}));

// Basic route
app.get('/', (req, res) => {
    res.send('Node.js + MongoDB server is running!');
});

// Server launching
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

/*
 * END OF 'server.js' FILE
 */