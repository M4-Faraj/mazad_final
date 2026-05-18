// js/admin.js — admin panel wired to real API data
(function () {
  const user = JSON.parse(localStorage.getItem('mazadUser') || 'null');
  if (!user || user.role !== 'admin') {
    console.warn('Admin access required');
  }

  // DOM refs
  const auctionTableBody = document.getElementById('auctionTableBody');
  const pendingList      = document.getElementById('pendingList');
  const suspendedList    = document.getElementById('suspendedList');
  const liveGrid         = document.getElementById('liveGrid');
  const statTotal        = document.getElementById('statTotal');
  const statLive         = document.getElementById('statLive');
  const statPending      = document.getElementById('statPending');
  const statSuspended    = document.getElementById('statSuspended');
  const searchInput      = document.getElementById('searchInput');
  const statusFilter     = document.getElementById('statusFilter');
  const sortFilter       = document.getElementById('sortFilter');
  const categoryFilter   = document.getElementById('categoryFilter');
  const editModal        = document.getElementById('editModal');
  const deleteModal      = document.getElementById('deleteModal');
  const ledgerModal      = document.getElementById('ledgerModal');
  const ledgerContent    = document.getElementById('ledgerContent');
const showcaseCategoryFilter = document.getElementById('showcaseCategoryFilter');
const showcaseAdminList = document.getElementById('showcaseAdminList');
const refreshShowcaseBtn = document.getElementById('refreshShowcaseBtn');
  let allAuctions    = [];
  let currentEditId  = null;
  let currentDeleteId = null;

  // ── Data fetching ──────────────────────────────────────────────

  function fetchAll() {
    fetch('/mazad/api/api/get-auctions.php?context=admin', { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        if (data.status !== 'success') return;
        allAuctions = data.data || [];
        renderAll();
      })
      .catch(err => console.error('fetchAll error', err));
  }

  function fetchPendingPanel() {
    fetch('/mazad/api/get-pending-auctions.php')
      .then(r => r.json())
      .then(res => {
        if (res.status !== 'success') return;
        renderPendingPanel(res.data || []);
      })
      .catch(() => {});
  }

  // ── Render helpers ─────────────────────────────────────────────

  function statusClass(s) {
    const map = {
      live: 'status-live', approved: 'status-active', active: 'status-active',
      pending: 'status-pending', suspended: 'status-suspended',
      rejected: 'status-suspended', ended: 'status-ended', 'Ended': 'status-ended'
    };
    return map[(s || '').toLowerCase()] || 'status-ended';
  }

  function parseAuctionEndTime(value) {
    if (!value) return 0;
    const time = new Date(String(value).replace(' ', 'T')).getTime();
    return Number.isNaN(time) ? 0 : time;
  }

  function isAuctionExpired(auction) {
    const end = parseAuctionEndTime(auction && auction.end_time);
    return end > 0 && Date.now() >= end;
  }

  function getDisplayStatus(auction) {
    const raw = String((auction && auction.status) || '').trim();
    const status = raw.toLowerCase();
    if ((status === 'approved' || status === 'live' || status === 'active') && isAuctionExpired(auction)) {
      return 'Ended';
    }
    return raw || 'Unknown';
  }

  function priceNum(v) { return Number(String(v).replace(/[$,]/g, '')) || 0; }

  function toDateTimeLocal(value) {
  if (!value) return '';

  const raw = String(value).trim();

  // If it is already close to datetime-local format
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(raw)) {
    return raw.slice(0, 16);
  }

  // Convert MySQL format: 2026-05-17 14:30:00
  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(raw)) {
    return raw.replace(' ', 'T').slice(0, 16);
  }

  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return '';

  const pad = n => String(n).padStart(2, '0');

  return (
    d.getFullYear() + '-' +
    pad(d.getMonth() + 1) + '-' +
    pad(d.getDate()) + 'T' +
    pad(d.getHours()) + ':' +
    pad(d.getMinutes())
  );
}

function fromDateTimeLocal(value) {
  if (!value) return '';
  return String(value).replace('T', ' ') + ':00';
}
  function getFiltered() {
    let result = [...allAuctions];
    const q    = (searchInput ? searchInput.value.trim().toLowerCase() : '');
    const st   = statusFilter ? statusFilter.value : 'all';
    const cat  = categoryFilter ? categoryFilter.value : 'all';
    const srt  = sortFilter ? sortFilter.value : 'newest';

    if (q) {
      result = result.filter(a =>
        [a.id, a.title, a.category, a.seller].join(' ').toLowerCase().includes(q)
      );
    }
    if (st !== 'all') {
      result = result.filter(a => getDisplayStatus(a).toLowerCase() === st.toLowerCase());
    }
    if (cat !== 'all') {
      result = result.filter(a => {
        const auctionCategory = String(a.category || '').toLowerCase();
        return cat === 'watches'
          ? auctionCategory === 'watches' || auctionCategory === 'watch'
          : auctionCategory === cat;
      });
    }
    if (srt === 'oldest') {
      result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else if (srt === 'price') {
      result.sort((a, b) => priceNum(b.current_price) - priceNum(a.current_price));
    } else {
      result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    return result;
  }

  function renderStats(data) {
    if (statTotal)     statTotal.textContent     = data.length;
    if (statLive)      statLive.textContent      = data.filter(a => (a.auction_type || '') === 'live').length;
    if (statPending)   statPending.textContent   = data.filter(a => (a.status || '') === 'pending').length;
    if (statSuspended) statSuspended.textContent = data.filter(a => (a.status || '') === 'suspended').length;
  }

  function renderFeatured(data) {
    const featured = data.find(a => (a.auction_type || '') === 'live') || data[0];
    if (!featured) return;
    const el = id => document.getElementById(id);
    if (el('featuredTitle'))       el('featuredTitle').textContent       = featured.title || '';
    if (el('featuredDescription')) el('featuredDescription').textContent = featured.description || '';
    if (el('featuredBid'))         el('featuredBid').textContent         = '$' + Number(featured.current_price || 0).toLocaleString();
    if (el('featuredTime'))        el('featuredTime').textContent        = featured.end_time || '--';
    if (el('featuredSeller'))      el('featuredSeller').textContent      = 'Seller: ' + (featured.seller || 'Unknown');
    if (el('featuredBids'))        el('featuredBids').textContent        = '';
    if (el('featuredEditBtn'))     el('featuredEditBtn').onclick         = () => openEditModal(featured.id);
    if (el('featuredDeleteBtn'))   el('featuredDeleteBtn').onclick       = () => openDeleteModal(featured.id);
  }
function renderTable() {
  if (!auctionTableBody) return;

  const items = getFiltered();

  auctionTableBody.innerHTML = items.map(a => {
    const expected = Number(a.expected_final_price || 0);
    const maxReview = Number(a.max_acceptable_price || 0);
    const current = Number(a.current_price || 0);
    const start = Number(a.start_price || 0);
    const displayStatus = getDisplayStatus(a);

    return `
      <tr class="auction-main-row" data-id="${a.id}">
        <td>
          <div class="auction-info">
            <div class="thumb">
              ${
                a.images && a.images[0]
                  ? `<img src="${escapeAdminHtml(a.images[0])}" style="width:100%;height:100%;object-fit:cover;border-radius:4px;">`
                  : ''
              }
            </div>

            <div>
              <div class="auction-name" title="${escapeAdminHtml(a.title || '')}">
                ${escapeAdminHtml(a.title || '')}
              </div>
              <div class="auction-id">#${a.id}</div>
            </div>
          </div>
        </td>

        <td>${escapeAdminHtml(a.seller || String(a.user_id || ''))}</td>
        <td>${escapeAdminHtml(a.category || '')}</td>

        <td style="color:var(--accent);font-weight:900;">
          $${current.toLocaleString()}
        </td>

        <td>
          <span class="status ${statusClass(displayStatus)}">
            ${escapeAdminHtml(displayStatus)}
          </span>
        </td>

        <td>${escapeAdminHtml(a.end_time || a.created_at || '')}</td>

        <td>
          <div class="action-group">
            <button class="mini-btn admin-toggle-details" data-id="${a.id}">More</button>
          ${String(a.status || '').trim().toLowerCase() === 'pending' ? `<button class="mini-btn admin-approve" data-id="${a.id}">Approve</button>` : ''}
            <button class="mini-btn edit admin-edit" data-id="${a.id}">Edit</button>
            <button class="mini-btn admin-feature" data-id="${a.id}">${Number(a.featured) === 1 ? 'Unfeature' : 'Mark Important'}</button>
            <button class="mini-btn admin-reject" data-id="${a.id}">Reject</button>
            <button class="mini-btn delete admin-delete" data-id="${a.id}">Delete</button>
          </div>
        </td>
      </tr>

      <tr class="auction-details-row" id="auctionDetailsRow-${a.id}" style="display:none;">
        <td colspan="7">
          <div class="auction-inline-details">
            <div class="detail-pill">
              <span>Starting Price</span>
              <strong>$${start.toLocaleString()}</strong>
            </div>

            <div class="detail-pill">
              <span>Expected Final</span>
              <strong>${expected > 0 ? '$' + expected.toLocaleString() : '--'}</strong>
            </div>

            <div class="detail-pill">
              <span>Max Review</span>
              <strong>${maxReview > 0 ? '$' + maxReview.toLocaleString() : '--'}</strong>
            </div>

            <div class="detail-pill wide">
              <span>Description</span>
              <strong>${escapeAdminHtml(a.description || 'No description')}</strong>
            </div>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  bindTableButtons();
}

  function bindTableButtons() {
    document.querySelectorAll('.admin-toggle-details').forEach(btn => {
  btn.addEventListener('click', () => {
    const id = btn.dataset.id;
    const row = document.getElementById(`auctionDetailsRow-${id}`);

    if (!row) return;

    const isOpen = row.style.display !== 'none';

    row.style.display = isOpen ? 'none' : 'table-row';
    btn.textContent = isOpen ? 'More' : 'Less';
  });
});
    document.querySelectorAll('.admin-approve').forEach(btn =>
      btn.addEventListener('click', () => approveAuction(btn.dataset.id, fetchAll))
    );
    document.querySelectorAll('.admin-reject').forEach(btn =>
  btn.addEventListener('click', () => rejectAuction(btn.dataset.id, fetchAll))
);
    document.querySelectorAll('.admin-delete').forEach(btn =>
      btn.addEventListener('click', () => openDeleteModal(btn.dataset.id))
    );
    document.querySelectorAll('.admin-edit').forEach(btn =>
      btn.addEventListener('click', () => openEditModal(btn.dataset.id))
    );
    document.querySelectorAll('.admin-feature').forEach(btn =>
      btn.addEventListener('click', () => toggleFeatured(btn.dataset.id))
    );
  }

  function toggleFeatured(id) {
    fetch('/mazad/api/toggle-featured.php', {
      method: 'POST',
      body: new URLSearchParams({ auction_id: id })
    })
      .then(r => r.json())
      .then(d => {
        if (d.status !== 'success') { alert('Error: ' + (d.message || '')); return; }
        fetchAll();
      })
      .catch(() => alert('Network error'));
  }

  function renderPendingPanel(items) {
    if (!pendingList) return;
    if (!items.length) {
   pendingList.innerHTML = '<div class="card section-card muted">No auctions pending review.</div>';
      return;
    }
    pendingList.innerHTML = items.map(it => `
      <div class="moderation-item pending-item" data-id="${it.id}">
        <div style="display:flex;gap:12px;align-items:center">
          <div style="width:96px;height:64px;overflow:hidden;background:#eee;border-radius:6px;">
            <img src="${(it.images && it.images[0]) ? it.images[0] : (it.image || '')}" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display='none'"/>
          </div>
          <div>
            <div style="font-weight:700">${escapeAdminHtml(it.title || '')}</div>
           <div class="muted">by ${escapeAdminHtml(it.seller || it.user_id || '')} &bull; ${escapeAdminHtml(it.category || '')}</div>

<div class="muted" style="margin-top:.35rem;">
  Expected:
  ${
    Number(it.expected_final_price || 0) > 0
      ? '$' + Number(it.expected_final_price || 0).toLocaleString()
      : '--'
  }
  &bull;
  Max Review:
  ${
    Number(it.max_acceptable_price || 0) > 0
      ? '$' + Number(it.max_acceptable_price || 0).toLocaleString()
      : '--'
  }
</div>
          </div>
        </div>
        <div class="action-group" style="margin-top:8px">
          <button class="btn btn-primary pending-approve" data-id="${it.id}">Approve</button>
          <button class="btn btn-warning pending-reject" data-id="${it.id}">Reject</button>
          <button class="btn btn-danger pending-delete" data-id="${it.id}">Delete</button>
        </div>
      </div>
    `).join('');

    document.querySelectorAll('.pending-approve').forEach(b =>
      b.addEventListener('click', () => approveAuction(b.dataset.id, () => { fetchPendingPanel(); fetchAll(); }))
    );
   document.querySelectorAll('.pending-reject').forEach(b =>
  b.addEventListener('click', () => rejectAuction(b.dataset.id, () => {
    fetchPendingPanel();
    fetchAll();
  }))
);
    document.querySelectorAll('.pending-delete').forEach(b =>
      b.addEventListener('click', () => openDeleteModal(b.dataset.id))
    );
  }

  function toggleCategoryShowcase(id) {
  fetch('/mazad/api/toggle-category-showcase.php', {
    method: 'POST',
    body: new URLSearchParams({ auction_id: id })
  })
    .then(r => r.json())
    .then(d => {
      if (d.status !== 'success') {
        alert('Error: ' + (d.message || 'Could not update showcase'));
        return;
      }

      fetchAll();
    })
    .catch(() => alert('Network error while updating showcase'));
}

function renderShowcaseAdminPanel() {
  if (!showcaseAdminList || !showcaseCategoryFilter) return;

  const selectedCategory = showcaseCategoryFilter.value || 'fashion';

  const items = allAuctions
  .filter(a => {
  const auctionCategory = String(a.category || '').toLowerCase();

  if (selectedCategory === 'watches') {
    return auctionCategory === 'watch' || auctionCategory === 'watches';
  }

  if (selectedCategory === 'cars') {
    return auctionCategory === 'cars' || auctionCategory === 'car';
  }

  return auctionCategory === selectedCategory;
})
    .filter(a => String(a.status || '').toLowerCase() === 'approved' && !isAuctionExpired(a))
    .sort((a, b) => {
      const aShow = Number(a.category_showcase || 0);
      const bShow = Number(b.category_showcase || 0);

      if (bShow !== aShow) return bShow - aShow;

      const aOrder = Number(a.showcase_order || 0);
      const bOrder = Number(b.showcase_order || 0);

      if (aOrder !== bOrder) return aOrder - bOrder;

      return Number(b.id || 0) - Number(a.id || 0);
    });

  if (!items.length) {
    showcaseAdminList.innerHTML = `
      <div class="card section-card muted">
        No approved auctions found in this category.
      </div>
    `;
    return;
  }

  showcaseAdminList.innerHTML = items.map(a => {
    const isShowcase =
      Number(a.category_showcase) === 1 ||
      a.category_showcase === true ||
      a.category_showcase === '1';

    const imageUrl =
      a.images && a.images[0]
        ? a.images[0]
        : (a.image || '');

    return `
      <div class="showcase-admin-item" data-id="${a.id}">
        <div class="showcase-admin-main">
          <div class="showcase-admin-thumb">
            ${
              imageUrl
                ? `<img src="${escapeAdminHtml(imageUrl)}" alt="${escapeAdminHtml(a.title || '')}">`
                : `<span>${escapeAdminHtml((a.title || '?').charAt(0).toUpperCase())}</span>`
            }
          </div>

          <div class="showcase-admin-info">
            <div class="showcase-admin-title">
              ${escapeAdminHtml(a.title || 'Untitled')}
            </div>

            <div class="showcase-admin-meta">
              ${escapeAdminHtml(a.seller || ('User#' + a.user_id))}
              · $${Number(a.current_price || a.start_price || 0).toLocaleString()}
              · #${a.id}
            </div>
          </div>
        </div>

        <div class="showcase-admin-actions">
          ${
            isShowcase
              ? `<span class="status status-active">In Showcase</span>`
              : `<span class="status status-ended">Not Selected</span>`
          }

          <button
            class="btn ${isShowcase ? 'btn-danger' : 'btn-primary'} showcase-toggle-btn"
            data-id="${a.id}"
            type="button"
          >
            ${isShowcase ? 'Remove from Showcase' : 'Add to Showcase'}
          </button>
        </div>
      </div>
    `;
  }).join('');

  document.querySelectorAll('.showcase-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      toggleCategoryShowcase(btn.dataset.id);
    });
  });
}
  function renderLiveGrid(data) {
    if (!liveGrid) return;
    const liveItems = data.filter(a => (a.auction_type || '') === 'live');
    if (!liveItems.length) {
      liveGrid.innerHTML = '<div class="card section-card muted">No live auctions right now.</div>';
      return;
    }
    liveGrid.innerHTML = liveItems.map(a => {
      const displayStatus = getDisplayStatus(a);
      const expired = displayStatus.toLowerCase() === 'ended';
      return `
      <div class="live-card">
        <div class="live-cover">${a.images && a.images[0] ? `<img src="${a.images[0]}" style="width:100%;height:100%;object-fit:cover;">` : ''}</div>
        <div class="live-top">
          <div>
            <div style="font-weight:800;font-size:1.05rem;">${escapeAdminHtml(a.title || '')}</div>
            <div class="muted" style="font-size:.9rem;margin-top:.2rem;">${escapeAdminHtml(a.seller || a.user_id || '')}</div>
          </div>
          <span class="status ${statusClass(displayStatus)}">${escapeAdminHtml(displayStatus)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;color:var(--text-muted);font-size:.92rem;">
          <span>$${Number(a.current_price || 0).toLocaleString()}</span>
          <span>⏱ ${a.end_time || '--'}</span>
        </div>
        <div class="live-actions">
          <button class="mini-btn" onclick="openEditModal(${a.id})">View</button>
          <button class="mini-btn edit" onclick="openEditModal(${a.id})">Edit</button>
          ${expired ? '' : `<button class="mini-btn stop" onclick="rejectAuction(${a.id}, fetchAll)">Stop</button>`}
        </div>
      </div>
    `;
    }).join('');
  }

  function renderSuspendedPanel(data) {
    if (!suspendedList) return;
    const items = data.filter(a => (a.status || '').toLowerCase() === 'suspended');
    if (!items.length) {
     suspendedList.innerHTML = '<div class="card section-card muted">No suspended auctions right now.</div>';
      return;
    }
    suspendedList.innerHTML = items.map(a => `
      <div class="moderation-item" data-id="${a.id}">
        <div>
          <div style="font-size:1.05rem;font-weight:800;">${escapeAdminHtml(a.title || '')}</div>
          <div class="muted" style="margin-top:.35rem;">
            ${escapeAdminHtml(a.seller || ('User#' + a.user_id))}
            &bull; ${escapeAdminHtml(a.category || '')}
            &bull; $${Number(a.current_price || 0).toLocaleString()}
          </div>
         <div class="muted" style="margin-top:.35rem;">This auction is suspended. Admins can reactivate, edit, or delete it.</div>
        </div>
        <div class="action-group">
          <button class="btn btn-secondary suspended-reactivate" data-id="${a.id}">Reactivate</button>
          <button class="btn btn-secondary suspended-edit" data-id="${a.id}">Edit</button>
          <button class="btn btn-danger suspended-delete" data-id="${a.id}">Delete</button>
        </div>
      </div>
    `).join('');

    document.querySelectorAll('.suspended-reactivate').forEach(btn =>
      btn.addEventListener('click', () => {
        if (!confirm('Reactivate this auction?')) return;
        approveAuction(btn.dataset.id, fetchAll);
      })
    );
    document.querySelectorAll('.suspended-edit').forEach(btn =>
      btn.addEventListener('click', () => openEditModal(btn.dataset.id))
    );
    document.querySelectorAll('.suspended-delete').forEach(btn =>
      btn.addEventListener('click', () => openDeleteModal(btn.dataset.id))
    );
  }

  function renderRecentActivity(data) {
    const box = document.getElementById('recentActivity');
    if (!box) return;
    const recent = [...data]
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, 5);
  if (!recent.length) { box.innerHTML = '<div class="list-item muted">No recent activity.</div>'; return; }
    box.innerHTML = recent.map(a => {
      const displayStatus = getDisplayStatus(a);
      const status = displayStatus.toLowerCase();
      const icon = status === 'approved' ? '✅' : status === 'pending' ? '🕓' : status === 'rejected' || status === 'suspended' ? '⛔' : '•';
      return `<div class="list-item">${icon} ${escapeAdminHtml(a.title || 'Untitled')} <span class="muted">(${escapeAdminHtml(displayStatus)})</span></div>`;
    }).join('');
  }

  function renderAlerts(data) {
    const box = document.getElementById('adminAlerts');
    if (!box) return;
    const pending   = data.filter(a => (a.status || '') === 'pending').length;
    const live      = data.filter(a => (a.auction_type || '') === 'live').length;
    const suspended = data.filter(a => (a.status || '') === 'suspended').length;
    const items = [];
    if (pending)   items.push(`⚠️ ${pending} auction${pending > 1 ? 's' : ''} pending review`);
if (live)      items.push(`🔴 ${live} live auction${live > 1 ? 's' : ''} right now`);
if (suspended) items.push(`⛔ ${suspended} suspended auction${suspended > 1 ? 's' : ''}`);
    box.innerHTML = items.length
      ? items.map(t => `<div class="list-item">${t}</div>`).join('')
     : '<div class="list-item muted">No alerts right now.</div>';
  }

 function renderAll() {
  renderStats(allAuctions);
  renderFeatured(allAuctions);
  renderTable();
  renderLiveGrid(allAuctions);
  renderPendingPanel(allAuctions.filter(a => (a.status || '') === 'pending'));
  renderSuspendedPanel(allAuctions);
  renderRecentActivity(allAuctions);
  renderAlerts(allAuctions);
  renderShowcaseAdminPanel();
}

  // ── CRUD actions ───────────────────────────────────────────────

  function approveAuction(id, cb) {
    fetch('/mazad/api/approve-auction.php', { method: 'POST', body: new URLSearchParams({ auction_id: id }) })
      .then(r => r.json())
      .then(d => { if (d.status === 'success') { if (cb) cb(); } else alert('Error: ' + (d.message || '')); })
      .catch(() => alert('Network error'));
  }

  function rejectAuction(id, cb) {
    fetch('/mazad/api/reject-auction.php', { method: 'POST', body: new URLSearchParams({ auction_id: id }) })
      .then(r => r.json())
      .then(d => { if (d.status === 'success') { if (cb) cb(); } else alert('Error: ' + (d.message || '')); })
      .catch(() => alert('Network error'));
  }

  function doDeleteAuction(id, cb) {
    fetch('/mazad/api/delete-auction.php', { method: 'POST', body: new URLSearchParams({ auction_id: id }) })
      .then(r => r.json())
      .then(d => { if (d.status === 'success') { if (cb) cb(); } else alert('Error: ' + (d.message || '')); })
      .catch(() => alert('Network error'));
  }

  // ── Modals ─────────────────────────────────────────────────────

  function openEditModal(id) {
    const a = allAuctions.find(x => String(x.id) === String(id));
    if (!a) return;
    currentEditId = String(id);
    const el = i => document.getElementById(i);
    if (el('editTitle'))       el('editTitle').value       = a.title || '';
    if (el('editSeller'))      el('editSeller').value      = a.seller || '';
   if (el('editCategory')) {
  const cleanCategory = String(a.category || 'fashion').trim().toLowerCase();
  el('editCategory').value = cleanCategory || 'fashion';
}
    if (el('editBid'))         el('editBid').value         = a.current_price || '';
    if (el('editStatus')) {
  const cleanStatus = String(a.status || 'pending').trim().toLowerCase();
  el('editStatus').value = cleanStatus || 'pending';
}
   if (el('editEndsIn')) {
  el('editEndsIn').value = toDateTimeLocal(a.end_time || '');
}
    if (el('editDescription')) el('editDescription').value = a.description || '';
    if (editModal) editModal.classList.add('active');
  }

  function openDeleteModal(id) {
    currentDeleteId = String(id);
    const a = allAuctions.find(x => String(x.id) === String(id));
    const el = document.getElementById('deleteText');
    if (el) el.textContent = `Are you sure you want to delete "${a ? a.title : 'this auction'}"? This cannot be undone.`;
    if (deleteModal) deleteModal.classList.add('active');
  }

  // expose to inline onclick attrs
  window.openEditModal   = openEditModal;
  window.openDeleteModal = openDeleteModal;
  window.approveAuction  = approveAuction;
  window.rejectAuction   = rejectAuction;
  window.fetchAll        = fetchAll;

  // Edit modal save → write all fields via update-auction endpoint
  const saveEdit = document.getElementById('saveEdit');
  if (saveEdit) {
    saveEdit.addEventListener('click', () => {
      if (!currentEditId) return;
      const v = id => { const el = document.getElementById(id); return el ? el.value : ''; };
   const body = new URLSearchParams({
  auction_id:    currentEditId,
  title:         v('editTitle'),
  description:   v('editDescription'),
  category:      v('editCategory'),
  current_price: v('editBid'),
  end_time:      fromDateTimeLocal(v('editEndsIn'))
});

const statusValue = v('editStatus').trim();
const originalAuction = allAuctions.find(x => String(x.id) === String(currentEditId));

const oldEndTime = originalAuction ? toDateTimeLocal(originalAuction.end_time || '') : '';
const newEndTime = v('editEndsIn');

const endTimeChanged = oldEndTime !== newEndTime;

/*
  New rule:
  If admin changes end date/time, send auction back to pending review.
  This prevents accidental re-approval after changing dates.
*/
if (endTimeChanged && statusValue !== 'suspended' && statusValue !== 'rejected') {
  body.append('status', 'pending');
} else if (statusValue !== '') {
  body.append('status', statusValue);
}
      saveEdit.disabled = true;
      const orig = saveEdit.textContent;
      saveEdit.textContent = 'Saving...';
      fetch('/mazad/api/update-auction.php', { method: 'POST', body })
        .then(r => r.json())
        .then(j => {
          if (j.status === 'success') {
            if (editModal) editModal.classList.remove('active');
            currentEditId = null;
            fetchAll();
          } else {
            alert('Save failed: ' + (j.message || 'unknown'));
          }
        })
        .catch(() => alert('Network error saving'))
        .finally(() => { saveEdit.disabled = false; saveEdit.textContent = orig; });
    });
  }

  const cancelEdit = document.getElementById('cancelEdit');
  if (cancelEdit) cancelEdit.addEventListener('click', () => { editModal && editModal.classList.remove('active'); currentEditId = null; });

  const confirmDelete = document.getElementById('confirmDelete');
  if (confirmDelete) {
    confirmDelete.addEventListener('click', () => {
      if (!currentDeleteId) return;
      doDeleteAuction(currentDeleteId, fetchAll);
      if (deleteModal) deleteModal.classList.remove('active');
      currentDeleteId = null;
    });
  }

  const cancelDelete = document.getElementById('cancelDelete');
  if (cancelDelete) cancelDelete.addEventListener('click', () => { deleteModal && deleteModal.classList.remove('active'); currentDeleteId = null; });

  [editModal, deleteModal, ledgerModal].forEach(modal => {
    if (modal) modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('active', 'show'); });
  });

  // ── Tab switching ──────────────────────────────────────────────

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(x => x.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(x => x.classList.remove('active'));
      btn.classList.add('active');
      const panel = document.getElementById(btn.dataset.tab);
      if (panel) panel.classList.add('active');
    });
  });

  // ── Search & filter ────────────────────────────────────────────

  [searchInput, statusFilter, sortFilter, categoryFilter].forEach(el => {
    if (el) {
      el.addEventListener('input', renderTable);
      el.addEventListener('change', renderTable);
    }
  });

  // ── Seed demo auctions ─────────────────────────────────────────

  const seedAuctionsBtn = document.getElementById('seedAuctionsBtn');
  if (seedAuctionsBtn) {
    seedAuctionsBtn.addEventListener('click', () => {
      if (!confirm('Insert 12 demo auctions across all categories? Existing entries with the same title are skipped.')) return;
      seedAuctionsBtn.disabled = true;
      seedAuctionsBtn.textContent = 'Seeding...';
      fetch('/mazad/api/seed-auctions.php', { method: 'POST' })
        .then(r => r.json())
        .then(j => {
          if (j.status === 'success') alert(`Seeded ${j.created} new auctions (of ${j.total_samples}).`);
          else alert('Seed failed: ' + (j.message || 'unknown'));
          fetchAll();
        })
        .catch(() => alert('Seed failed (network)'))
        .finally(() => { seedAuctionsBtn.disabled = false; seedAuctionsBtn.textContent = 'Seed Demo Auctions'; });
    });
  }

  // ── Settlement button ──────────────────────────────────────────

  const runSettlementBtn = document.getElementById('runSettlementBtn');
  if (runSettlementBtn) {
    runSettlementBtn.addEventListener('click', () => {
      if (!confirm('Run settlement for finished auctions? This will award tokens to buyers/sellers.')) return;
      runSettlementBtn.disabled = true;
      runSettlementBtn.textContent = 'Running...';
      fetch('/mazad/api/settle-auctions.php', { method: 'POST' })
        .then(r => r.json())
        .then(j => {
          const settled = Number(j.settled_count ?? j.settled ?? 0);
          const skipped = Number(j.skipped_count ?? 0);
          const eligible = Number(j.eligible_count ?? 0);
          alert(`Settlement: ${settled} settled, ${skipped} skipped, ${eligible} eligible.`);
          fetchAll();
        })
        .catch(() => alert('Settlement failed'))
        .finally(() => { runSettlementBtn.disabled = false; runSettlementBtn.textContent = 'Run Settlement'; });
    });
  }

  // ── Token Ledger ───────────────────────────────────────────────

  const openLedgerBtn = document.getElementById('openLedgerBtn');
  const closeLedger   = document.getElementById('closeLedger');

  function renderLedger(rows) {
    if (!ledgerContent) return;
    if (!rows || !rows.length) { ledgerContent.innerHTML = '<div class="empty">No ledger entries.</div>'; return; }
    ledgerContent.innerHTML = rows.map(r => `
      <div style="display:flex;justify-content:space-between;padding:8px;border-bottom:1px solid #eee">
        <div style="flex:1">
          <div style="font-weight:700">${escapeAdminHtml(r.user_name || r.user_email || 'User#' + r.user_id)}</div>
          <div style="color:#666;font-size:.9rem">${escapeAdminHtml(r.reason || '')} &bull; Auction: ${escapeAdminHtml(r.auction_id || '-')}</div>
        </div>
        <div style="width:160px;text-align:right">
          <div style="font-weight:800;color:${r.delta > 0 ? '#0a0' : '#a00'}">${r.delta > 0 ? '+' + r.delta : r.delta}</div>
          <div style="color:#999;font-size:.85rem">${r.created_at}</div>
        </div>
      </div>
    `).join('');
  }

  if (openLedgerBtn) {
    openLedgerBtn.addEventListener('click', () => {
      if (ledgerModal) ledgerModal.classList.add('show');
      fetch('/mazad/api/get-token-ledger.php?limit=200')
        .then(r => r.json())
        .then(j => { if (j.status === 'success') renderLedger(j.data); else if (ledgerContent) ledgerContent.innerHTML = '<div class="empty">Error loading ledger</div>'; })
        .catch(() => { if (ledgerContent) ledgerContent.innerHTML = '<div class="empty">Network error</div>'; });
    });
  }

  if (closeLedger) closeLedger.addEventListener('click', () => ledgerModal && ledgerModal.classList.remove('show'));

  // ── Admin profile menu + logout ────────────────────────────────

function adminLogout() {
  fetch('/mazad/api/logout.php').finally(() => {
    localStorage.removeItem('mazadUser');
    window.location.href = 'login.html';
  });
}

const adminProfileBtn = document.getElementById('adminProfileBtn');
const adminProfileDropdown = document.getElementById('adminProfileDropdown');
const adminDropdownLogout = document.getElementById('adminDropdownLogout');
const adminProfileName = document.getElementById('adminProfileName');
const adminProfileRole = document.getElementById('adminProfileRole');
const adminProfileImg = document.getElementById('adminProfileImg');
const adminDropdownName = document.getElementById('adminDropdownName');
const adminDropdownEmail = document.getElementById('adminDropdownEmail');
function getAdminProfileImageSrc(rawImage) {
  const fallback = 'logo (1).png';

  if (!rawImage) return fallback;

  const img = String(rawImage).trim();

  if (!img) return fallback;

  // مهم: إذا الصورة مخزنة في الداتا بيس كـ Base64
  if (img.startsWith('data:image/')) {
    return img;
  }

  if (img.startsWith('http://') || img.startsWith('https://')) {
    return img;
  }

  if (img.startsWith('/')) {
    return img;
  }

  if (img.startsWith('assets/')) {
    return img;
  }

  if (img.startsWith('uploads/')) {
    return '/mazad/' + img.replace(/^\/+/, '');
  }

  return '/mazad/uploads/' + img.replace(/^\/+/, '');
}

function fillAdminHeader(currentUser) {
  if (!currentUser) return;

  const displayName =
    currentUser.name ||
    currentUser.full_name ||
    currentUser.username ||
    'Admin';

  const displayEmail =
    currentUser.email ||
    'admin@mazad.com';

  if (adminProfileName) {
    adminProfileName.textContent = displayName;
  }

  if (adminProfileRole) {
    adminProfileRole.textContent = currentUser.role || 'admin';
  }

  if (adminDropdownName) {
    adminDropdownName.textContent = displayName;
  }

  if (adminDropdownEmail) {
    adminDropdownEmail.textContent = displayEmail;
  }

  if (adminProfileImg) {
    adminProfileImg.src = getAdminProfileImageSrc(currentUser.profile_image);

    adminProfileImg.onerror = function () {
      this.onerror = null;
      this.src = 'assets/images/default-avatar.png';
    };
  }
}

// أولًا عبّي الهيدر من localStorage مؤقتًا عشان ما يطلع فاضي
fillAdminHeader(user);

// بعدين جيب النسخة الصحيحة من الداتا بيس
fetch('/mazad/api/get-current-user.php', { cache: 'no-store' })
  .then(r => r.json())
  .then(res => {
    if (res.status === 'success' && res.user) {
      fillAdminHeader(res.user);
      localStorage.setItem('mazadUser', JSON.stringify(res.user));
    }
  })
  .catch(err => {
    console.warn('Could not load current user from database', err);
  });

if (adminProfileBtn && adminProfileDropdown) {
  adminProfileBtn.addEventListener('click', e => {
    e.stopPropagation();
    adminProfileDropdown.classList.toggle('open');

    const notificationDropdown = document.getElementById('notifDropdown');
    if (notificationDropdown) {
      notificationDropdown.classList.remove('open');
    }
  });
}

if (adminDropdownLogout) {
  adminDropdownLogout.addEventListener('click', adminLogout);
}

document.addEventListener('click', e => {
  if (!adminProfileDropdown || !adminProfileBtn) return;

  if (
    adminProfileDropdown.classList.contains('open') &&
    !adminProfileDropdown.contains(e.target) &&
    !adminProfileBtn.contains(e.target)
  ) {
    adminProfileDropdown.classList.remove('open');
  }
});

 // ── Notifications bell ─────────────────────────────────────────

const notifBell     = document.getElementById('notifBell');
const notifDropdown = document.getElementById('notifDropdown');
const notifBadge    = document.getElementById('notifBadge');
const notifBody     = document.getElementById('notifBody');
const notifMarkAll  = document.getElementById('notifMarkAll');
const notifClearAll = document.getElementById('notifClearAll');
function getAdminNotificationIcon(type) {
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

function countAdminUnreadItems(items) {
  return items.filter(item =>
    Number(item.is_read) === 0 ||
    Number(item.read) === 0 ||
    item.unread === true ||
    String(item.data_read || item.read_status || '').toLowerCase() === '0'
  ).length;
}

function updateAdminNotificationBadge(count) {
  if (!notifBadge) return;

  let unread = Number(count);

  if (!Number.isFinite(unread) && notifDropdown) {
    unread = notifDropdown.querySelectorAll(
      '.header-notif-item.unread, .notif-item.unread, .admin-notif-item.unread, .employee-notif-item.unread, [data-read="0"], [data-unread="true"]'
    ).length;
  }

  if (unread > 0) {
    notifBadge.textContent = unread > 9 ? '9+' : String(unread);
    notifBadge.hidden = false;
  } else {
    notifBadge.hidden = true;
  }
}

function renderAdminNotifications(items, unread) {
  if (!notifBody) return;

  const unreadCount = Number.isFinite(Number(unread)) ? Number(unread) : countAdminUnreadItems(items);
  updateAdminNotificationBadge(unreadCount);

  if (!items.length) {
    notifBody.innerHTML = '<div class="notif-empty">No notifications yet.</div>';
    return;
  }

  notifBody.innerHTML = items.map((it, i) => {
    const isUnread = Number(it.is_read) === 0;
    const icon = getAdminNotificationIcon(it.type);

  return `
  <div class="notif-item header-notif-item ${isUnread ? 'unread' : ''}" data-i="${i}" data-link="${escapeAdminHtml(it.link || '')}">
    <button
      class="notif-delete header-notif-delete"
      type="button"
      data-id="${Number(it.id || 0)}"
      title="Delete notification"
      aria-label="Delete notification"
    >×</button>

    <span class="icon header-notif-icon">${icon}</span>
    <div class="body header-notif-content">
          <strong>${escapeAdminHtml(it.title || it.subject || 'Notification')}</strong>
          <span>${escapeAdminHtml(it.message || it.body || '')}</span>
          <small class="muted" style="display:block;margin-top:.25rem;">
            ${escapeAdminHtml(it.created_at || '')}
          </small>
        </div>
      </div>
    `;
  }).join('');

  notifBody.querySelectorAll('.notif-item').forEach(node => {
    node.addEventListener('click', () => {
      const link = node.dataset.link;
      if (notifDropdown) notifDropdown.classList.remove('open');

      if (link) {
        window.location.href = link;
      }
    });
  });
  notifBody.querySelectorAll('.notif-delete').forEach(btn => {
  btn.addEventListener('click', e => {
    e.stopPropagation();
    deleteAdminNotification(btn.dataset.id);
  });
});

  updateAdminNotificationBadge(unreadCount);
}

function renderNotifications() {
  if (!notifBody) return;

  notifBody.innerHTML = '<div class="notif-empty">Loading...</div>';

  fetch('/mazad/api/get-notifications.php', { cache: 'no-store' })
    .then(r => r.json())
    .then(data => {
      if (data.status !== 'success') {
        notifBody.innerHTML = '<div class="notif-empty">Could not load notifications.</div>';
        if (notifBadge) notifBadge.hidden = true;
        return;
      }

      const items =
        Array.isArray(data.notifications)
          ? data.notifications
          : Array.isArray(data.data)
            ? data.data
            : [];

      const unread = Number(data.unread_count ?? data.unread ?? countAdminUnreadItems(items));

      renderAdminNotifications(items, unread);
    })
    .catch(() => {
      notifBody.innerHTML = '<div class="notif-empty">Network error.</div>';
      if (notifBadge) notifBadge.hidden = true;
    });
}

function markAdminNotificationsRead() {
  fetch('/mazad/api/mark-notifications-read.php', {
    method: 'POST'
  })
    .then(r => r.json())
    .then(data => {
      if (data.status === 'success') {
        updateAdminNotificationBadge(0);
        renderNotifications();
      }
    })
    .catch(() => {});
}
function deleteAdminNotification(id) {
  if (!id) return;

  fetch('/mazad/api/delete-notification.php', {
    method: 'POST',
    body: new URLSearchParams({ notification_id: id })
  })
    .then(r => r.json())
    .then(data => {
      if (data.status === 'success') {
        updateAdminNotificationBadge(0);
        renderNotifications();
      }
    })
    .catch(() => {});
}

function deleteAllAdminNotifications() {
  fetch('/mazad/api/delete-all-notifications.php', {
    method: 'POST'
  })
    .then(r => r.json())
    .then(data => {
      if (data.status === 'success') {
        updateAdminNotificationBadge(0);
        renderNotifications();
      }
    })
    .catch(() => {});
}

if (notifBell) {
  notifBell.addEventListener('click', e => {
    e.stopPropagation();

    if (!notifDropdown) return;

    const opening = !notifDropdown.classList.contains('open');
    notifDropdown.classList.toggle('open');

    const adminProfileDropdown = document.getElementById('adminProfileDropdown');
    if (adminProfileDropdown) {
      adminProfileDropdown.classList.remove('open');
    }

    if (opening) {
      renderNotifications();
    }
  });
}

if (notifMarkAll) {
  notifMarkAll.addEventListener('click', e => {
    e.stopPropagation();
    markAdminNotificationsRead();
  });
}

if (notifClearAll) {
  notifClearAll.addEventListener('click', e => {
    e.stopPropagation();

    if (!confirm('Delete all notifications?')) return;

    deleteAllAdminNotifications();
  });
}
document.addEventListener('click', e => {
  if (!notifDropdown || !notifBell) return;

  if (
    notifDropdown.classList.contains('open') &&
    !notifDropdown.contains(e.target) &&
    e.target !== notifBell &&
    !notifBell.contains(e.target)
  ) {
    notifDropdown.classList.remove('open');
  }
});
  // Refresh badge whenever data changes
  const origRenderAll = renderAll;
  renderAll = function patchedRenderAll() {
    origRenderAll();
    renderNotifications();
  };

  function fetchPendingBids() {
  const list = document.getElementById('pendingBidsList');

  if (list) {
    list.innerHTML = '<div class="card section-card muted">Loading high bid requests...</div>';
  }

  fetch('/mazad/api/get-pending-bids.php', { cache: 'no-store' })
    .then(r => r.json())
    .then(res => {
      if (res.status !== 'success') {
        if (list) {
          list.innerHTML = `<div class="card section-card muted">Failed to load pending bids: ${res.message || ''}</div>`;
        }
        return;
      }

      renderPendingBids(res.data || []);
    })
    .catch(err => {
      console.error('fetchPendingBids error', err);
      if (list) {
        list.innerHTML = '<div class="card section-card muted">Network error while loading pending bids.</div>';
      }
    });
}

function renderPendingBids(items) {
  const list = document.getElementById('pendingBidsList');
  if (!list) return;

  if (!items.length) {
   list.innerHTML = '<div class="card section-card muted">No high bid requests pending review.</div>';
    return;
  }

  list.innerHTML = items.map(b => `
    <div class="moderation-item pending-bid-item" data-id="${b.bid_id}">
      <div>
        <div style="font-weight:800;font-size:1.05rem;">
          ${escapeAdminHtml(b.auction_title || 'Untitled Auction')}
        </div>

        <div class="muted" style="margin-top:.35rem;">
          Bidder: ${escapeAdminHtml(b.bidder_name || ('User#' + b.user_id))}
          &bull; Category: ${escapeAdminHtml(b.category || '')}
          &bull; Auction #${b.auction_id}
        </div>

        <div style="margin-top:.6rem;">
          <strong>Requested bid:</strong>
          <span style="color:var(--accent);font-weight:900;">
            $${Number(b.bid_amount || 0).toLocaleString()}
          </span>
        </div>

        <div class="muted" style="margin-top:.25rem;">
          Current price: $${Number(b.current_price || 0).toLocaleString()}
          &bull; Reason: ${escapeAdminHtml(b.review_reason || 'High value bid')}
        </div>
      </div>

      <div class="action-group" style="margin-top:10px">
        <button class="btn btn-primary approve-pending-bid" data-id="${b.bid_id}">
          Approve Bid
        </button>
        <button class="btn btn-danger reject-pending-bid" data-id="${b.bid_id}">
          Reject Bid
        </button>
      </div>
    </div>
  `).join('');

  document.querySelectorAll('.approve-pending-bid').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!confirm('Approve this high-value bid? This will update the auction current price.')) return;
      approvePendingBid(btn.dataset.id);
    });
  });

  document.querySelectorAll('.reject-pending-bid').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!confirm('Reject this high-value bid?')) return;
      rejectPendingBid(btn.dataset.id);
    });
  });
}

function approvePendingBid(bidId) {
  fetch('/mazad/api/approve-bid.php', {
    method: 'POST',
    body: new URLSearchParams({ bid_id: bidId })
  })
    .then(r => r.json())
    .then(res => {
      if (res.status === 'success') {
        alert('Bid approved successfully');
        fetchPendingBids();
        fetchAll();
      } else {
        alert('Approve failed: ' + (res.message || 'unknown error'));
        fetchPendingBids();
        fetchAll();
      }
    })
    .catch(() => alert('Network error while approving bid'));
}

function rejectPendingBid(bidId) {
  fetch('/mazad/api/reject-bid.php', {
    method: 'POST',
    body: new URLSearchParams({ bid_id: bidId })
  })
    .then(r => r.json())
    .then(res => {
      if (res.status === 'success') {
        alert('Bid rejected successfully');
        fetchPendingBids();
      } else {
        alert('Reject failed: ' + (res.message || 'unknown error'));
      }
    })
    .catch(() => alert('Network error while rejecting bid'));
}

function escapeAdminHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

// ── Daily Reports ───────────────────────────────────────────────

function openReportsModal(date = null) {
  const modal = document.getElementById('reportsModal');
  const input = document.getElementById('reportDateInput');

  if (!modal) return;

  modal.classList.add('active');

  const today = new Date().toISOString().slice(0, 10);
  const selectedDate = date || today;

  if (input) input.value = selectedDate;

  loadAdminReport(selectedDate);
}

function closeReportsModal() {
  const modal = document.getElementById('reportsModal');
  if (modal) modal.classList.remove('active');
}

function loadAdminReport(date) {
  const content = document.getElementById('reportContent');
  const title = document.getElementById('reportTitle');
  const subtitle = document.getElementById('reportSubtitle');

  if (content) {
    content.innerHTML = '<div class="card section-card muted">Loading report...</div>';
  }

  fetch(`/mazad/api/admin-report.php?date=${encodeURIComponent(date)}`, {
    cache: 'no-store'
  })
    .then(r => r.json())
    .then(res => {
      if (res.status !== 'success') {
        if (content) {
          content.innerHTML = `<div class="card section-card muted">Failed to load report: ${escapeAdminHtml(res.message || '')}</div>`;
        }
        return;
      }

      const report = res.report || {};
      const days = res.days || [];

      if (title) {
        title.textContent = report.date === new Date().toISOString().slice(0, 10)
          ? 'Today Report'
          : `Report: ${report.date}`;
      }

      if (subtitle) {
        subtitle.textContent = 'Daily platform summary';
      }

      renderReportDays(days, report.date);
      renderAdminReport(report);
    })
    .catch(err => {
      console.error('loadAdminReport error', err);
      if (content) {
        content.innerHTML = '<div class="card section-card muted">Network error while loading report.</div>';
      }
    });
}

function renderReportDays(days, selectedDate) {
  const daysList = document.getElementById('reportDaysList');
  const input = document.getElementById('reportDateInput');

  if (!daysList) return;

  if (!days.length) {
    daysList.innerHTML = '<div class="muted">No report days found.</div>';
    return;
  }

  daysList.innerHTML = days.map(day => {
    const active = day.date === selectedDate;

    return `
      <button
        type="button"
        class="report-day-btn ${active ? 'active' : ''}"
        data-date="${escapeAdminHtml(day.date)}"
        style="
          width:100%;
          text-align:start;
          margin-bottom:.6rem;
          padding:.75rem;
          border-radius:12px;
          border:1px solid ${active ? 'var(--accent)' : 'rgba(255,255,255,.12)'};
          background:${active ? 'rgba(212,175,55,.14)' : 'rgba(255,255,255,.04)'};
          color:inherit;
          cursor:pointer;
        "
      >
        <div style="font-weight:800;">${escapeAdminHtml(day.label || day.date)}</div>
        <div class="muted" style="font-size:.82rem;margin-top:.25rem;">
          Auctions: ${Number(day.total_auctions || 0)}
          · Bids: ${Number(day.total_bids || 0)}
          · Users: ${Number(day.new_users || 0)}
        </div>
        ${
          Number(day.pending_high_bids || 0) > 0
            ? `<div style="margin-top:.25rem;color:#ffcc66;font-size:.82rem;font-weight:800;">
                ${Number(day.pending_high_bids)} high bids pending
              </div>`
            : ''
        }
      </button>
    `;
  }).join('');

  document.querySelectorAll('.report-day-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const date = btn.dataset.date;
      if (input) input.value = date;
      loadAdminReport(date);
    });
  });
}

function renderAdminReport(report) {
  const content = document.getElementById('reportContent');

  if (!content) return;

const cards = [
  { label: 'Total Auctions', value: report.total_auctions, note: 'Auctions added on this day' },
  { label: 'Approved Auctions', value: report.approved_auctions, note: 'Auctions approved by admin' },
  { label: 'Pending Auctions', value: report.pending_auctions, note: 'Auctions waiting for review' },
  { label: 'Rejected Auctions', value: report.rejected_auctions, note: 'Rejected auctions' },
  { label: 'Total Bids', value: report.total_bids, note: 'Total bids on this day' },
  { label: 'Approved Bids', value: report.approved_bids, note: 'Accepted bids' },
  { label: 'High Bids Pending', value: report.pending_high_bids, note: 'High bids waiting for admin approval' },
  { label: 'Rejected Bids', value: report.rejected_bids, note: 'Rejected bids' },
  { label: 'Highest Bid', value: '$' + Number(report.highest_bid || 0).toLocaleString(), note: 'Highest bid on this day' },
  { label: 'New Users', value: report.new_users, note: 'New registered users' }
];
  content.innerHTML = `
    <div id="printableReport">
      <div style="margin-bottom:1rem;">
        <h2 style="margin:0;">MAZAD Daily Report</h2>
        <div class="muted" style="margin-top:.25rem;">Date: ${escapeAdminHtml(report.date || '')}</div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:1rem;">
        ${cards.map(card => `
          <div class="stat-card">
            <div class="stat-label">${escapeAdminHtml(card.label)}</div>
            <div class="stat-value">${card.value ?? 0}</div>
            <div class="stat-note">${escapeAdminHtml(card.note)}</div>
          </div>
        `).join('')}
      </div>

      <div class="card section-card" style="margin-top:1rem;">
        <div class="section-title" style="font-size:1.4rem;">Summary</div>
        <div class="section-subtitle" style="margin-top:.5rem;line-height:1.8;">
          In this day, ${Number(report.total_auctions || 0)} auctions were added,
          and ${Number(report.total_bids || 0)} bids were registered,
          including ${Number(report.pending_high_bids || 0)} high bids that need review.
          Additionally, ${Number(report.new_users || 0)} new users were registered.
        </div>
      </div>
    </div>
  `;
}

function printAdminReport() {
  const printable = document.getElementById('printableReport');

  if (!printable) {
    alert('No report to print');
    return;
  }

  const win = window.open('', '_blank');

  win.document.write(`
    <html>
      <head>
        <title>MAZAD Daily Report</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 24px;
            color: #111;
          }

          .muted {
            color: #666;
          }

          .stat-card {
            border: 1px solid #ddd;
            border-radius: 12px;
            padding: 14px;
            margin-bottom: 10px;
            display: inline-block;
            width: 210px;
            vertical-align: top;
          }

          .stat-label {
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
          }

          .stat-value {
            font-size: 28px;
            font-weight: 800;
            margin: 8px 0;
          }

          .stat-note {
            font-size: 12px;
            color: #777;
          }
        </style>
      </head>
      <body>
        ${printable.innerHTML}
      </body>
    </html>
  `);

  win.document.close();
  win.focus();
  win.print();
}

function bindReportsControls() {
  const navReports = document.getElementById('navReports');
  const quickViewReports = document.getElementById('quickViewReports');
  const closeReportsBtn = document.getElementById('closeReportsBtn');
  const loadReportBtn = document.getElementById('loadReportBtn');
  const printReportBtn = document.getElementById('printReportBtn');
  const dateInput = document.getElementById('reportDateInput');
  const modal = document.getElementById('reportsModal');

  if (navReports) {
    navReports.addEventListener('click', e => {
      e.preventDefault();
      openReportsModal();
    });
  }

  if (quickViewReports) {
    quickViewReports.addEventListener('click', () => openReportsModal());
  }

  if (closeReportsBtn) {
    closeReportsBtn.addEventListener('click', closeReportsModal);
  }

  if (loadReportBtn) {
    loadReportBtn.addEventListener('click', () => {
      const date = dateInput && dateInput.value
        ? dateInput.value
        : new Date().toISOString().slice(0, 10);

      loadAdminReport(date);
    });
  }

  if (printReportBtn) {
    printReportBtn.addEventListener('click', printAdminReport);
  }

  if (modal) {
    modal.addEventListener('click', e => {
      if (e.target === modal) {
        closeReportsModal();
      }
    });
  }
}
// ── Users Management ─────────────────────────────────────────────

function openUsersModal() {
  const modal = document.getElementById('usersModal');
  if (!modal) return;

  modal.classList.add('active');
  loadAdminUsers();
}

function closeUsersModal() {
  const modal = document.getElementById('usersModal');
  if (modal) modal.classList.remove('active');
}

function loadAdminUsers() {
  const list = document.getElementById('usersList');

  if (list) {
    list.innerHTML = '<div class="card section-card muted">Loading users...</div>';
  }

  fetch('/mazad/api/get-users-admin.php', { cache: 'no-store' })
    .then(r => r.json())
    .then(res => {
      if (res.status !== 'success') {
        if (list) {
          list.innerHTML = `<div class="card section-card muted">Failed to load users: ${escapeAdminHtml(res.message || '')}</div>`;
        }
        return;
      }

      renderAdminUsers(res.data || []);
    })
    .catch(err => {
      console.error('loadAdminUsers error', err);
      if (list) {
        list.innerHTML = '<div class="card section-card muted">Network error while loading users.</div>';
      }
    });
}

function renderAdminUsers(users) {
  const list = document.getElementById('usersList');
  if (!list) return;

  if (!users.length) {
    list.innerHTML = '<div class="card section-card muted">No users found.</div>';
    return;
  }

  const onlineCount = users.filter(u => u.online_status === 'online').length;
  const offlineCount = users.length - onlineCount;

  const currentUser = JSON.parse(localStorage.getItem('mazadUser') || 'null');
  const currentUserId = currentUser ? Number(currentUser.id) : 0;

  list.innerHTML = `
    <div class="stats-grid" style="margin-bottom:1rem;">
      <div class="stat-card">
        <div class="stat-label">Total Users</div>
        <div class="stat-value">${users.length}</div>
        <div class="stat-note">All registered users on the platform</div>
      </div>

      <div class="stat-card">
        <div class="stat-label">Online</div>
        <div class="stat-value">${onlineCount}</div>
        <div class="stat-note">Active in the last 5 minutes</div>
      </div>

      <div class="stat-card">
        <div class="stat-label">Offline</div>
        <div class="stat-value">${offlineCount}</div>
        <div class="stat-note">Currently inactive</div>
      </div>
    </div>

    <div class="table-wrap users-table-wrap">
  <table class="users-table">
       <thead>
  <tr>
    <th>User</th>
    <th>Role</th>
    <th>Status</th>
    <th>Last Seen</th>
    <th>Auctions</th>
    <th>Bids</th>
    <th>Tokens</th>
    <th>Joined</th>
  </tr>
</thead>

        <tbody>
          ${users.map(u => {
            const isSelf = Number(u.id) === currentUserId;
            return `
            <tr>
              <td>
                <div class="auction-info">
                  <div class="thumb" style="
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    font-weight:900;
                    background:${u.online_status === 'online' ? 'rgba(60,200,120,.18)' : 'rgba(255,255,255,.08)'};
                    color:${u.online_status === 'online' ? '#57d98d' : 'inherit'};
                  ">
                    ${escapeAdminHtml((u.name || 'U').charAt(0).toUpperCase())}
                  </div>

                  <div>
                    <div class="auction-name">${escapeAdminHtml(u.name || 'Unknown')}</div>
                    <div class="auction-id">${escapeAdminHtml(u.email || '')}</div>
                  </div>
                </div>
              </td>

        <td>
  <div class="admin-role-cell">
    <span class="admin-role-current ${u.role === 'admin' ? 'status-live' : u.role === 'employee' ? 'status-pending' : 'status-active'}">
      ${escapeAdminHtml(u.role || 'user')}
    </span>

    <select class="admin-role-select" data-user-id="${u.id}" ${isSelf ? 'disabled title="You cannot change your own role"' : ''}>
      <option value="user" ${u.role === 'user' ? 'selected' : ''}>User</option>
      <option value="employee" ${u.role === 'employee' ? 'selected' : ''}>Employee</option>
      <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
    </select>
  </div>
</td>

              <td>
                <span class="status ${u.online_status === 'online' ? 'status-active' : 'status-ended'}">
                  ${u.online_status === 'online' ? 'Online' : 'Offline'}
                </span>
              </td>

              <td>${u.last_seen ? escapeAdminHtml(u.last_seen) : '--'}</td>
              <td>${Number(u.auctions_count || 0)}</td>
              <td>${Number(u.bids_count || 0)}</td>
              <td>
                ${Number(u.tokens || 0)}
                <span class="muted">· ${escapeAdminHtml(u.rank_title || 'Bronze')}</span>
              </td>
              <td>${escapeAdminHtml(u.created_at || '')}</td>
            </tr>
          `;}).join('')}
        </tbody>
      </table>
    </div>
  `;

  list.querySelectorAll('.admin-role-select').forEach(sel => {
    sel.dataset.prev = sel.value;
    sel.addEventListener('change', handleAdminRoleChange);
  });
}
function handleAdminRoleChange(e) {
  const sel = e.currentTarget;
  const userId = sel.dataset.userId;
  const newRole = sel.value;
  const prev = sel.dataset.prev || 'user';

  if (newRole === prev) return;

  const currentUser = JSON.parse(localStorage.getItem('mazadUser') || 'null');
  const currentUserId = currentUser ? String(currentUser.id) : '';

  if (String(userId) === currentUserId) {
    alert('You cannot change your own role.');
    sel.value = prev;
    return;
  }

  sel.disabled = true;

  fetch('/mazad/api/update-user-role.php', {
    method: 'POST',
    body: new URLSearchParams({ user_id: userId, role: newRole })
  })
    .then(r => r.json())
    .then(res => {
      if (res.status === 'success') {
        sel.dataset.prev = newRole;

        const row = sel.closest('tr');
        const badge = row ? row.querySelector('.admin-role-current') : null;

        if (badge) {
          badge.textContent = newRole;
          badge.className =
            'admin-role-current ' +
            (newRole === 'admin'
              ? 'status-live'
              : newRole === 'employee'
                ? 'status-pending'
                : 'status-active');
        }
      } else {
        alert('Failed to update role: ' + (res.message || 'unknown error'));
        sel.value = prev;
      }
    })
    .catch(() => {
      alert('Network error while updating role');
      sel.value = prev;
    })
    .finally(() => {
      sel.disabled = false;
    });
}

function bindUsersControls() {
  const navUsers = document.getElementById('navUsers');
  const quickManageUsers = document.getElementById('quickManageUsers');
  const refreshUsersBtn = document.getElementById('refreshUsersBtn');
  const closeUsersBtn = document.getElementById('closeUsersBtn');
  const modal = document.getElementById('usersModal');

  if (navUsers) {
    navUsers.addEventListener('click', e => {
      e.preventDefault();
      openUsersModal();
    });
  }

  if (quickManageUsers) {
    quickManageUsers.addEventListener('click', openUsersModal);
  }

  if (refreshUsersBtn) {
    refreshUsersBtn.addEventListener('click', loadAdminUsers);
  }

  if (closeUsersBtn) {
    closeUsersBtn.addEventListener('click', closeUsersModal);
  }

  if (modal) {
    modal.addEventListener('click', e => {
      if (e.target === modal) {
        closeUsersModal();
      }
    });
  }
}
// ── Admin Navigation + Quick Controls ───────────────────────────

function scrollToAdminElement(selector) {
  const el = document.querySelector(selector);
  if (!el) return;

  el.scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  });
}

function openSettingsModal() {
  window.open('http://localhost/phpmyadmin/', '_blank');
}

function closeSettingsModal() {
  // Settings opens phpMyAdmin directly, no modal to close.
}

function bindAdminNavigationAndQuickControls() {
  const navDashboard = document.getElementById('navDashboard');
  const navAuctions = document.getElementById('navAuctions');
  const navMonitoring = document.getElementById('navMonitoring');
  const navSettings = document.getElementById('navSettings');
const quickGoHome = document.getElementById('quickGoHome');
const quickAddAuction = document.getElementById('quickAddAuction');
const quickSystemSettings = document.getElementById('quickSystemSettings');

  if (navDashboard) {
    navDashboard.addEventListener('click', e => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  if (navAuctions) {
    navAuctions.addEventListener('click', e => {
      e.preventDefault();
      scrollToAdminElement('.content-grid');
    });
  }

  if (navMonitoring) {
    navMonitoring.addEventListener('click', e => {
      e.preventDefault();
      scrollToAdminElement('.tabs');
      const liveTab = document.querySelector('.tab-btn[data-tab="livePanel"]');
      if (liveTab) liveTab.click();
    });
  }

  if (navSettings) {
    navSettings.addEventListener('click', e => {
      e.preventDefault();
      openSettingsModal();
    });
  }

  if (quickGoHome) {
  quickGoHome.addEventListener('click', () => {
    window.location.href = 'index.html';
  });
}
  if (quickAddAuction) {
    quickAddAuction.addEventListener('click', () => {
      window.location.href = 'seller-auctions.html';
    });
  }

  if (quickSystemSettings) {
    quickSystemSettings.addEventListener('click', openSettingsModal);
  }

 
}
if (showcaseCategoryFilter) {
  showcaseCategoryFilter.addEventListener('change', renderShowcaseAdminPanel);
}

if (refreshShowcaseBtn) {
  refreshShowcaseBtn.addEventListener('click', fetchAll);
}
setInterval(renderNotifications, 20000);
fetchAll();
fetchPendingPanel();
fetchPendingBids();
bindReportsControls();
bindUsersControls();
bindAdminNavigationAndQuickControls();
const refreshPendingBidsBtn = document.getElementById('refreshPendingBidsBtn');

if (refreshPendingBidsBtn) {
  refreshPendingBidsBtn.addEventListener('click', fetchPendingBids);
}
  if (typeof initGoogleTranslate === 'function') {
    initGoogleTranslate();
  }
})();
