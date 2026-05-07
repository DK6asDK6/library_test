/*
 * Request validation file
 * IMPORTS:
 *  - from express-validator:
 *      - body: database collection field requirement
 *      - validationResult - function; returns errors array
 * EXPORTS:
 *  - validateUser, validatePost, validateFile - database collections' requirements
 *  - validationHandler - function to check validation, returns error code.
 */

const {body, validationResult} = require('express-validator');

const validateUser = [
    body('login')
        .trim()
        .escape()
        .notEmpty().withMessage('Username can\'t be empty')
        .isLength({min: 5, max: 30}).withMessage('Username must be from 5 to 30 characters'),
    body('password')
        .notEmpty().withMessage('Password can\'t be empty'),
];

const validatePost = [
  body('title')
      .trim().escape()
      .notEmpty().withMessage('title is required')
      .isLength({max: 200}).withMessage('title must be at maximum of 200 characters'),
    body('text')
        .optional()
        .trim().escape(),
    body('link')
        .optional()
        .trim().isURL().withMessage('Invalid URL'),
    body('access')
        .optional()
        .isInt().withMessage('access must be a number'),
]

const validateFile = [
    body('file')
        .notEmpty().withMessage('file is required'),
]

const validationHandler = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array()
        })
    }
    next();
};

module.exports = {
  validateUser,
  validatePost,
  validateFile,
  validationHandler
};

/*
 * END OF 'validation.js' FILE
 */