# Article Management API

A backend service that stores arbitrary data as **posts** and controls visibility based on user permissions. The permission system has three levels:

- `access = 0` – **Guest** (default, can view public posts)
- `access = 1` – **Moderator** (can view posts with access ≤ 1)
- `access = 2` – **Admin** (can view all posts)

At the time of writing, only the backend is complete; the frontend is under development and will be documented later.

---

## Table of Contents

- [Technology Stack](#technology-stack)
- [Code Style & Documentation](#code-style--documentation)
  - [File Header](#file-header)
  - [File Footer](#file-footer)
  - [Structure Comments](#structure-comments)
  - [Function Comments (Route Handlers)](#function-comments-route-handlers)
  - [General Function Comments](#general-function-comments)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Running the Server](#running-the-server)
- [API Endpoints](#api-endpoints)
- [Frontend Status](#frontend-status)
- [Contributing](#contributing)
- [License](#license)

---

## Technology Stack

- **Node.js** – JavaScript runtime
- **Express.js** – Web framework
- **MongoDB** – NoSQL database (with Mongoose ODM)
- **JavaScript (ES6+)** – Full‑stack language

---

## Code Style & Documentation

The codebase follows a strict commenting convention to keep it self‑documenting and maintainable. Every file, data structure, and function is preceded by a descriptive comment block.

### File Header

Each file must begin with a comment block that describes its purpose, lists all imports (grouped by external libraries and internal modules), and declares exports.

```javascript
/*
 * Brief description of the file
 * IMPORTS:
 *  - imported libraries
 *  - from internal directories
 *      - imported objects: purpose
 * EXPORTS:
 *  - exported objects
 */
```

### File Footer

Every file ends with a footer comment that clearly marks its end.

```javascript
/*
 * END OF 'filename' FILE
 */
```

### Function Comments (Route Handlers)

Route handler functions (typically POST, GET, DELETE) are documented with detailed information about the route, request body, and response body.
```javascript
/*
 * Brief description of the function
 * Route: API path
 * Request body:
 *  - field: description
 *  - (if a nested structure is passed)
 *  - field: structure with following fields:
 *      - subfield: description
 * Response body:
 *  - field - description
 */
```

### General Function Comments

For utility functions, middleware, and other non‑route functions, a simpler comment style is used (still including a description and details of parameters/return values when needed).

### Project Structure

The repository is organised as follows:

```
.
├── client/                     # (In development) Frontend application
├── middleware/
│   ├── upload.js               # Handles file uploads, enforces file size/type limits
│   └── validation.js           # Validates incoming structures for posts and users
├── models/
│   ├── post.js                 # Mongoose schema for posts
│   └── user.js                 # Mongoose schema for users
├── routes/
│   ├── posts.js                # Route handlers for post‑related endpoints
│   └── users.js                # Route handlers for user‑related endpoints
├── package.json                # Project metadata and dependencies
└── server.js                   # Entry point – starts Node server and connects to MongoDB
```
- client/ – Frontend code (currently under development, will be added later).

- middleware/upload.js – Manages file uploads, validates file types and sizes.

- middleware/validation.js – Validates request bodies for posts and users against defined schemas.

- models/ – Defines the database structures (Mongoose schemas) for Post and User.

- routes/ – Contains all route handlers for processing requests related to posts and users.

- server.js – Bootstraps the Express server and establishes the MongoDB connection.

### Frontend Status

The frontend part of the application is currently under development. Once ready, this section will be updated with instructions for setting up and running the client.
