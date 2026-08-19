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
- [Frontend Status](#frontend-status)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running the Server](#running-the-server)
- [API Endpoints](#api-endpoints)
---

## Technology Stack

- **Node.js** – JavaScript runtime
- **Express.js** – Web framework
- **MongoDB** – NoSQL database (with Mongoose ODM)
- **JavaScript (ES6+)** – Full‑stack language

---

## Code Style & Documentation

The codebase follows a strict commenting convention to keep itself‑documenting and maintainable. Every file, data structure, and function is preceded by a descriptive comment block.

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

### Structure Comments

For data structures (e.g., Mongoose schemas) the following format is used:
```javascript
/*
 * Brief description of the structure
 * Fields:
 *  - field name - purpose
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

General functions are documentated with detailed information about parameters and return values.
```javascript
/*
 * Brief description of the function
 * PARAMETERS:
 *  - field: description
 *  - (if a nested structure is passed)
 *  - field: structure with following fields:
 *      - subfield: description
 * RETURNS:
 *  - field - description
 */
```
Every general function ends with a footer comment
```javascript
/*
 * End of 'function' function
 */
```

## Project Structure

The repository is organised as follows:

```
.
├── client/                     # (In development) Frontend application
├── middleware/
│   ├── spellcheck.js           # Handles spellchecker functions
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

- middleware/spellcheck.js - Initializes spellchecker and handles requests connected with user input.

- middleware/upload.js – Manages file uploads, validates file types and sizes.

- middleware/validation.js – Validates request bodies for posts and users against defined schemas.

- models/ – Defines the database structures (Mongoose schemas) for Post and User.

- routes/ – Contains all route handlers for processing requests related to posts and users.

- server.js – Bootstraps the Express server and establishes the MongoDB connection.

## Frontend Status

The frontend part of the application is currently under development. Once ready, this section will be updated with instructions for setting up and running the client.

## Getting started

### Prerequisites

- Node.js (v14 or later)
- MongoDB (v7.0.37 or later)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/DK6asDK6/library_test.git
cd  library_test
```

2. Install dependencies:
```bash
npm install
```

### Running the Server

Start server in production mode:
```bash
npm start
```

## API Endpoints

The main endpoints are:
- POST /api/users - Register new user
- GET /api/users - Get list of all users (request allowed only for admins)
- GET /api/users/access/:id - Get user's access level
- POST /api/users/login - Log user in
- POST /api/users/access - Set user's access level (request allowed only for admins)
- POST /api/users/reset - Reset user's password (old password required)
- POST /api/users/reset_admin - Reset other user's password (request allowed only for admins)
- DELETE /api/users/:id - Delete an Account
- DELETE /api/users/adm/:id - Delete other's user account (request allowed only for admins)
- POST /api/posts/:uid - Create new post (access 1 or more required)
- GET /api/posts/:uid - Show all posts (if user is not admin, only approved ones are shown)
- GET /api/posts/one/:id - Show one post
- POST /api/posts/appr/:uid - Approve or Revoke post (request allowed only for admins)
- DELETE /api/posts/:uid/:id - Remove one post (request allowed only for admins)