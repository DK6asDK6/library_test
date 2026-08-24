// ============================================
// Admin panel
// ============================================

// === API CONFIGURATION ===
const API_CONFIG = {
    // Backend port (default 3000)
    port: 3000,
    // API path
    path: '/api'
};

const API_BASE_URL = (() => {
    const { hostname, protocol } = window.location;

    // If we are on localhost
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return `${protocol}//${hostname}:${API_CONFIG.port}${API_CONFIG.path}`;
    }

    // If we are on production
    // You can use relative path or full URL
    return API_CONFIG.path;
})();

// Getting user data from local storage
const userId = localStorage.getItem('userId');
const userLogin = localStorage.getItem('userLogin');

// DOM Elements
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
const resetPasswordModal = document.getElementById('reset-password-modal');
const resetPasswordForm = document.getElementById('reset-password-form');
const resetUserLogin = document.getElementById('reset-user-login');
const resetNewPassword = document.getElementById('reset-new-password');
const resetConfirmPassword = document.getElementById('reset-confirm-password');
const cancelResetBtn = document.getElementById('cancel-reset-btn');

// Modal pages
const editUserModal = document.getElementById('edit-user-modal');
const editUserForm = document.getElementById('edit-user-form');
const editUserLogin = document.getElementById('edit-user-login');
const editUserAccess = document.getElementById('edit-user-access');
const cancelEditBtn = document.getElementById('cancel-edit-btn');

const confirmModal = document.getElementById('confirm-modal');
const confirmMessage = document.getElementById('confirm-message');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
const cancelConfirmBtn = document.getElementById('cancel-confirm-btn');

// Storage parameters
let allUsers = [];
let allPosts = [];
let userToDelete = null;
let userToEdit = null;
let userToReset = null;



// --- EVENT LISTENERS SETUP ---
function setupEventListeners() {
    // Back to main page button
    backToPostsBtn.addEventListener('click', () => {
        window.location.href = 'index.html';
    });

    // Logout button
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('userId');
        localStorage.removeItem('userLogin');
        window.location.href = 'login.html';
    });

    // Refresh posts button
    refreshPostsBtn.addEventListener('click', async () => {
        refreshPostsBtn.disabled = true;
        refreshPostsBtn.textContent = '⏳ Загрузка...';
        await loadAdminData();
        refreshPostsBtn.disabled = false;
        refreshPostsBtn.textContent = '🔄 Обновить';
    });

    // User search
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

    // Edit modal - close on background click
    editUserModal.addEventListener('click', (e) => {
        if (e.target === editUserModal) editUserModal.style.display = 'none';
    });

    // Confirm modal - close on background click
    confirmModal.addEventListener('click', (e) => {
        if (e.target === confirmModal) confirmModal.style.display = 'none';
    });

    // Edit modal - cancel button
    cancelEditBtn.addEventListener('click', () => {
        editUserModal.style.display = 'none';
        userToEdit = null;
    });

    // Confirm modal - cancel button
    cancelConfirmBtn.addEventListener('click', () => {
        confirmModal.style.display = 'none';
        userToDelete = null;
    });

    // --- USER ACCESS LEVEL UPDATE ---
    editUserForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!userToEdit) {
            alert('Ошибка: пользователь не выбран');
            return;
        }

        const newAccess = parseInt(editUserAccess.value);
        const userLogin = userToEdit.login;

        console.log(`✏️ Меняем права пользователя ${userLogin} на ${newAccess}`);

        try {
            // Correct URL with admin ID
            const response = await fetch(`${API_BASE_URL}/users/access/${userId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'user-id': userId
                },
                body: JSON.stringify({
                    us_login: userLogin,
                    s_acc: newAccess
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Ошибка: ${response.status}`);
            }

            const result = await response.json();
            console.log('✅ Права изменены:', result);

            const roleText = newAccess === 2 ? 'Администратор' : newAccess === 1 ? 'Модератор' : 'Гость';
            alert(`✅ Права пользователя "${userLogin}" изменены на "${roleText}"`);

            editUserModal.style.display = 'none';
            userToEdit = null;

            // Reload data
            await loadAdminData();

        } catch (error) {
            console.error('❌ Ошибка изменения прав:', error);
            alert(`❌ Ошибка: ${error.message}`);
        }
    });

    // User deletion confirmation
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

            // Reload data
            await loadAdminData();

        } catch (error) {
            console.error('❌ Ошибка удаления пользователя:', error);
            alert(`❌ Ошибка: ${error.message}`);
            confirmModal.style.display = 'none';
            userToDelete = null;
        }
    });
}

// --- STATISTICS UPDATE ---
function updateStats() {
    totalUsersEl.textContent = allUsers.length;
    totalPostsEl.textContent = allPosts.length;

    const pending = allPosts.filter(p => p.isApproved === 0).length;
    const approved = allPosts.filter(p => p.isApproved === 1).length;
    const rejected = allPosts.filter(p => p.isApproved === -1).length;

    pendingPostsEl.textContent = `${pending} (отклонено: ${rejected})`;
    approvedPostsEl.textContent = approved;
}

// --- USERS TABLE RENDER ---
function renderUsers(users) {
    if (!users || users.length === 0) {
        usersTableBody.innerHTML = `
            <tr>
                <td colspan="5" class="loading-text">👥 Пользователей пока нет</td>
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
                        <!-- Password reset button -->
                        <button class="btn btn-warning btn-sm reset-password-btn" 
                                data-login="${escapeHtml(user.login)}">
                            🔑
                        </button>
                        ${!isCurrentUser ? `
                            <button class="btn btn-danger btn-sm delete-user-btn" 
                                    data-userid="${user._id || user.id}"
                                    data-login="${escapeHtml(user.login)}">
                                🗑️
                            </button>
                        ` : `
                            <span>(Это вы)</span>
                        `}
                    </div>
                </td>
            </tr>
        `;
    });

    usersTableBody.innerHTML = html;

    // Edit button handlers
    document.querySelectorAll('.edit-user-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const userId = btn.dataset.userid;
            openEditUserModal(userId);
        });
    });

    // Password reset button handlers
    document.querySelectorAll('.reset-password-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const login = btn.dataset.login;
            openResetPasswordModal(login);
        });
    });

    // Delete button handlers
    document.querySelectorAll('.delete-user-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const userId = btn.dataset.userid;
            const login = btn.dataset.login;
            openDeleteConfirm(userId, login);
        });
    });
}

// --- POSTS TABLE RENDER ---
function renderPosts(posts) {
    if (!posts || posts.length === 0) {
        postsTableBody.innerHTML = `
            <tr>
                <td colspan="5" class="loading-text">📝 Постов пока нет</td>
            </tr>
        `;
        return;
    }

    // Show last 20 posts
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

    // Toggle approval button handlers
    document.querySelectorAll('.toggle-post-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const postId = btn.dataset.postid;
            await togglePostApproval(postId);
        });
    });

    // Delete post button handlers
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

// --- HELPER FUNCTIONS ---
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

// --- PASSWORD RESET MODAL OPEN ---
function openResetPasswordModal(userLogin) {
    userToReset = userLogin;
    resetUserLogin.value = userLogin;
    resetNewPassword.value = '';
    resetConfirmPassword.value = '';
    resetPasswordModal.style.display = 'flex';
}

// --- PASSWORD RESET MODAL CLOSE ---
cancelResetBtn.addEventListener('click', () => {
    resetPasswordModal.style.display = 'none';
    userToReset = null;
});

resetPasswordModal.addEventListener('click', (e) => {
    if (e.target === resetPasswordModal) {
        resetPasswordModal.style.display = 'none';
        userToReset = null;
    }
});

// --- PASSWORD RESET ---
resetPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const newPassword = resetNewPassword.value.trim();
    const confirmPassword = resetConfirmPassword.value.trim();

    if (!userToReset) {
        alert('Ошибка: пользователь не выбран');
        return;
    }

    if (!newPassword || newPassword.length < 6) {
        alert('❌ Пароль должен содержать минимум 6 символов');
        return;
    }

    if (newPassword !== confirmPassword) {
        alert('❌ Пароли не совпадают');
        return;
    }

    const submitBtn = resetPasswordForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Отправка...';

    try {
        // Using existing endpoint
        const response = await fetch(`${API_BASE_URL}/users/reset_admin/${userId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'user-id': userId
            },
            body: JSON.stringify({
                us_login: userToReset,
                new_pwd: newPassword
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Ошибка: ${response.status}`);
        }

        const result = await response.json();
        console.log('✅ Пароль изменен:', result);

        alert(`✅ Пароль пользователя "${userToReset}" успешно изменен!`);

        resetPasswordModal.style.display = 'none';
        userToReset = null;

    } catch (error) {
        console.error('❌ Ошибка смены пароля:', error);
        alert(`❌ Ошибка: ${error.message}`);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
});

// --- EDIT MODAL OPEN ---
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

// --- DELETE CONFIRM MODAL OPEN ---
function openDeleteConfirm(userId, login) {
    userToDelete = userId;
    confirmMessage.textContent = `Вы уверены, что хотите удалить пользователя "${login}"? Это действие необратимо.`;
    confirmModal.style.display = 'flex';
}

// --- POST APPROVAL TOGGLE ---
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

// --- POST DELETE ---
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

// --- USERS LOAD ---
async function loadUsers() {
    try {
        console.log('👥 Загружаем список пользователей...');

        // GET /users/:aid with user-id header
        const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
            headers: {
                'user-id': userId
            }
        });

        console.log('📥 Статус ответа /users:', response.status);

        if (!response.ok) {
            if (response.status === 403) {
                usersTableBody.innerHTML = `
                    <tr>
                        <td colspan="4" class="loading-text" style="color: #856404;">
                            ⚠️ Доступ запрещен. Требуются права администратора.
                        </td>
                    </tr>
                `;
                return;
            } else if (response.status === 401) {
                usersTableBody.innerHTML = `
                    <tr>
                        <td colspan="4" class="loading-text" style="color: #856404;">
                            ⚠️ Не авторизован. Войдите заново.
                        </td>
                    </tr>
                `;
                return;
            }
            throw new Error(`Ошибка: ${response.status}`);
        }

        const data = await response.json();
        console.log('📥 Получены пользователи:', data);

        if (Array.isArray(data)) {
            allUsers = data;
        } else if (data.users && Array.isArray(data.users)) {
            allUsers = data.users;
        } else {
            allUsers = [];
            console.warn('⚠️ Неожиданный формат ответа:', data);
        }

        renderUsers(allUsers);
        updateStats();

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

// --- POSTS LOAD ---
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

// --- ADMIN DATA LOAD ---
async function loadAdminData() {
    try {
        await loadUsers();
        await loadPosts();
        updateStats();
    } catch (error) {
        console.error('❌ Ошибка загрузки данных:', error);
    }
}

// --- ADMIN ACCESS CHECK ---
async function checkAdminAccess() {
    if (!userId) {
        alert('⛔ Доступ запрещен. Требуется авторизация.');
        window.location.href = 'index.html';
        return false;
    }

    try {
        console.log(`🔍 Проверка прав администратора для: ${userId}`);

        const response = await fetch(`${API_BASE_URL}/users/access/${userId}`, {
            headers: { 'user-id': userId }
        });

        console.log('📥 Статус ответа от /access:', response.status);

        if (response.ok) {
            const data = await response.json();
            console.log('📥 Ответ от /access:', data);

            // Using message field (server returns { message: access })
            if (data.message === 2) {
                console.log('✅ Доступ разрешен (администратор)');
                return true;
            } else {
                console.log(`ℹ️ Уровень доступа: ${data.message} (администратор: 2)`);
                alert(`⛔ Доступ запрещен. Ваш уровень доступа: ${data.message}`);
                window.location.href = 'index.html';
                return false;
            }
        } else {
            console.warn(`⚠️ Не удалось проверить права. Статус: ${response.status}`);
            alert('⛔ Ошибка проверки прав доступа.');
            window.location.href = 'index.html';
            return false;
        }

    } catch (error) {
        console.error('❌ Ошибка проверки прав:', error);
        alert('⛔ Ошибка проверки прав доступа.');
        window.location.href = 'index.html';
        return false;
    }
}

// --- INITIALIZATION ---
async function initAdmin() {
    const isAdmin = await checkAdminAccess();
    if (!isAdmin) return;

    adminInfo.textContent = `👑 ${userLogin || userId} (Администратор)`;

    // Load data
    await loadAdminData();

    // Setup event listeners
    setupEventListeners();
}

// --- START ---
initAdmin();

/*
 * END OF 'admin.js' FILE
 */