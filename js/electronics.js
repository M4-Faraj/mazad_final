const selectedAuctionKey = 'selectedAuction';
const selectedAuctionSourceKey = 'selectedAuctionSource';
const PAGE_CATEGORY = 'electronics';
const gradients = {
  grad1: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)',
  grad2: 'linear-gradient(135deg,#fa709a 0%,#fee140 100%)',
  grad3: 'linear-gradient(135deg,#30cfd0 0%,#330867 100%)',
  grad4: 'linear-gradient(135deg,#4facfe 0%,#00f2fe 100%)',
  grad5: 'linear-gradient(135deg,#a8edea 0%,#fed6e3 100%)',
  grad6: 'linear-gradient(135deg,#f093fb 0%,#f5576c 100%)'
};

function loadItems() {
  try {
    const saved = localStorage.getItem('auctions');
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed.filter(item => !isAuctionExpired(item)) : [];
  } catch (e) { return []; }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

function formatPrice(value) {
  return '$' + Number(value || 0).toLocaleString();
}

function isAuctionExpired(item) {
  const end = item && item.end_time ? new Date(String(item.end_time).replace(' ', 'T')).getTime() : 0;
  return end > 0 && Date.now() >= end;
}

function getEmojiForType(t) {
  return { laptop: '💻', phone: '📱', camera: '📷', gaming: '🎮' }[t] || '⚡';
}

function isElectronicAuction(item) {
  if (!item) return false;
  const t = (item.type || '').toLowerCase();
  const s = (item.subType || '').toLowerCase();
  return t === 'electronics' || s === 'electronics';
}

function openDetails(item) {
  if (!item) return;

  localStorage.setItem(selectedAuctionSourceKey, 'electronicsAuctions');

  const id = item && item.id ? encodeURIComponent(item.id) : '';
  window.location.href = id ? `auction-details.html?id=${id}` : 'auction-details.html';
}

let activeMode = 'all';

const q            = document.getElementById('q');
const type         = document.getElementById('type');
const sort         = document.getElementById('sort');
const grid         = document.getElementById('grid');
const pageSearchTop = document.getElementById('pageSearchTop');
const pageSearchBtn = document.getElementById('pageSearchBtn');
const categoryShowcaseSection = document.getElementById('categoryShowcaseSection');
const categoryShowcaseGrid = document.getElementById('categoryShowcaseGrid');

function buildCategoryCard(x, badgeMode = 'normal') {
  const imageUrl = (x.images && x.images.length) ? x.images[0] : (x.imageUrl || '');
  const gradient = gradients[x.img] || gradients.grad1;
  const isImportant = Number(x.featured) === 1 || x.featured === true || x.featured === '1';
  const isLive = String(x.mode || '').toLowerCase() === 'live';
  const typeLabel = isLive ? 'LIVE' : 'NORMAL';

  return `
    <div class="card card-pro" data-id="${x.id}">
      <div class="img" style="${imageUrl ? '' : `background:${gradient}`}">
        ${FavoritesService.buildFavoriteButton(x)}

        <div class="card-badges">
          ${badgeMode === 'showcase' ? `<span class="card-badge important">SHOWCASE</span>` : ''}
          ${isImportant ? `<span class="card-badge important">IMPORTANT</span>` : ''}
          <span class="card-badge ${isLive ? 'live' : 'normal'}">${typeLabel}</span>
        </div>

        ${imageUrl ? `<img src="${imageUrl}" alt="${escapeHtml(x.title)}">` : getEmojiForType(x.type)}
      </div>

      <div class="card-overlay">
        <div class="overlay-top">
          <span class="overlay-type">${PAGE_CATEGORY}</span>
        </div>

        <div class="overlay-bottom">
          <div>
            <div class="title">${escapeHtml(x.title)}</div>
            <div class="meta">by ${escapeHtml(x.seller)} ${FavoritesService.buildRankBadge(x.sellerRank, x.sellerTokens)}</div>
          </div>

          <div class="overlay-action">
            <div class="price">${formatPrice(x.price)}</div>
            <button class="btn btn-primary details-btn" data-id="${x.id}">
              ${x.mode === 'live' ? 'Open Live' : 'Bid Now'}
            </button>
          </div>
        </div>
      </div>
    </div>`;
}

function bindCategoryCards(container, items) {
  if (!container) return;

  container.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', () => {
      const item = items.find(x => Number(x.id) === Number(card.dataset.id));
      if (!item) return;

      if (item.mode === 'live') {
        localStorage.setItem('currentLiveAuction', JSON.stringify(item));
        window.location.href = item.id ? `live-auction.html?id=${encodeURIComponent(item.id)}` : 'live-auction.html';
      } else {
        openDetails(item);
      }
    });
  });

  container.querySelectorAll('.details-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();

      const item = items.find(x => Number(x.id) === Number(btn.dataset.id));
      if (!item) return;

      if (item.mode === 'live') {
        localStorage.setItem('currentLiveAuction', JSON.stringify(item));
        window.location.href = item.id ? `live-auction.html?id=${encodeURIComponent(item.id)}` : 'live-auction.html';
      } else {
        openDetails(item);
      }
    });
  });

 FavoritesService.bindFavoriteButtons(id => {
  const allItems = loadItems();
  return allItems.find(x => String(x.id) === String(id));
});
}

function renderCategoryShowcase() {
  if (!categoryShowcaseSection || !categoryShowcaseGrid) return;

  const items = loadItems()
    .filter(isElectronicAuction)
    .filter(x =>
      Number(x.category_showcase) === 1 ||
      x.category_showcase === true ||
      x.category_showcase === '1'
    )
    .sort((a, b) => Number(a.showcase_order || 0) - Number(b.showcase_order || 0))
    .slice(0, 4);

  if (!items.length) {
    categoryShowcaseSection.classList.add('is-empty');
    categoryShowcaseGrid.innerHTML = '';
    return;
  }

  categoryShowcaseSection.classList.remove('is-empty');
  categoryShowcaseGrid.innerHTML = items.map(x => buildCategoryCard(x, 'showcase')).join('');
  bindCategoryCards(categoryShowcaseGrid, items);
}

function render() {
  const items = loadItems().filter(isElectronicAuction);
  const query = q.value.trim().toLowerCase();
  const s = sort.value;

  const seen = new Map();
  items.forEach(x => seen.set(x.id, x));

  let filtered = Array.from(seen.values()).filter(x =>
    (x.title || '').toLowerCase().includes(query) ||
    (x.seller || '').toLowerCase().includes(query) ||
    (x.description || '').toLowerCase().includes(query)
  );

  if (s === 'new') {
    filtered.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }

  if (s === 'low') {
    filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
  }

  if (s === 'high') {
    filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
  }

  if (activeMode !== 'all') {
    filtered = filtered.filter(x => (x.mode || 'normal') === activeMode);
  }

  if (!filtered.length) {
    grid.innerHTML = '<div class="empty">No electronics items found.</div>';
    return;
  }

  grid.innerHTML = filtered.map(x => buildCategoryCard(x, 'normal')).join('');
  bindCategoryCards(grid, filtered);
}

async function fetchAuctionsFromServer() {
  try {
    const res  = await fetch('/mazad/api/api/get-auctions.php', { cache: 'no-store' });
    const json = await res.json();
    if (json && json.status === 'success' && Array.isArray(json.data)) {
      const mapped = json.data
        .filter(a => a.status === 'approved' && !isAuctionExpired(a))
        .map(a => ({
          id: Number(a.id),
          title: a.title || 'Untitled',
          seller: a.seller || ('User#' + (a.user_id || '')),
          price: Number(a.current_price || a.start_price || 0),
          images: Array.isArray(a.images) ? a.images : [],
          imageUrl: (a.images && a.images[0]) ? a.images[0] : (a.image || ''),
          description: a.description || '',
          type: (a.category || '').toLowerCase(),
          subType: (a.category || '').toLowerCase(),
        mode: a.auction_type || 'normal',
featured: Number(a.featured) === 1,
category_showcase: Number(a.category_showcase) === 1,
showcase_order: Number(a.showcase_order || 0),
sellerRank: a.seller_rank || 'Bronze',
          sellerTokens: Number(a.seller_tokens || 0),
          end_time: a.end_time || '',
          createdAt: a.created_at ? new Date(a.created_at).getTime() : Date.now()
        }));
      localStorage.setItem('auctions', JSON.stringify(mapped));
    }
  } catch (e) {}
}

function syncTopSearch() {
  q.value = pageSearchTop.value;
  render();
  grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

pageSearchBtn.addEventListener('click', syncTopSearch);
pageSearchTop.addEventListener('keydown', e => { if (e.key === 'Enter') syncTopSearch(); });
q.addEventListener('input', render);
type.addEventListener('change', render);
sort.addEventListener('change', render);

document.querySelectorAll('.auction-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.auction-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeMode = btn.dataset.mode;
    render();
  });
});

fetchAuctionsFromServer().then(() => {
  renderCategoryShowcase();
  render();
});
