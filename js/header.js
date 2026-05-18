function escH(text) {
  const d = document.createElement('div');
  d.textContent = text || '';
  return d.innerHTML;
}

function initUserBox() {
  const box = document.getElementById('userBox');
  if (!box) return;

  fetch('api/get-current-user.php', { cache: 'no-store', credentials: 'same-origin' })
    .then(r => r.json())
    .then(data => {
      if (data.status === 'success' && data.user) {
        const u = data.user;
        const initial = (u.name || u.email || 'U').charAt(0).toUpperCase();
        const isAdmin = u.role === 'admin';
        const isEmployee = u.role === 'employee';
        const avatarContent =
          u.profile_image && u.profile_image.startsWith('data:image/')
            ? `<img src="${u.profile_image}" alt="Profile">`
            : escH(initial);

        box.innerHTML = `
          <div class="header-user-actions">

            <div class="header-notif-wrap">
              <button class="header-notif-btn" id="headerNotifBtn" type="button" aria-label="Notifications">
                🔔
                <span class="header-notif-badge" id="headerNotifBadge" hidden>0</span>
              </button>

              <div class="header-notif-dropdown" id="headerNotifDropdown">
               <div class="header-notif-head">
  <strong>Notifications</strong>

  <div class="header-notif-actions">
    <button type="button" id="markNotifReadBtn">Mark all read</button>
    <button type="button" id="deleteAllNotifBtn">Clear all</button>
  </div>
</div>

                <div class="header-notif-list" id="headerNotifList">
                  <div class="header-notif-empty">Loading...</div>
                </div>
              </div>
            </div>

           <div class="header-user-menu">
  <button class="header-user-card" id="headerAvatarBtn" type="button">
    <div class="header-user-text">
      <strong>${escH(u.name || 'User')}</strong>
      <span>${isAdmin ? 'Admin' : isEmployee ? 'Employee' : 'User'}</span>
    </div>

    <div class="header-avatar">
      ${avatarContent}
    </div>
  </button>
              <div class="header-dropdown" id="headerDropdown">
                <div class="header-dropdown-head">
                  <div class="header-dropdown-name">${escH(u.name || 'User')}</div>
                  <div class="header-dropdown-email">${escH(u.email || '')}</div>
                </div>

                <div class="header-dropdown-item" onclick="window.location.href='profile.html'">👤 Profile</div>
                <div class="header-dropdown-item" onclick="window.location.href='profile.html#myAuctionsPanel'">🧾 My Auctions</div>
                <div class="header-dropdown-item" onclick="window.location.href='profile.html#friendsPanel'">👥 Partners</div>

                ${
                  isAdmin
                    ? `<div class="header-dropdown-item" onclick="window.location.href='Admin.html'">🛠 Admin Dashboard</div>`
                    : ''
                }

                ${
                  isEmployee
                    ? `<div class="header-dropdown-item" onclick="window.location.href='Employee.html'">👥 Employee Panel</div>`
                    : ''
                }

               
                <div class="header-dropdown-item danger" onclick="headerLogout()">🚪 Logout</div>
              </div>
            </div>

          </div>
        `;

        bindHeaderUserMenu();
        bindHeaderNotifications();
        loadHeaderNotifications();
      } else {
        box.innerHTML = `<a href="login.html" class="btn btn-secondary" style="white-space:nowrap">Sign In</a>`;
      }
    })
    .catch(() => {
      box.innerHTML = `<a href="login.html" class="btn btn-secondary" style="white-space:nowrap">Sign In</a>`;
    });
}

function bindHeaderUserMenu() {
  const avatarBtn = document.getElementById('headerAvatarBtn');
  const dropdown = document.getElementById('headerDropdown');
  const notifDropdown = document.getElementById('headerNotifDropdown');

  if (avatarBtn && dropdown) {
    avatarBtn.addEventListener('click', function (e) {
      e.stopPropagation();

      if (notifDropdown) {
        notifDropdown.classList.remove('open');
      }

      dropdown.classList.toggle('open');
    });
  }
}

function bindHeaderNotifications() {
  const notifBtn = document.getElementById('headerNotifBtn');
  const notifDropdown = document.getElementById('headerNotifDropdown');
  const userDropdown = document.getElementById('headerDropdown');
  const markBtn = document.getElementById('markNotifReadBtn');
const deleteAllBtn = document.getElementById('deleteAllNotifBtn');
  if (notifBtn && notifDropdown) {
    notifBtn.addEventListener('click', function (e) {
      e.stopPropagation();

      if (userDropdown) {
        userDropdown.classList.remove('open');
      }

      notifDropdown.classList.toggle('open');
      loadHeaderNotifications();
    });
  }

  if (markBtn) {
    markBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      markHeaderNotificationsRead();
    });
  }
  if (deleteAllBtn) {
  deleteAllBtn.addEventListener('click', function (e) {
    e.stopPropagation();

    if (!confirm('Delete all notifications?')) return;

    deleteAllHeaderNotifications();
  });
}
}

function loadHeaderNotifications() {
  const badge = document.getElementById('headerNotifBadge');
  const list = document.getElementById('headerNotifList');

  if (!list) return;

  fetch('api/get-notifications.php', { cache: 'no-store', credentials: 'same-origin' })
    .then(r => r.json())
    .then(data => {
      if (data.status !== 'success') {
        list.innerHTML = `<div class="header-notif-empty">Could not load notifications</div>`;
        if (badge) badge.hidden = true;
        return;
      }

      const unread = Number(data.unread || 0);
      const items = Array.isArray(data.data) ? data.data : [];

      if (badge) {
        if (unread > 0) {
          badge.textContent = unread > 9 ? '9+' : String(unread);
          badge.hidden = false;
        } else {
          badge.hidden = true;
        }
      }

      if (!items.length) {
        list.innerHTML = `
          <div class="header-notif-empty">
            No notifications yet
          </div>
        `;
        return;
      }

      list.innerHTML = items.map(item => {
        const isUnread = Number(item.is_read) === 0;
        const icon = getNotificationIcon(item.type);

       return `
  <div class="header-notif-item ${isUnread ? 'unread' : ''}" data-link="${escH(item.link || '')}">
    <button
      class="header-notif-delete"
      type="button"
      data-id="${Number(item.id || 0)}"
      title="Delete notification"
      aria-label="Delete notification"
    >×</button>

    <div class="header-notif-icon">${icon}</div>

    <div class="header-notif-content">
      <strong>${escH(item.title || item.subject || 'Notification')}</strong>
      <p>${escH(item.message || item.body || '')}</p>
      <span>${escH(item.created_at || '')}</span>
    </div>
  </div>
`;
      }).join('');

      list.querySelectorAll('.header-notif-item').forEach(item => {
        item.addEventListener('click', () => {
          const link = item.dataset.link;

          if (link) {
            window.location.href = link;
          }
        });
      });
      list.querySelectorAll('.header-notif-delete').forEach(btn => {
  btn.addEventListener('click', e => {
    e.stopPropagation();
    deleteHeaderNotification(btn.dataset.id);
  });
});
    })
    .catch(() => {
      list.innerHTML = `<div class="header-notif-empty">Network error</div>`;
      if (badge) badge.hidden = true;
    });
}
function getNotificationIcon(type) {
  const clean = String(type || '').toLowerCase();

  if (clean.includes('chat_message')) return '💬';

  if (clean.includes('friend_request_accepted')) return '✅';
  if (clean.includes('friend_request_rejected')) return '❌';
  if (clean.includes('friend_request')) return '👥';

  if (clean.includes('auction_approved')) return '✅';
  if (clean.includes('auction_rejected')) return '❌';
  if (clean.includes('auction_important')) return '⭐';
  if (clean.includes('auction')) return '🏛';

  if (clean.includes('bid_approved')) return '✅';
  if (clean.includes('bid_rejected')) return '❌';
  if (clean.includes('bid')) return '💰';

  if (clean.includes('important') || clean.includes('featured')) return '⭐';
  if (clean.includes('win')) return '🏆';

  return '🔔';
}
function markHeaderNotificationsRead() {
  fetch('api/mark-notifications-read.php', {
    method: 'POST',
    credentials: 'same-origin'
  })
    .then(r => r.json())
    .then(data => {
      if (data.status === 'success') {
        loadHeaderNotifications();
      }
    })
    .catch(() => {});
}
function deleteHeaderNotification(id) {
  if (!id) return;

  fetch('api/delete-notification.php', {
    method: 'POST',
    credentials: 'same-origin',
    body: new URLSearchParams({ notification_id: id })
  })
    .then(r => r.json())
    .then(data => {
      if (data.status === 'success') {
        loadHeaderNotifications();
      }
    })
    .catch(() => {});
}

function deleteAllHeaderNotifications() {
  fetch('api/delete-all-notifications.php', {
    method: 'POST',
    credentials: 'same-origin'
  })
    .then(r => r.json())
    .then(data => {
      if (data.status === 'success') {
        loadHeaderNotifications();
      }
    })
    .catch(() => {});
}

function headerLogout() {
  fetch('api/logout.php', { credentials: 'same-origin' })
    .finally(() => {
      localStorage.removeItem('mazadUser');
      window.location.href = 'login.html';
    });
}

document.addEventListener('click', function (e) {
  const userDropdown = document.getElementById('headerDropdown');
  const notifDropdown = document.getElementById('headerNotifDropdown');

  if (userDropdown && !e.target.closest('.header-user-menu')) {
    userDropdown.classList.remove('open');
  }

  if (notifDropdown && !e.target.closest('.header-notif-wrap')) {
    notifDropdown.classList.remove('open');
  }
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initUserBox);
} else {
  initUserBox();
}
