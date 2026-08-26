// ============================================
// POST VIEW PAGE
// File: post.js
// ============================================

// --- API CONFIGURATION ---
const API_CONFIG = {
    port: 3000,
    path: '/api'
};

const API_BASE_URL = (() => {
    const { hostname, protocol } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return `${protocol}//${hostname}:${API_CONFIG.port}${API_CONFIG.path}`;
    }
    return API_CONFIG.path;
})();

console.log('🔗 API_BASE_URL:', API_BASE_URL);

// --- GET POST ID FROM URL ---
function getPostIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

// --- GET USER ID FROM LOCALSTORAGE ---
const userId = localStorage.getItem('userId');

// --- DOM ELEMENTS ---
const container = document.getElementById('post-container');

// --- LOAD POST ---
async function loadPost() {
    const postId = getPostIdFromUrl();

    if (!postId) {
        container.innerHTML = `
            <div class="error">
                ❌ ID поста не указан
                <br><br>
                <a href="index.html" class="btn btn-secondary">← На главную</a>
            </div>
        `;
        return;
    }

    try {
        const headers = {};
        if (userId) {
            headers['user-id'] = userId;
        }

        const response = await fetch(`${API_BASE_URL}/posts/one/${postId}/${userId || '0'}`, {
            headers: headers
        });

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Пост не найден');
            } else if (response.status === 403) {
                throw new Error('Доступ запрещен');
            } else {
                throw new Error(`Ошибка: ${response.status}`);
            }
        }

        const post = await response.json();
        renderPost(post);

        // Обновляем заголовок страницы
        document.title = post.title || 'Просмотр поста';

    } catch (error) {
        console.error('❌ Ошибка загрузки поста:', error);
        container.innerHTML = `
            <div class="error">
                ❌ ${error.message}
                <br><br>
                <a href="index.html" class="btn btn-secondary">← На главную</a>
            </div>
        `;
    }
}

// --- RENDER POST ---
function renderPost(post) {
    const isApproved = post.isApproved === 1;
    const statusText = isApproved ? '✅ Одобрен' : '⏳ На модерации';
    const statusClass = isApproved ? 'status-approved' : 'status-pending';

    const authorName = post.sender_name || post.authorLogin || 'Неизвестен';

    // Форматируем дату
    const createdAt = post.createdAt
        ? new Date(post.createdAt).toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
        : 'Неизвестно';

    // Ссылка
    let linkHtml = '';
    if (post.link) {
        linkHtml = `<a href="${escapeHtml(post.link)}" target="_blank" class="post-link">🔗 ${escapeHtml(post.link)}</a>`;
    }

    // Файлы
    let filesHtml = '';
    if (post.files && post.files.length > 0) {
        filesHtml = '<div class="post-files">';
        post.files.forEach(file => {
            const fileUrl = file.url || `/uploads/${file.filename}`;
            const fileName = file.originalName || file.filename || 'Файл';
            const ext = fileName.split('.').pop().toLowerCase();

            if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) {
                filesHtml += `
                    <div class="file-item">
                        <a href="${fileUrl}" target="_blank">
                            <img src="${fileUrl}" alt="${escapeHtml(fileName)}" class="file-preview">
                        </a>
                        <span class="file-name">${escapeHtml(fileName)}</span>
                    </div>
                `;
            } else {
                const icon = getFileIcon(ext);
                filesHtml += `
                    <div class="file-item">
                        <a href="${fileUrl}" target="_blank" class="file-link">
                            ${icon} ${escapeHtml(fileName)}
                        </a>
                    </div>
                `;
            }
        });
        filesHtml += '</div>';
    }

    // Контент
    const contentHtml = post.text
        ? escapeHtml(post.text)
        : '<span class="empty-text">(Пост без содержания)</span>';

    container.innerHTML = `
        <h1 class="post-title">${escapeHtml(post.title) || 'Без заголовка'}</h1>
        
        <div class="post-meta">
            <span>🆔 ${post._id}</span>
            <span>👤 ${escapeHtml(authorName)}</span>
            <span>📅 ${createdAt}</span>
            <span class="status-badge ${statusClass}">${statusText}</span>
        </div>
        
        <div class="post-text">${contentHtml}</div>
        
        ${linkHtml}
        ${filesHtml}
        
        <div class="post-actions">
            <button onclick="window.print()" class="btn btn-secondary">🖨️ Печать</button>
            <button onclick="window.close()" class="btn btn-secondary">✕ Закрыть</button>
        </div>
    `;
}

// --- HELPER FUNCTIONS ---
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getFileIcon(extension) {
    const icons = {
        'pdf': '📄', 'doc': '📝', 'docx': '📝',
        'xls': '📊', 'xlsx': '📊',
        'ppt': '📽️', 'pptx': '📽️',
        'txt': '📃', 'zip': '📦', 'rar': '📦',
        '7z': '📦', 'mp3': '🎵', 'wav': '🎵',
        'mp4': '🎬', 'avi': '🎬', 'mkv': '🎬'
    };
    return icons[extension] || '📎';
}

// --- LOAD ---
loadPost();