// ============================================
// СТРАНИЦА ВХОДА / РЕГИСТРАЦИИ
// Файл: login.js
// ============================================

// --- КОНФИГУРАЦИЯ ---
const BASE_URL = window.location.origin;
const API_BASE_URL = BASE_URL + '/api';

// --- DOM ЭЛЕМЕНТЫ ---
const form = document.getElementById('auth-form');
const loginInput = document.getElementById('login');
const passwordInput = document.getElementById('password');
const submitBtn = document.getElementById('submit-btn');
const formTitle = document.getElementById('form-title');
const toggleText = document.getElementById('toggle-text');
const toggleAction = document.getElementById('toggle-action');
const errorMessageDiv = document.getElementById('error-message');

let isLoginMode = true;

// --- ФУНКЦИИ ---
function setMode(mode) {
    isLoginMode = mode;
    if (mode) {
        formTitle.textContent = 'Вход';
        submitBtn.textContent = 'Войти';
        toggleText.textContent = 'Нет аккаунта?';
        toggleAction.textContent = 'Зарегистрироваться';
    } else {
        formTitle.textContent = 'Регистрация';
        submitBtn.textContent = 'Зарегистрироваться';
        toggleText.textContent = 'Уже есть аккаунт?';
        toggleAction.textContent = 'Войти';
    }
    errorMessageDiv.style.display = 'none';
    errorMessageDiv.textContent = '';
}

function showError(message) {
    errorMessageDiv.textContent = message;
    errorMessageDiv.style.display = 'block';
}

function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    submitBtn.textContent = isLoading ? '⏳ Отправка...' : (isLoginMode ? 'Войти' : 'Зарегистрироваться');
}

// --- ОБРАБОТЧИКИ ---
toggleAction.addEventListener('click', () => {
    setMode(!isLoginMode);
});

// --- ОСНОВНАЯ ФУНКЦИЯ ВХОДА/РЕГИСТРАЦИИ ---
form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorMessageDiv.style.display = 'none';
    errorMessageDiv.textContent = '';

    const login = loginInput.value.trim();
    const password = passwordInput.value.trim();

    if (!login || !password) {
        showError('Пожалуйста, заполните все поля.');
        return;
    }

    setLoading(true);

    const endpoint = isLoginMode ? '/users/login' : '/users';
    const url = `${API_BASE_URL}${endpoint}`;

    const requestBody = {
        login: login,
        password: password
    };

    console.log('📤 Отправляем запрос:', { url, body: requestBody });

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        let data;
        const contentType = response.headers.get('content-type');

        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            const text = await response.text();
            console.error('❌ Ответ не в JSON формате:', text);
            throw new Error(`Сервер вернул: ${text.substring(0, 200)}`);
        }

        console.log('📥 Полный ответ сервера:', JSON.stringify(data, null, 2));

        // --- ОБРАБОТКА ОШИБОК ---
        if (!response.ok) {
            let errorMsg = data.message || data.error || 'Произошла ошибка.';
            throw new Error(errorMsg);
        }

        // --- УСПЕШНЫЙ ВХОД ---
        if (isLoginMode) {
            let userId = null;
            let userLogin = null;

            // Извлекаем ID и логин из ответа
            if (data.user && data.user._id) {
                userId = data.user._id;
                userLogin = data.user.login;
            } else if (data._id) {
                userId = data._id;
                userLogin = data.login;
            } else if (data.userId) {
                userId = data.userId;
                userLogin = data.login;
            }

            if (userId) {
                // 🔥 Сохраняем ТОЛЬКО ID и логин
                // Уровень доступа НЕ СОХРАНЯЕМ!
                localStorage.setItem('userId', userId);
                localStorage.setItem('userLogin', userLogin || login);

                // Удаляем старый access если был (для безопасности)
                localStorage.removeItem('userAccess');

                console.log('✅ Успешный вход:', { userId, userLogin });
                console.log('ℹ️ Access будет запрошен при загрузке страницы');

                window.location.href = 'index.html';
            } else {
                console.error('❌ Не найден userId в ответе:', data);
                throw new Error('Не удалось получить ID пользователя.');
            }
        }
        // --- УСПЕШНАЯ РЕГИСТРАЦИЯ ---
        else {
            if (data.message === 'Success' && data.user && data.user._id && data.user.login) {
                // 🔥 При регистрации сохраняем только ID и логин
                // Access не храним - он запросится при входе
                localStorage.setItem('userId', data.user._id);
                localStorage.setItem('userLogin', data.user.login);
                localStorage.removeItem('userAccess');

                alert('✅ Регистрация прошла успешно! Вы автоматически получили права модератора.');
                window.location.href = 'index.html';
            } else {
                console.error('❌ Неверный формат ответа при регистрации:', data);
                throw new Error('Неверный формат ответа от сервера при регистрации.');
            }
        }

    } catch (error) {
        console.error('❌ Ошибка:', error);

        let errorMessage = error.message || 'Не удалось соединиться с сервером.';

        if (error.message.includes('Failed to fetch') ||
            error.message.includes('NetworkError')) {
            errorMessage = '❌ Не удается подключиться к серверу.\n\n' +
                'Проверьте:\n' +
                '1. Запущен ли сервер (npm start)\n' +
                `2. Адрес сервера: ${API_BASE_URL}`;
        }

        showError(errorMessage);
    } finally {
        setLoading(false);
    }
});

// --- ПРОВЕРКА: если пользователь уже авторизован ---
if (localStorage.getItem('userId')) {
    window.location.href = 'index.html';
}

/*
 * END OF 'login.js' FILE
 */