// ============================================
// ЛОГИКА ГЛАВНОЙ СТРАНИЦЫ
// Файл: index.js
// ============================================

// --- КОНФИГУРАЦИЯ ---
const API_BASE_URL = 'http://localhost:3000/api';

// 🔥 ТОЛЬКО ОДНО ОБЪЯВЛЕНИЕ - В НАЧАЛЕ ФАЙЛА
const userId = localStorage.getItem('userId');
const userLogin = localStorage.getItem('userLogin');

// 🔥 ПЕРЕМЕННАЯ ДЛЯ ХРАНЕНИЯ ACCESS (НЕ В LOCALSTORAGE!)
let currentUserAccess = 0;

console.log('👤 Данные пользователя:', { userId, userLogin });

// --- DOM ЭЛЕМЕНТЫ ---
const postsContainer = document.getElementById('posts-container');
const guestControls = document.getElementById('guest-controls');
const userControls = document.getElementById('user-controls');
const userLoginDisplay = document.getElementById('user-login-display');
const userAccessDisplay = document.getElementById('user-access-display');
const adminLink = document.getElementById('admin-link');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const createPostBtn = document.getElementById('create-post-btn');
const refreshPostsBtn = document.getElementById('refresh-posts-btn');
const lastUpdateEl = document.getElementById('last-update');
const modal = document.getElementById('create-post-modal');
const cancelCreateBtn = document.getElementById('cancel-create-btn');
const createPostForm = document.getElementById('create-post-form');

// --- ФУНКЦИЯ ПОЛУЧЕНИЯ ACCESS С СЕРВЕРА ---
// --- ФУНКЦИЯ ПОЛУЧЕНИЯ ACCESS С СЕРВЕРА ---
// --- ФУНКЦИЯ ПОЛУЧЕНИЯ ACCESS С СЕРВЕРА ---
async function fetchUserAccess() {
    if (!userId) {
        console.log('👤 Гость (access: 0)');
        return 0;
    }

    try {
        console.log(`🔍 Запрашиваем уровень доступа для пользователя: ${userId}`);

        // 🔥 ДОБАВЛЯЕМ await
        const response = await fetch(`${API_BASE_URL}/users/access/${userId}`, {
            headers: { 'user-id': userId }
        });

        console.log('📥 Статус ответа от /access:', response.status);

        if (response.ok) {
            // 🔥 ДОБАВЛЯЕМ await
            const data = await response.json();
            console.log('📥 Ответ от /access:', data);

            // Используем поле accLevel
            if (data.accLevel !== undefined) {
                const accessLevel = data.accLevel;
                console.log(`✅ Уровень доступа получен: ${accessLevel}`);
                return accessLevel;
            } else {
                console.warn('⚠️ Поле accLevel не найдено в ответе:', data);
                return 1; // По умолчанию модератор
            }
        } else {
            console.warn(`⚠️ Не удалось получить access. Статус: ${response.status}`);
            return 1;
        }

    } catch (error) {
        console.error('❌ Ошибка при запросе уровня доступа:', error.message);
        return 1;
    }
}

// --- ОБНОВЛЕНИЕ ВРЕМЕНИ ---
function updateLastUpdateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    lastUpdateEl.textContent = `Последнее обновление: ${timeString}`;
}

// --- ОБНОВЛЕНИЕ ИНТЕРФЕЙСА ---
async function updateUI() {
    currentUserAccess = await fetchUserAccess();

    console.log('🔑 currentUserAccess после запроса:', currentUserAccess);

    if (userId) {
        guestControls.style.display = 'none';
        userControls.style.display = 'flex';
        userLoginDisplay.textContent = `👤 ${userLogin || userId}`;

        let roleText = 'Гость';
        if (currentUserAccess === 2) roleText = 'Администратор';
        else if (currentUserAccess === 1) roleText = 'Модератор';
        userAccessDisplay.textContent = `Роль: ${roleText}`;

        adminLink.style.display = currentUserAccess === 2 ? 'inline-block' : 'none';
        createPostBtn.style.display = currentUserAccess >= 1 ? 'inline-block' : 'none';
    } else {
        guestControls.style.display = 'block';
        userControls.style.display = 'none';
        createPostBtn.style.display = 'none';
        adminLink.style.display = 'none';
        userAccessDisplay.textContent = 'Роль: Гость';
        currentUserAccess = 0;
    }
}

// --- КНОПКИ ---
loginBtn.addEventListener('click', () => window.location.href = 'login.html');

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('userLogin');
    window.location.reload();
});

refreshPostsBtn.addEventListener('click', async () => {
    refreshPostsBtn.disabled = true;
    refreshPostsBtn.classList.add('spinning');
    refreshPostsBtn.textContent = '⏳ Загрузка...';

    try {
        await loadPosts();
        updateLastUpdateTime();
        refreshPostsBtn.style.background = '#28a745';
        setTimeout(() => refreshPostsBtn.style.background = '', 1000);
    } catch (error) {
        console.error('❌ Ошибка:', error);
        refreshPostsBtn.style.background = '#dc3545';
        setTimeout(() => refreshPostsBtn.style.background = '', 1000);
    } finally {
        refreshPostsBtn.disabled = false;
        refreshPostsBtn.classList.remove('spinning');
        refreshPostsBtn.textContent = '🔄 Обновить посты';
    }
});

// --- ЗАГРУЗКА ПОСТОВ ---
// --- ЗАГРУЗКА ПОСТОВ ---
async function loadPosts() {
    postsContainer.innerHTML = '<div class="loading">Загрузка постов...</div>';

    try {
        let url;
        const headers = {};

        if (userId) {
            // 🔥 Авторизованный пользователь — передаем его ID
            const filters = {};
            const filtersQuery = new URLSearchParams({ filters: JSON.stringify(filters) }).toString();
            url = `${API_BASE_URL}/posts/${userId}?${filtersQuery}`;
            headers['user-id'] = userId;
            headers['user-access'] = currentUserAccess;
        } else {
            // 🔥 ИСПРАВЛЕНО: Гость — передаем "0" вместо "guest"
            const filters = {};
            const filtersQuery = new URLSearchParams({ filters: JSON.stringify(filters) }).toString();
            url = `${API_BASE_URL}/posts/0?${filtersQuery}`;
            // Для гостя не отправляем user-id
        }

        console.log('📤 Загружаем посты:', url);

        const response = await fetch(url, { headers });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Ошибка: ${response.status}`);
        }

        const data = await response.json();
        console.log('📥 Получены посты:', data);

        let posts = [];
        if (Array.isArray(data)) {
            posts = data;
        } else if (data.posts && Array.isArray(data.posts)) {
            posts = data.posts;
        } else if (data.data && Array.isArray(data.data)) {
            posts = data.data;
        } else {
            posts = [];
        }

        displayPosts(posts);
    } catch (error) {
        console.error('❌ Ошибка загрузки постов:', error);
        postsContainer.innerHTML = `<div class="error">❌ ${error.message}</div>`;
    }
}

// --- ОТОБРАЖЕНИЕ ПОСТОВ ---
function displayPosts(posts) {
    if (!posts || posts.length === 0) {
        postsContainer.innerHTML = '<div style="text-align:center; padding:40px; color:#888;">📭 Пока нет ни одного поста</div>';
        return;
    }

    let html = '<div class="posts-grid">';
    posts.forEach(post => {
        const isApproved = post.isApproved === 1;
        const statusClass = isApproved ? 'status-approved' : 'status-pending';
        const statusText = isApproved ? '✅ Одобрен' : '⏳ На модерации';
        const authorLogin = post.sender_id?.login || post.authorLogin || 'Неизвестен';

        html += `
            <div class="post-card">
                <h3>${escapeHtml(post.title) || 'Без заголовка'}</h3>
                <p>${escapeHtml(post.text) || 'Нет содержания'}</p>
                ${post.link ? `<a href="${escapeHtml(post.link)}" target="_blank">🔗 Ссылка</a>` : ''}
                <div class="post-meta">
                    <span>🆔 ${post._id}</span>
                    <span>👤 ${escapeHtml(authorLogin)}</span>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </div>
                ${currentUserAccess === 2 ? `
                    <div class="post-actions">
                        <button class="btn ${isApproved ? 'btn-warning' : 'btn-success'}" 
                                data-action="toggle-approve" 
                                data-post-id="${post._id}">
                            ${isApproved ? 'Отозвать' : 'Одобрить'}
                        </button>
                        <button class="btn btn-danger" 
                                data-action="delete" 
                                data-post-id="${post._id}">
                            Удалить
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    });
    html += '</div>';
    postsContainer.innerHTML = html;

    if (currentUserAccess === 2) {
        document.querySelectorAll('[data-action="toggle-approve"]').forEach(btn => {
            btn.addEventListener('click', handleToggleApprove);
        });
        document.querySelectorAll('[data-action="delete"]').forEach(btn => {
            btn.addEventListener('click', handleDeletePost);
        });
    }
}

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// --- АДМИН: ОДОБРЕНИЕ/ОТЗЫВ ---
async function handleToggleApprove(event) {
    const btn = event.currentTarget;
    const postId = btn.dataset.postId;
    const originalText = btn.textContent;

    if (!confirm(`Вы уверены?`)) return;

    btn.disabled = true;
    btn.textContent = '⏳...';

    try {
        const response = await fetch(`${API_BASE_URL}/posts/appr/${userId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'user-id': userId,
                'user-access': currentUserAccess
            },
            body: JSON.stringify({ postId, isApproved: originalText.includes('Одобрить') })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Ошибка: ${response.status}`);
        }

        await loadPosts();
        updateLastUpdateTime();
    } catch (error) {
        console.error('❌ Ошибка:', error);
        alert(`Ошибка: ${error.message}`);
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

// --- АДМИН: УДАЛЕНИЕ ---
async function handleDeletePost(event) {
    const btn = event.currentTarget;
    const postId = btn.dataset.postId;
    const originalText = btn.textContent;

    if (!confirm(`Удалить пост?`)) return;

    btn.disabled = true;
    btn.textContent = '⏳...';

    try {
        const response = await fetch(`${API_BASE_URL}/posts/${userId}/${postId}`, {
            method: 'DELETE',
            headers: {
                'user-id': userId,
                'user-access': currentUserAccess
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Ошибка: ${response.status}`);
        }

        await loadPosts();
        updateLastUpdateTime();
    } catch (error) {
        console.error('❌ Ошибка:', error);
        alert(`Ошибка: ${error.message}`);
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

// --- СОЗДАНИЕ ПОСТА ---
createPostBtn.addEventListener('click', () => {
    modal.style.display = 'flex';
    document.getElementById('post-title').value = '';
    document.getElementById('post-content').value = '';
});

cancelCreateBtn.addEventListener('click', () => modal.style.display = 'none');
modal.addEventListener('click', (event) => {
    if (event.target === modal) modal.style.display = 'none';
});

createPostForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const title = document.getElementById('post-title').value.trim();
    const content = document.getElementById('post-content').value.trim();

    if (!title || !content) {
        alert('❌ Заголовок и содержание обязательны');
        return;
    }

    const submitBtn = createPostForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Отправка...';

    try {
        const requestData = {
            title: title,
            text: content,
            access: 0,
            post: {
                title: title,
                text: content,
                access: 0
            }
        };

        console.log('📤 Отправляем пост:', requestData);

        const response = await fetch(`${API_BASE_URL}/posts/${userId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'user-id': userId,
                'user-login': userLogin || 'unknown',
                'user-access': currentUserAccess
            },
            body: JSON.stringify(requestData),
        });

        const responseText = await response.text();
        console.log('📥 Ответ:', responseText);

        if (responseText.trim().startsWith('<!DOCTYPE')) {
            throw new Error('Сервер вернул HTML ошибку');
        }

        const data = JSON.parse(responseText);

        if (!response.ok) {
            let errorMsg = data.error || data.message || `Ошибка: ${response.status}`;
            if (data.details) {
                if (Array.isArray(data.details)) {
                    errorMsg = data.details.map(d => d.msg || d).join('. ');
                }
            }
            throw new Error(errorMsg);
        }

        modal.style.display = 'none';
        await loadPosts();
        updateLastUpdateTime();
        alert('✅ Пост создан! Ожидает одобрения.');

    } catch (error) {
        console.error('❌ Ошибка:', error);
        alert(`❌ Ошибка: ${error.message}`);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
});

// --- ЗАПУСК ---
async function init() {
    await updateUI();
    await loadPosts();
    updateLastUpdateTime();
}

init();

/*
 * END OF 'index.js' FILE
 */