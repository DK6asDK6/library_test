const {body, param, validationResult} = require('express-validator');

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
  body('sender_id')
      .trim().escape()
      .notEmpty().withMessage('sender is required'),
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
    body('files_id')
        .optional()
        .isArray().withMessage('files must be an Array')
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
}

module.exports = {
  validateUser,
  validatePost,
  validateFile,
  validationHandler
};