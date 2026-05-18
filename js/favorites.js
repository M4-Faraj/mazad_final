// js/favorites.js
(function () {
  const FAVORITES_KEY = 'mazad_favorites';

  function safeRead() {
    try {
      const raw = localStorage.getItem(FAVORITES_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.error('Failed to read favorites:', err);
      return [];
    }
  }

  function safeWrite(items) {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(items));
      return true;
    } catch (err) {
      console.error('Failed to save favorites:', err);
      return false;
    }
  }

  function normalizeItem(item) {
    if (!item || item.id == null) return null;

    return {
      id: Number(item.id),
      title: item.title || 'Untitled',
      seller: item.seller || 'Unknown Seller',
      price: Number(item.price || 0),
      type: item.type || '',
      subType: item.subType || '',
      mode: item.mode || 'normal',
      imageUrl: item.imageUrl || '',
      gallery: Array.isArray(item.gallery) ? item.gallery : [],
      description: item.description || '',
      year: item.year || '',
      createdAt: item.createdAt || Date.now()
    };
  }

  function getAll() {
    return safeRead();
  }

  function exists(itemId) {
    const id = Number(itemId);
    return safeRead().some(item => Number(item.id) === id);
  }

  function add(item) {
    const normalized = normalizeItem(item);
    if (!normalized) return false;

    const items = safeRead();
    const alreadyExists = items.some(f => Number(f.id) === Number(normalized.id));
    if (alreadyExists) return true;

    items.unshift(normalized);
    const ok = safeWrite(items);
    if (ok) syncAddToServer(normalized.id);
    return ok;
  }

  function remove(itemId) {
    const id = Number(itemId);
    const items = safeRead().filter(item => Number(item.id) !== id);
    const ok = safeWrite(items);
    if (ok) syncRemoveFromServer(id);
    return ok;
  }

  // Attempt to sync add/remove with server if user is logged in
  function syncAddToServer(itemId){
    try{
      const userRaw = localStorage.getItem('mazadUser');
      if(!userRaw) return;
      fetch('/mazad/api/add-favorite.php', {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: new URLSearchParams({ auction_id: itemId })
      }).catch(()=>{});
    }catch(e){ }
  }

  function syncRemoveFromServer(itemId){
    try{
      const userRaw = localStorage.getItem('mazadUser');
      if(!userRaw) return;
      fetch('/mazad/api/remove-favorite.php', {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: new URLSearchParams({ auction_id: itemId })
      }).catch(()=>{});
    }catch(e){ }
  }

  function toggle(item) {
    const normalized = normalizeItem(item);
    if (!normalized) {
      return { ok: false, isFavorite: false };
    }

    if (exists(normalized.id)) {
      const ok = remove(normalized.id);
      return { ok, isFavorite: false };
    }

    const ok = add(normalized);
    return { ok, isFavorite: true };
  }

  function clear() {
    return safeWrite([]);
  }

  function count() {
    return safeRead().length;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }

  function formatPrice(value) {
    return '$' + Number(value || 0).toLocaleString();
  }

  function getFallbackEmoji(typeValue) {
    const map = {
      fashion: '👜',
      electronics: '💻',
      art: '🖼️',
      watch: '⌚',
      cars: '🚗',
      home: '🏡'
    };
    return map[String(typeValue || '').toLowerCase()] || '⭐';
  }

  function buildFavoriteButton(item) {
    const active = exists(item.id);
    return `
      <button
        class="favorite-btn ${active ? 'active' : ''}"
        type="button"
        data-favorite-id="${item.id}"
        aria-label="Toggle favorite"
        title="Favorite"
      >
        ${active ? '♥' : '♡'}
      </button>
    `;
  }

  function bindFavoriteButtons(findItemById, options = {}) {
    const selector = options.selector || '.favorite-btn';

    document.querySelectorAll(selector).forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();

        const id = Number(btn.dataset.favoriteId);
        const item = typeof findItemById === 'function' ? findItemById(id) : null;
        if (!item) return;

        const result = toggle(item);
        if (!result.ok) return;

        btn.classList.toggle('active', result.isFavorite);

// 🔥 أنيميشن
btn.classList.add('animate');

setTimeout(() => {
  btn.classList.remove('animate');
}, 350);
        btn.textContent = result.isFavorite ? '♥' : '♡';

        if (typeof options.onToggle === 'function') {
          options.onToggle({
            id,
            item,
            isFavorite: result.isFavorite
          });
        }
      });
    });
  }

  function renderFavorites(containerId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const items = getAll();

    if (!items.length) {
      container.innerHTML = `
        <div class="empty-favorites">
          No favorite items yet.
        </div>
      `;
      return;
    }

    const limit = Number(options.limit || 0);
    const data = limit > 0 ? items.slice(0, limit) : items;

    container.innerHTML = data.map(item => {
      const imageSrc = (item.images && item.images.length) ? item.images[0] : (item.imageUrl || item.image || '');
      const image = imageSrc
        ? `<img src="${escapeHtml(imageSrc)}" alt="${escapeHtml(item.title)}">`
        : `<div class="favorite-fallback">${getFallbackEmoji(item.type)}</div>`;

      return `
        <div class="favorite-card" data-id="${item.id}">
          <div class="favorite-media">
            ${image}
          </div>

          <div class="favorite-content">
            <div class="favorite-title">${escapeHtml(item.title)}</div>
            <div class="favorite-meta">by ${escapeHtml(item.seller)}</div>
            <div class="favorite-price">${formatPrice(item.price)}</div>
          </div>

          <div class="favorite-actions">
            <button class="remove-favorite-btn" type="button" data-remove-id="${item.id}">
              Remove
            </button>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.remove-favorite-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = Number(btn.dataset.removeId);
        remove(id);
        renderFavorites(containerId, options);
      });
    });

    if (typeof options.onCardClick === 'function') {
      container.querySelectorAll('.favorite-card').forEach(card => {
        card.addEventListener('click', (e) => {
          if (e.target.closest('.remove-favorite-btn')) return;
          const id = Number(card.dataset.id);
          const item = getAll().find(x => Number(x.id) === id);
          if (item) options.onCardClick(item);
        });
      });
    }
  }

  // Fetch favorites from server if logged in and sync with localStorage
  function fetchServerFavorites(){
    try {
      const user = localStorage.getItem('mazadUser');
      if(!user) return;

      fetch('/mazad/api/get-favorites.php')
        .then(r => r.json())
        .then(data => {
          if(data.status === 'success' && Array.isArray(data.data)){
            const serverFavs = data.data.map(a => ({
              id: a.id,
              title: a.title || 'Untitled',
              seller: a.seller || 'Unknown',
              price: a.current_price || a.start_price || 0,
              type: a.category || '',
              mode: a.auction_type || 'normal',
              imageUrl: a.image || '',
              images: a.images || [],
              category: a.category || '',
              description: a.description || '',
              createdAt: new Date(a.created_at || Date.now()).getTime()
            }));
            safeWrite(serverFavs);
          }
        })
        .catch(err => console.warn('Could not sync server favorites:', err));
    } catch(e) {
      console.warn('Server favorites sync skipped');
    }
  }

  function buildRankBadge(rank, tokens) {
    const r = String(rank || 'Bronze');
    const map = {
      Diamond:  { color: '#7df9ff', icon: '◆' },
      Platinum: { color: '#e5e4e2', icon: '★' },
      Gold:     { color: '#f4c430', icon: '★' },
      Silver:   { color: '#c0c0c0', icon: '★' },
      Bronze:   { color: '#cd7f32', icon: '★' }
    };
    const m = map[r] || map.Bronze;
    const tk = Number(tokens || 0);
    const title = `Credibility: ${r}${tk ? ' • ' + tk + ' tokens' : ''}`;
    return `<span class="rank-badge" title="${title}" style="display:inline-flex;align-items:center;gap:4px;font-size:.72rem;font-weight:700;padding:2px 6px;border-radius:6px;background:rgba(0,0,0,.55);color:${m.color};border:1px solid ${m.color}55;white-space:nowrap;">${m.icon} ${r}</span>`;
  }

  window.FavoritesService = {
    key: FAVORITES_KEY,
    getAll,
    exists,
    add,
    remove,
    toggle,
    clear,
    count,
    buildFavoriteButton,
    bindFavoriteButtons,
    renderFavorites,
    buildRankBadge
  };

  // Fetch server favorites on page load if logged in
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', fetchServerFavorites);
  } else {
    fetchServerFavorites();
  }
})();