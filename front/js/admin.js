// ============================================
// ПАНЕЛЬ АДМИНИСТРАТОРА
// Файл: admin.js
// ============================================

// === КОНФИГУРАЦИЯ API ===
const API_CONFIG = {
    // Порт бекенда (по умолчанию 3000)
    port: 3000,
    // Путь к API
    path: '/api'
};

const API_BASE_URL = (() => {
    const { hostname, protocol } = window.location;

    // Если мы на localhost
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return `${protocol}//${hostname}:${API_CONFIG.port}${API_CONFIG.path}`;
    }

    // Если мы на production
    // Можно использовать относительный путь или полный URL
    return API_CONFIG.path;
})();

console.log('🔗 API_BASE_URL:', API_BASE_URL);

// --- ПОЛУЧАЕМ ДАННЫЕ ПОЛЬЗОВАТЕЛЯ ИЗ LOCALSTORAGE ---
const userId = localStorage.getItem('userId');
const userLogin = localStorage.getItem('userLogin');

// --- ПРОВЕРКА ПРАВ АДМИНИСТРАТОРА НА СЕРВЕРЕ ---
// --- ПРОВЕРКА ПРАВ АДМИНИСТРАТОРА ---
async function checkAdminAccess() {
    if (!userId) {
        alert('⛔ Доступ запрещен. Требуется авторизация.');
        window.location.href = 'index.html';
        return false;
    }

    try {
        console.log(`🔍 Проверка прав администратора для: ${userId}`);

        // 1. Пробуем GET /api/users/access/:id
        const response = await fetch(`${API_BASE_URL}/users/access/${userId}`, {
            headers: { 'user-id': userId }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.access === 2) {
                console.log('✅ Доступ разрешен через /access');
                return true;
            }
        }

        // 2. Проверяем, есть ли неодобренные посты
        console.log('🔍 Проверяем через посты...');
        const filters = {};
        const filtersQuery = new URLSearchParams({ filters: JSON.stringify(filters) }).toString();
        const postsResponse = await fetch(`${API_BASE_URL}/posts/${userId}?${filtersQuery}`, {
            headers: { 'user-id': userId }
        });

        if (postsResponse.ok) {
            const posts = await postsResponse.json();
            const hasPendingPosts = posts.some(post => post.isApproved === 0);

            if (hasPendingPosts) {
                console.log('✅ Обнаружены неодобренные посты → АДМИН');
                return true;
            }
        }

        // Если ничего не сработало — доступ запрещен
        console.warn('⛔ Доступ запрещен');
        alert('⛔ Доступ запрещен. Требуются права администратора.');
        window.location.href = 'index.html';
        return false;

    } catch (error) {
        console.error('❌ Ошибка проверки прав:', error);
        alert('⛔ Ошибка проверки прав доступа.');
        window.location.href = 'index.html';
        return false;
    }
}

// --- DOM ЭЛЕМЕНТЫ ---
const adminInfo = document.getElementById('admin-info');
const backToPostsBtn = document.getElementById('back-to-posts');
const logoutBtn = document.getElementById('logout-btn');
const totalUsersEl = document.getElementById('total-users');
const totalPostsEl = document.getElementById('total-posts');
const pendingPostsEl = document.getElementById('pending-posts');
const approvedPostsEl = document.getElementById('approved-posts');
const usersTableBody = document.getElementById('users-table-body');
const postsTableBody = document.getElementById('posts-table-body');
const userSearch = document.getElementById('user-search');
const refreshPostsBtn = document.getElementById('refresh-posts-btn');

// Модальные окна
const editUserModal = document.getElementById('edit-user-modal');
const editUserForm = document.getElementById('edit-user-form');
const editUserLogin = document.getElementById('edit-user-login');
const editUserAccess = document.getElementById('edit-user-access');
const cancelEditBtn = document.getElementById('cancel-edit-btn');

const confirmModal = document.getElementById('confirm-modal');
const confirmMessage = document.getElementById('confirm-message');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
const cancelConfirmBtn = document.getElementById('cancel-confirm-btn');

// --- ПЕРЕМЕННЫЕ ДЛЯ ХРАНЕНИЯ ДАННЫХ ---
let allUsers = [];
let allPosts = [];
let userToDelete = null;
let userToEdit = null;

// --- ИНИЦИАЛИЗАЦИЯ ---
async function initAdmin() {
    const isAdmin = await checkAdminAccess();
    if (!isAdmin) return;

    adminInfo.textContent = `👑 ${userLogin || userId} (Администратор)`;

    // Загружаем данные
    await loadAdminData();

    // Навешиваем обработчики
    setupEventListeners();
}

// --- ОБРАБОТЧИКИ НАВИГАЦИИ И СОБЫТИЙ ---
function setupEventListeners() {
    // Кнопка "На главную"
    backToPostsBtn.addEventListener('click', () => {
        window.location.href = 'index.html';
    });

    // Кнопка "Выйти"
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('userId');
        localStorage.removeItem('userLogin');
        window.location.href = 'login.html';
    });

    // Кнопка "Обновить посты"
    refreshPostsBtn.addEventListener('click', async () => {
        refreshPostsBtn.disabled = true;
        refreshPostsBtn.textContent = '⏳ Загрузка...';
        await loadAdminData();
        refreshPostsBtn.disabled = false;
        refreshPostsBtn.textContent = '🔄 Обновить';
    });

    // Поиск пользователей
    userSearch.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (!query) {
            renderUsers(allUsers);
            return;
        }
        const filtered = allUsers.filter(user =>
            user.login.toLowerCase().includes(query)
        );
        renderUsers(filtered);
    });

    // Модальное окно редактирования - закрытие
    editUserModal.addEventListener('click', (e) => {
        if (e.target === editUserModal) editUserModal.style.display = 'none';
    });

    // Модальное окно подтверждения - закрытие
    confirmModal.addEventListener('click', (e) => {
        if (e.target === confirmModal) confirmModal.style.display = 'none';
    });

    // Кнопка "Отмена" в модалке редактирования
    cancelEditBtn.addEventListener('click', () => {
        editUserModal.style.display = 'none';
        userToEdit = null;
    });

    // Кнопка "Отмена" в модалке подтверждения
    cancelConfirmBtn.addEventListener('click', () => {
        confirmModal.style.display = 'none';
        userToDelete = null;
    });

    // Сохранение прав пользователя
    editUserForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!userToEdit) {
            alert('Ошибка: пользователь не выбран');
            return;
        }

        const newAccess = parseInt(editUserAccess.value);
        const userIdToEdit = userToEdit._id || userToEdit.id;

        console.log(`✏️ Меняем права пользователя ${userToEdit.login} на ${newAccess}`);

        try {
            const response = await fetch(`${API_BASE_URL}/users/access`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'user-id': userId
                },
                body: JSON.stringify({
                    userId: userIdToEdit,
                    access: newAccess
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Ошибка: ${response.status}`);
            }

            const result = await response.json();
            console.log('✅ Права изменены:', result);

            const roleText = newAccess === 2 ? 'Администратор' : newAccess === 1 ? 'Модератор' : 'Гость';
            alert(`✅ Права пользователя "${userToEdit.login}" изменены на "${roleText}"`);

            editUserModal.style.display = 'none';
            userToEdit = null;

            // Обновляем данные
            await loadAdminData();

        } catch (error) {
            console.error('❌ Ошибка изменения прав:', error);
            alert(`❌ Ошибка: ${error.message}`);
        }
    });

    // Подтверждение удаления пользователя
    confirmDeleteBtn.addEventListener('click', async () => {
        if (!userToDelete) return;

        console.log(`🗑️ Удаляем пользователя: ${userToDelete}`);

        try {
            const response = await fetch(`${API_BASE_URL}/users/${userToDelete}`, {
                method: 'DELETE',
                headers: {
                    'user-id': userId
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Ошибка: ${response.status}`);
            }

            console.log('✅ Пользователь удален');
            alert('✅ Пользователь удален');

            confirmModal.style.display = 'none';
            userToDelete = null;

            // Обновляем данные
            await loadAdminData();

        } catch (error) {
            console.error('❌ Ошибка удаления пользователя:', error);
            alert(`❌ Ошибка: ${error.message}`);
            confirmModal.style.display = 'none';
            userToDelete = null;
        }
    });
}

// --- ЗАГРУЗКА ВСЕХ ДАННЫХ ---
async function loadAdminData() {
    try {
        await loadUsers();
        await loadPosts();
        updateStats();
    } catch (error) {
        console.error('❌ Ошибка загрузки данных:', error);
    }
}

// --- ЗАГРУЗКА ПОЛЬЗОВАТЕЛЕЙ ---
async function loadUsers() {
    try {
        console.log('👥 Загружаем список пользователей...');

        const response = await fetch(`${API_BASE_URL}/users`, {
            headers: {
                'user-id': userId
            }
        });

        if (!response.ok) {
            throw new Error(`Ошибка: ${response.status}`);
        }

        allUsers = await response.json();
        console.log('✅ Загружены пользователи:', allUsers.length);
        renderUsers(allUsers);

    } catch (error) {
        console.error('❌ Ошибка загрузки пользователей:', error);
        usersTableBody.innerHTML = `
            <tr>
                <td colspan="4" class="loading-text" style="color: #dc3545;">
                    ❌ Ошибка загрузки: ${error.message}
                </td>
            </tr>
        `;
    }
}

// --- ЗАГРУЗКА ПОСТОВ ---
async function loadPosts() {
    try {
        console.log('📝 Загружаем список постов...');

        const response = await fetch(`${API_BASE_URL}/posts/${userId}`, {
            headers: {
                'user-id': userId
            }
        });

        if (!response.ok) {
            throw new Error(`Ошибка: ${response.status}`);
        }

        const data = await response.json();
        allPosts = Array.isArray(data) ? data : (data.posts || data.data || []);
        console.log('✅ Загружены посты:', allPosts.length);
        renderPosts(allPosts);

    } catch (error) {
        console.error('❌ Ошибка загрузки постов:', error);
        postsTableBody.innerHTML = `
            <tr>
                <td colspan="5" class="loading-text" style="color: #dc3545;">
                    ❌ Ошибка загрузки: ${error.message}
                </td>
            </tr>
        `;
    }
}

// --- ОБНОВЛЕНИЕ СТАТИСТИКИ ---
function updateStats() {
    totalUsersEl.textContent = allUsers.length;
    totalPostsEl.textContent = allPosts.length;

    const pending = allPosts.filter(p => p.isApproved === 0).length;
    const approved = allPosts.filter(p => p.isApproved === 1).length;
    const rejected = allPosts.filter(p => p.isApproved === -1).length;

    pendingPostsEl.textContent = `${pending} (отклонено: ${rejected})`;
    approvedPostsEl.textContent = approved;
}

// --- ОТОБРАЖЕНИЕ ПОЛЬЗОВАТЕЛЕЙ В ТАБЛИЦЕ ---
function renderUsers(users) {
    if (!users || users.length === 0) {
        usersTableBody.innerHTML = `
            <tr>
                <td colspan="4" class="loading-text">👥 Пользователей пока нет</td>
            </tr>
        `;
        return;
    }

    let html = '';
    users.forEach(user => {
        const roleText = getRoleText(user.access);
        const roleClass = getRoleClass(user.access);
        const isCurrentUser = user._id === userId || user.id === userId;

        html += `
            <tr>
                <td><code>${user._id || user.id}</code></td>
                <td><strong>${escapeHtml(user.login)}</strong></td>
                <td><span class="role-badge ${roleClass}">${roleText}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-primary btn-sm edit-user-btn" 
                                data-userid="${user._id || user.id}">
                            ✏️
                        </button>
                        ${!isCurrentUser ? `
                            <button class="btn btn-danger btn-sm delete-user-btn" 
                                    data-userid="${user._id || user.id}"
                                    data-login="${escapeHtml(user.login)}">
                                🗑️
                            </button>
                        ` : `
                            <span style="color:#999; font-size:12px;">(Это вы)</span>
                        `}
                    </div>
                </td>
            </tr>
        `;
    });

    usersTableBody.innerHTML = html;

    // Добавляем обработчики для кнопок редактирования
    document.querySelectorAll('.edit-user-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const userId = btn.dataset.userid;
            openEditUserModal(userId);
        });
    });

    // Добавляем обработчики для кнопок удаления
    document.querySelectorAll('.delete-user-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const userId = btn.dataset.userid;
            const login = btn.dataset.login;
            openDeleteConfirm(userId, login);
        });
    });
}

// --- ОТОБРАЖЕНИЕ ПОСТОВ В ТАБЛИЦЕ ---
function renderPosts(posts) {
    if (!posts || posts.length === 0) {
        postsTableBody.innerHTML = `
            <tr>
                <td colspan="5" class="loading-text">📝 Постов пока нет</td>
            </tr>
        `;
        return;
    }

    // Показываем последние 20 постов
    const recentPosts = posts.slice(-20).reverse();

    let html = '';
    recentPosts.forEach(post => {
        let statusClass = 'status-pending';
        let statusText = '⏳ На модерации';

        if (post.isApproved === 1) {
            statusClass = 'status-approved';
            statusText = '✅ Одобрен';
        } else if (post.isApproved === -1) {
            statusClass = 'status-rejected';
            statusText = '❌ Отклонен';
        }

        const authorLogin = post.sender_id?.login || post.authorLogin || 'Неизвестен';

        html += `
            <tr>
                <td><code>${post._id}</code></td>
                <td><strong>${escapeHtml(post.title) || 'Без заголовка'}</strong></td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>${escapeHtml(authorLogin)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn ${post.isApproved === 1 ? 'btn-warning' : 'btn-success'} btn-sm toggle-post-btn" 
                                data-postid="${post._id}"
                                data-current="${post.isApproved}">
                            ${post.isApproved === 1 ? 'Отозвать' : 'Одобрить'}
                        </button>
                        <button class="btn btn-danger btn-sm delete-post-btn" 
                                data-postid="${post._id}"
                                data-title="${escapeHtml(post.title)}">
                            🗑️
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    postsTableBody.innerHTML = html;

    // Обработчики для кнопок одобрения/отзыва
    document.querySelectorAll('.toggle-post-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const postId = btn.dataset.postid;
            await togglePostApproval(postId);
        });
    });

    // Обработчики для кнопок удаления постов
    document.querySelectorAll('.delete-post-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const postId = btn.dataset.postid;
            const title = btn.dataset.title;
            if (confirm(`Удалить пост "${title}"?`)) {
                await deletePost(postId);
            }
        });
    });
}

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---
function getRoleText(access) {
    if (access === 2) return 'Администратор';
    if (access === 1) return 'Модератор';
    return 'Гость';
}

function getRoleClass(access) {
    if (access === 2) return 'role-admin';
    if (access === 1) return 'role-moderator';
    return 'role-guest';
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// --- ОТКРЫТИЕ МОДАЛКИ РЕДАКТИРОВАНИЯ ---
function openEditUserModal(userId) {
    const user = allUsers.find(u => (u._id || u.id) === userId);
    if (!user) {
        alert('Пользователь не найден');
        return;
    }

    userToEdit = user;
    editUserLogin.value = user.login;
    editUserAccess.value = user.access || 0;
    editUserModal.style.display = 'flex';
}

// --- ОТКРЫТИЕ МОДАЛКИ ПОДТВЕРЖДЕНИЯ УДАЛЕНИЯ ---
function openDeleteConfirm(userId, login) {
    userToDelete = userId;
    confirmMessage.textContent = `Вы уверены, что хотите удалить пользователя "${login}"? Это действие необратимо.`;
    confirmModal.style.display = 'flex';
}

// --- ИЗМЕНЕНИЕ СТАТУСА ПОСТА ---
async function togglePostApproval(postId) {
    try {
        console.log(`🔄 Изменяем статус поста ${postId}`);

        const response = await fetch(`${API_BASE_URL}/posts/appr/${userId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'user-id': userId
            },
            body: JSON.stringify({ postId: postId }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Ошибка: ${response.status}`);
        }

        console.log('✅ Статус поста изменен');
        await loadAdminData();

    } catch (error) {
        console.error('❌ Ошибка изменения статуса поста:', error);
        alert(`❌ Ошибка: ${error.message}`);
    }
}

// --- УДАЛЕНИЕ ПОСТА ---
async function deletePost(postId) {
    try {
        console.log(`🗑️ Удаляем пост ${postId}`);

        const response = await fetch(`${API_BASE_URL}/posts/${userId}/${postId}`, {
            method: 'DELETE',
            headers: {
                'user-id': userId
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Ошибка: ${response.status}`);
        }

        console.log('✅ Пост удален');
        await loadAdminData();

    } catch (error) {
        console.error('❌ Ошибка удаления поста:', error);
        alert(`❌ Ошибка: ${error.message}`);
    }
}

// --- ЗАПУСК ---
initAdmin();

/*
 * END OF 'admin.js' FILE
 */