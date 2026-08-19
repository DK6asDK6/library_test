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
 * Request body: none
 * Response body:
 *  - users: array of structures with 'login' and 'access' fields
 */
router.get('/:aid', async (req, res, next) => {
    try {
        const { aid } = req.params;

        // 1. Проверяем, что пользователь существует
        const user = await User.findById(aid);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // 2. Проверяем, что это админ (access === 2)
        if (user.access !== 2) {
            return res.status(403).json({ error: 'Access forbidden - admin rights required' });
        }

        // 3. ✅ ПРАВИЛЬНО: возвращаем всех пользователей (без паролей)
        const users = await User.find({}, { password: 0 });
        return res.json(users);

    } catch (error) {
        console.error('❌ Ошибка в GET /:aid:', error);
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
    try {
        const { us_login, s_acc } = req.body;
        const id = req.params.id;

        // 🔥 ДОБАВЛЯЕМ await
        let admin = null;

        if (id !== "0") {
            admin = await User.findById(id); // ← добавили await
        }

        // Проверка, что админ существует и имеет права
        if (!admin || admin.access !== 2) {
            return res.status(403).json({ error: 'Access forbidden - admin rights required' });
        }

        // Проверка, что передан логин и уровень доступа
        if (!us_login || s_acc === undefined) {
            return res.status(400).json({ error: 'us_login and s_acc are required' });
        }

        // Проверка, что s_acc в допустимом диапазоне
        if (![0, 1, 2].includes(s_acc)) {
            return res.status(400).json({ error: 's_acc must be 0, 1, or 2' });
        }

        // 🔥 ДОБАВЛЯЕМ await ДЛЯ updateOne
        const result = await User.updateOne(
            { login: us_login },
            { $set: { access: s_acc } }
        );

        // Проверка, что пользователь найден и обновлен
        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        console.log(`✅ Права пользователя ${us_login} изменены на ${s_acc} администратором ${id}`);

        return res.status(200).json({
            message: 'Success',
            user: {
                login: us_login,
                access: s_acc
            }
        });

    } catch (error) {
        console.error('❌ Ошибка в POST /access/:id:', error);
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
// Удаление пользователя (только для администраторов)
// DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
    try {
        // 1. Получаем ID администратора из заголовка
        const adminId = req.headers['user-id'];
        // 2. Получаем ID пользователя, которого нужно удалить, из URL
        const userIdToDelete = req.params.id;

        // Проверка авторизации
        if (!adminId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Проверка прав администратора
        const admin = await User.findById(adminId);
        if (!admin || admin.access !== 2) {
            return res.status(403).json({ error: 'Forbidden: Admin rights required' });
        }

        // Запрет на удаление самого себя
        if (adminId === userIdToDelete) {
            return res.status(400).json({ error: 'Cannot delete yourself' });
        }

        // Удаление пользователя из базы данных
        const deletedUser = await User.findByIdAndDelete(userIdToDelete);
        if (!deletedUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Успешный ответ
        return res.status(200).json({ message: 'User deleted successfully', userId: userIdToDelete });
    } catch (error) {
        console.error('Error deleting user:', error);
        return res.status(500).json({ error: 'Internal server error' });
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
