/*
 * User API managing file (route 'api/users/...')
 * IMPORTS:
 *  - from express:
 *      - router - router for processing requests connected to user
 *  - from models/user:
 *      - User - MongoDB schema for 'users' collection
 *  - from middleware/validation:
 *      - validateUser: User validation requirements
 *  - validationHandler - function to check validation, returns error code.
 * EXPORTS:
 *  - router - request (for user API) handler
 */

const express = require('express');
const router = express.Router();
const User = require('../models/user');
const { validateUser, validationHandler } = require('../middleware/validation');


const DEFAULT_PASSWORD = 'SUAIisBEST';

/*
 * User register request
 * Route: api/users
 * Request body:
 *  - login: user's 'login' field
 *  - password: user's 'password' field
 * Response (if registered successfully):
 *  - message
 *  - user: structure with fields 'id' and 'login'
 */
router.post('/', validateUser, validationHandler, async (req, res, next) => {
    try {
        const user = new User(req.body);
        await user.save();
        res.status(201).json({
            message: 'Success',
            user: {
                _id: user._id,
                login: user.login
            }});
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ error: 'User already exists' });
        }
        next(error);
    }
});

/*
 * Get all users request (only admins allowed)
 * Route: api/users/{aid - admin's ID}
 * Request body:
 * Response body:
 *  - users: array of structures with 'login' and 'access' fields
 */
router.get('/:aid', async (req, res, next) => {
    try {
        const user = await User.findById(req.params.aid);

        if (user != null && user.access === 2) {
            const users = await User.find({}, {password: 0});
            const cursor = await users.toArray();
            res.json(cursor);
        } else {
            return res.status(404).json({error: 'Access forbidden'});
        }
    } catch (error) {
        next(error);
    }
});

/*
 * Get user's acces request
 * Route: api/users/{id - user ID (or 0 if guest)}
 * Request body:
 * Response body:
 *  - message: user's access level (0-2)
 */
router.get('/access/:id', async (req, res, next) => {
    try{
        const id = req.params.id;

        let user = null;

        if (id !== "0")
            user = await User.findById(id);

        if (!user || user.access === 0)
            res.status(201).json({
                message: 'Success',
                accLevel: 0
            });
        else
            res.status(201).json({
                message: user.access
            });

    } catch (error) {
        next(error);
    }
});

/*
 * User log in request
 * Route: api/users/login
 * Request body:
 *  - login: user's login
 *  - password: user's password
 * Response body (if logged in successfully):
 *  - _id: user's ID
 *  - login: user's login
 */
router.post('/login', async (req, res, next) => {
    try{
        const { login, password } = req.body;

        if (!login || !password) return res.status(400).json({ error: 'Login and password required' });

        const user = await User.findOne({login});
        if (!user) return res.status(400).json({ error: 'Incorrect username or password' });

        const isValid = await user.isValidPassword(password);
        if (!isValid) return res.status(400).json({ error: 'Incorrect password or login' });

        res.json({
            message: 'Success',
            user: {
                _id: user._id,
                login: user.login,
            }
        })

    } catch (error) {
        next(error);
    }
});

/*
 * Access set request (only admins allowed)
 * Route: api/users/access/{id - user ID (or 0 if guest)}
 * Request body:
 *  - us_login: user's login
 *  - s_acc: new access level
 * Response body:
 *  - message
 */
router.post('/access/:id', async (req, res, next) => {
    try{
        const {us_login, s_acc} = req.body;
        const id = req.params.id;

        let admin = null;

        if (id !== "0")
            admin = User.findById(id);

        if (admin != null && admin.access === 2) {
            User.updateOne({
                login: us_login},
                {
                    $set: {
                        access: s_acc
                    }
                });

            res.status(200).json({message: 'Success'});
        } else {
            return res.status(404).json({error: 'Access forbidden'});
        }

    } catch (error) {
        next(error);
    }
});

/*
 * Password reset request
 * Route: api/users/reset/{id - user ID (or 0 if guest)}
 * Request body:
 *  - pwd: old password
 *  - new_pwd: new password
 * Response body:
 *  - message
 */
router.post('/reset/:id', async (req, res, next) => {
   try{
       const {pwd, new_pwd} = req.body;
       const id = req.params.id;

       if (!pwd || !new_pwd)
           return res.status(400).json({ error: 'Old and new passwords required' });

       let user = null;

       if (id !== "0")
           user = await User.findById(id);

       if (!user)
           return res.status(404).json({ error: 'Failed to find user' });

       const isValid = await User.isValidPassword(pwd);
       if (!isValid)
           return res.status(404).json({ error: 'Incorrect password' });

       user.password = new_pwd;
       await user.save();

       res.status(200).json({message: 'Success'});

   } catch (error) {
       next(error);
   }
});


/*
 * Password reset request (admins only)
 * Route: api/users/reset_admin/{id - admin's ID (or 0 if guest)}
 * Request body:
 *  - us_login: user's login
 *  - new_pwd (optional): new password to set, if undefined, inserts DEFAULT_PASSWORD
 * Response body:
 *  - message
 */
router.post('/reset_admin/:id', async (req, res, next) => {
    try{
        let {us_login, new_pwd} = req.body;
        const id = req.params.id;

        if (new_pwd === undefined)
            new_pwd = DEFAULT_PASSWORD;

        let admin = null;

        if (id !== "0")
            admin = await User.findById(id);

        if (!admin || admin.access < 2)
            return res.status(404).json({ error: 'Access forbidden' });

        let user = await User.findOne({login: us_login});

        if (!user)
            return res.status(404).json({ error: 'Failed to find user' });

        user.password = new_pwd;
        await user.save();

        res.status(200).json({message: 'Success'});
    } catch (error) {
        next(error);
    }
});

/*
 * Delete account request
 * Route: api/users/{id - user ID (or 0 if guest)}
 * Request body:
 *  - password: user password to approve account deletion
 * Response body:
 *  - message
 */
router.delete('/:id', async (req, res, next) => {
    try{
        const id = req.params.id;
        const pwd = req.body.password;

        if (!pwd) res.status(400).json({ error: 'Password is required' });


        if (id === "0") res.status(404).json({ error: 'Access forbidden' });

        let user = await User.findById(id);

        if (!user) res.status(404).json({ error: 'Failed to find user' });

        const isValid = await user.isValidPassword(pwd);
        if (!isValid) res.status(404).json({ error: 'Incorrect password' });

        const removedUser = await User.findByIdAndDelete(id);

        if (!removedUser) return res.status(404).json({ error: 'Failed to find user' });

        res.json({message: 'Success'});
    } catch (error) {
        next(error);
    }
});

/*
 * Delete other's account request (admins only)
 * Route: api/users/adm/{id - admin's ID (or 0 if guest)}
 * Request body:
 *  - us_login: user's login
 *  - password: admin's password to approve user's deletion
 * Response body:
 *  - message
 */
router.delete('/adm/:id', async (req, res, next) => {
    try{
        const id = req.params.id;
        const {us_login, password} = req.body;

        if (id === "0") res.status(404).json({ error: 'Access forbidden' });
        if (!password) res.status(400).json({ error: 'Old and new passwords required' });

        const admin = await User.findById(id);

        if (!admin) res.status(404).json({ error: 'Access forbidden' });

        const isValid = await admin.isValidPassword(password);

        if (!isValid) res.status(404).json({ error: 'Incorrect password' });

        const user = await User.findByIdAndDelete(us_login);

        if (!user) return res.status(404).json({ error: 'Failed to find user' });

        res.json({message: 'Success'});

    } catch (error) {
        next(error);
    }
});

module.exports = router;

/*
 * END OF 'users.js' FILE
 */
