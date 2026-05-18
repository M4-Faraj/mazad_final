
    const gradients = {
      g1:'linear-gradient(135deg,#667eea 0%,#764ba2 100%)',
      g2:'linear-gradient(135deg,#fa709a 0%,#fee140 100%)',
      g3:'linear-gradient(135deg,#30cfd0 0%,#330867 100%)',
      g4:'linear-gradient(135deg,#4facfe 0%,#00f2fe 100%)',
      g5:'linear-gradient(135deg,#a8edea 0%,#fed6e3 100%)',
      g6:'linear-gradient(135deg,#f093fb 0%,#f5576c 100%)',
      g7:'linear-gradient(135deg,#43e97b 0%,#38f9d7 100%)',
      g8:'linear-gradient(135deg,#ff9a9e 0%,#fad0c4 100%)',
      fallback:'linear-gradient(135deg, #142448 0%, #0b1630 60%, #31264f 100%)'
    };

    const categoryMap = {
      watch: 'Watches',
      ring: 'Rings',
      earrings: 'Earrings',
      necklace: 'Necklaces',
      laptop: 'Laptops',
      phone: 'Phones',
      camera: 'Cameras',
      gaming: 'Gaming',
      fashion: 'Fashion',
      art: 'Art',
      electronics: 'Electronics'
    };

    const sourcePageMap = {
      watchesAuctions: { title:'Watches & Jewelry', href:'watches.html' },
      electronicsAuctions: { title:'Electronics', href:'electronics.html' },
      fashionAuctions: { title:'Fashion', href:'fashion.html' },
      artAuctions: { title:'Art', href:'art.html' },
      carsAuctions: { title:'Vehicles', href:'cars.html' },
      homeAuctions: { title:'Home', href:'home.html' }
    };

    const fakeBidderPool = [
      'Ahmed', 'Sara', 'Noor', 'Omar', 'Lina', 'Khaled', 'Maya', 'Yousef', 'Leen', 'Zaid',
      'Rama', 'Ameer', 'Rana', 'Sami', 'Dana', 'Huda', 'Tariq', 'Mira', 'Jad', 'Yara'
    ];

    const heroTitle = document.getElementById('heroTitle');
    const heroSubtitle = document.getElementById('heroSubtitle');
    const sourcePageLink = document.getElementById('sourcePageLink');
    const crumbTitle = document.getElementById('crumbTitle');

    const statusPill = document.getElementById('statusPill');
    const countdownPill = document.getElementById('countdownPill');

    const galleryMain = document.getElementById('galleryMain');
    const galleryThumbs = document.getElementById('galleryThumbs');

    const watchlistBtn = document.getElementById('watchlistBtn');
    const categoryBadge = document.getElementById('categoryBadge');
    const modeBadge = document.getElementById('modeBadge');

    const auctionTitle = document.getElementById('auctionTitle');
    const metaLine = document.getElementById('metaLine');
    const sellerValue = document.getElementById('sellerValue');
    const categoryValue = document.getElementById('categoryValue');
    const statusValue = document.getElementById('statusValue');
    const auctionIdValue = document.getElementById('auctionIdValue');
    const descText = document.getElementById('descText');
    const tagsWrap = document.getElementById('tagsWrap');

    const startingPriceValue = document.getElementById('startingPriceValue');
    const currentBidValue = document.getElementById('currentBidValue');
    const minimumBidValue = document.getElementById('minimumBidValue');
    const minimumBidHelper = document.getElementById('minimumBidHelper');
    const bidStatusText = document.getElementById('bidStatusText');

    const bidAmount = document.getElementById('bidAmount');
    const placeBidBtn = document.getElementById('placeBidBtn');
    const autoFillMinBtn = document.getElementById('autoFillMinBtn');
    const quickBidsWrap = document.getElementById('quickBidsWrap');

    const bidCountValue = document.getElementById('bidCountValue');
    const watchCountValue = document.getElementById('watchCountValue');
    const timeLeftMini = document.getElementById('timeLeftMini');
    const historyList = document.getElementById('historyList');
    const historyMeta = document.getElementById('historyMeta');
    const infoNote = document.getElementById('infoNote');

    const copyLinkBtn = document.getElementById('copyLinkBtn');
    const shareBidBtn = document.getElementById('shareBidBtn');

    const stickyBidValue = document.getElementById('stickyBidValue');
    const stickyBidBtn = document.getElementById('stickyBidBtn');

    const toastWrap = document.getElementById('toastWrap');

    const selectedAuctionKey = 'selectedAuction';
    const selectedAuctionSourceKey = 'selectedAuctionSource';
    const bidsStorageKey = 'auctionBidsDetailed';
    const watchlistStorageKey = 'auctionWatchlist';
    const listingStorageMap = {
  auctions: 'auctions',
  watchesAuctions: 'watchesAuctions',
  electronicsAuctions: 'electronicsAuctions',
  fashionAuctions: 'fashionAuctions',
  artAuctions: 'artAuctions',
  carsAuctions: 'carsAuctions',
  homeAuctions: 'homeAuctions'
};
    let selectedAuction = null;
    let selectedSource = localStorage.getItem(selectedAuctionSourceKey) || '';
   let allBids = {};
    let watchlist = JSON.parse(localStorage.getItem(watchlistStorageKey)) || [];
    let countdownTimer = null;
    let activeGalleryIndex = 0;

    const fallbackAuction = {
      id: Date.now(),
      title: 'No auction selected',
      seller: 'Mazad',
      type: 'auction',
      price: 0,
      description: 'Please return to one of the category pages and choose an auction item first.',
      g: 'g1',
      imageUrl: '',
      mode: 'normal',
      startingPrice: 0,
      createdAt: Date.now()
    };
    const fallbackSources = [
  'auctions',
  'watchesAuctions',
  'electronicsAuctions',
  'fashionAuctions',
  'artAuctions',
  'carsAuctions',
  'homeAuctions'
];

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text || '';
      return div.innerHTML;
    }

    function formatPrice(value) {
      return '$' + Number(value || 0).toLocaleString();
    }

    function moneyToNumber(value) {
      return Number(String(value).replace(/[^0-9.]/g, '')) || 0;
    }

    function getCategoryLabel(typeValue) {
      return categoryMap[typeValue] || (typeValue ? typeValue.charAt(0).toUpperCase() + typeValue.slice(1) : 'Auction');
    }

    function randomFrom(arr) {
      return arr[Math.floor(Math.random() * arr.length)];
    }

    function generateBidderName() {
      const name = randomFrom(fakeBidderPool);
      const suffix = Math.floor(Math.random() * 90 + 10);
      return Math.random() > 0.5 ? name : `${name}${suffix}`;
    }

    function getAuctionId() {
      return selectedAuction && selectedAuction.id ? String(selectedAuction.id) : '0';
    }

    function getAuctionBids() {
      return allBids[getAuctionId()] || [];
    }

   function saveAllBids() {
  // Bid history is loaded from the database only.
}

    function saveSelectedAuction() {
  // Auction details are loaded from the database only.
}
 function loadSelectedAuction() {
  // Only fallback to localStorage to recover the auction id.
  // Never trust localStorage for price/current bid.
  try {
    const raw = JSON.parse(localStorage.getItem(selectedAuctionKey));
    if (raw && raw.id) return { id: raw.id };
  } catch (e) {}
  return null;
}

    function normalizeAuction(raw) {
  const item = raw || fallbackAuction;
  const currentBasePrice = Number(item.price || 0);
  const startingPrice = Number(item.startingPrice || currentBasePrice || 0);

  if (!item.endsAt) {
    const baseTime = Number(item.createdAt || Date.now());
    item.endsAt = baseTime + (1000 * 60 * 60 * 18);
  }

  item.startingPrice = startingPrice;
  item.price = currentBasePrice;
  item.g = item.g || 'g1';
 item.featured = Number(item.featured) === 1 || item.featured === true || item.featured === '1';
  item.type = item.type || 'auction';
  item.description = item.description || 'No description available.';
  item.seller = item.seller || 'Unknown Seller';
  item.title = item.title || 'Auction Item';
  item.imageUrl = item.imageUrl || '';
  // prefer server-provided `images` then existing `gallery`
  if (Array.isArray(item.images) && item.images.length) {
    item.gallery = item.images.slice();
    if (!item.imageUrl) item.imageUrl = item.images[0];
  } else {
    item.gallery = Array.isArray(item.gallery) ? item.gallery : [];
  }

  return item;
}

  function syncSelectedAuctionPriceFromHistory() {
  const bids = getAuctionBids();

  if (bids.length) {
    const highest = Math.max(...bids.map(b => moneyToNumber(b.amount || 0)));

    if (highest > moneyToNumber(selectedAuction.price || 0)) {
      selectedAuction.price = highest;
    }
  }
}

    function getIncrement(currentBid) {
      const current = Number(currentBid || 0);

      if (current < 100) return 5;
      if (current < 500) return 10;
      if (current < 1000) return 25;
      if (current < 5000) return 50;
      if (current < 10000) return 100;
      return 250;
    }

    function getMinimumNextBid() {
      return moneyToNumber(selectedAuction.price || 0) + getIncrement(selectedAuction.price || 0);
    }

    function relativeTime(timestamp) {
      const diff = Date.now() - Number(timestamp || Date.now());
      const seconds = Math.max(1, Math.floor(diff / 1000));
      if (seconds < 60) return 'just now';
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `${minutes} min ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours} hr ago`;
      const days = Math.floor(hours / 24);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }

    function getSourcePageInfo() {
      return sourcePageMap[selectedSource] || { title:'Category', href:'index.html' };
    }

    function isInWatchlist() {
      return watchlist.includes(getAuctionId());
    }

    function toggleWatchlist() {
      const id = getAuctionId();
      if (isInWatchlist()) {
        watchlist = watchlist.filter(x => x !== id);
        showToast('Removed from watchlist', `${selectedAuction.title} was removed from your watchlist.`, 'info');
      } else {
        watchlist.push(id);
        showToast('Added to watchlist', `${selectedAuction.title} was added to your watchlist.`, 'success');
      }
      localStorage.setItem(watchlistStorageKey, JSON.stringify(watchlist));
      renderWatchlistState();
    }

  function renderWatchlistState() {
  const active = isInWatchlist();
  watchlistBtn.classList.toggle('active', active);
  watchlistBtn.textContent = active ? '♥' : '♡';

  // Real views count is loaded from the database in loadAuctionViews()
  if (!watchCountValue.textContent) {
    watchCountValue.textContent = '0';
  }
}
    function getDisplayMedia() {
  const media = [];

  if (Array.isArray(selectedAuction.gallery) && selectedAuction.gallery.length) {
    selectedAuction.gallery.forEach((img) => {
      if (img) {
        media.push({
          type: 'image',
          src: img
        });
      }
    });
  }

  if (!media.length && selectedAuction.imageUrl) {
    media.push({
      type: 'image',
      src: selectedAuction.imageUrl
    });
  }

  if (!media.length) {
    media.push({
      type: 'gradient',
      gradient: gradients[selectedAuction.g] || gradients.fallback,
      emoji: getEmojiForType(selectedAuction.type)
    });
  }

  return media;
}

    function getEmojiForType(typeValue) {
      const map = {
        watch: '⌚',
        ring: '💍',
        earrings: '💎',
        necklace: '✨',
        laptop: '💻',
        phone: '📱',
        camera: '📷',
        gaming: '🎮',
        fashion: '👜',
        art: '🖼️'
      };
      return map[typeValue] || '💠';
    }

    function renderGallery() {
      const media = getDisplayMedia();
      activeGalleryIndex = Math.min(activeGalleryIndex, media.length - 1);
      const current = media[activeGalleryIndex];

      galleryMain.classList.toggle('gradient-only', current.type !== 'image');

      if (current.type === 'image') {
        galleryMain.style.background = gradients.fallback;
        galleryMain.innerHTML = `
          <div class="gallery-badge-row">
            <div class="badge-stack">
              <span class="panel-badge category" id="categoryBadgeInline">${escapeHtml(getCategoryLabel(selectedAuction.type))}</span>
             <span class="panel-badge live" id="modeBadgeInline">
  ${selectedAuction.featured ? 'IMPORTANT • ' : ''}${selectedAuction.mode === 'live' ? 'LIVE' : 'NORMAL'}
</span>
            </div>
            <button class="icon-btn ${isInWatchlist() ? 'active' : ''}" id="watchlistBtnInline" title="Add to watchlist" aria-label="Add to watchlist">${isInWatchlist() ? '♥' : '♡'}</button>
          </div>
          <img src="${escapeHtml(current.src)}" alt="${escapeHtml(selectedAuction.title)}">
        `;
      } else {
        galleryMain.style.background = current.gradient || gradients.fallback;
        galleryMain.innerHTML = `
          <div class="gallery-badge-row">
            <div class="badge-stack">
              <span class="panel-badge category" id="categoryBadgeInline">${escapeHtml(getCategoryLabel(selectedAuction.type))}</span>
            <span class="panel-badge live" id="modeBadgeInline">
  ${selectedAuction.featured ? 'IMPORTANT • ' : ''}${selectedAuction.mode === 'live' ? 'LIVE' : 'NORMAL'}
</span>
            </div>
            <button class="icon-btn ${isInWatchlist() ? 'active' : ''}" id="watchlistBtnInline" title="Add to watchlist" aria-label="Add to watchlist">${isInWatchlist() ? '♥' : '♡'}</button>
          </div>
          <div aria-hidden="true">${current.emoji || getEmojiForType(selectedAuction.type)}</div>
        `;
      }

      galleryThumbs.innerHTML = media.map((item, index) => `
        <button class="thumb ${index === activeGalleryIndex ? 'active' : ''}" data-index="${index}" type="button" aria-label="Select media ${index + 1}">
          ${item.type === 'image'
            ? `<img src="${escapeHtml(item.src)}" alt="thumb ${index + 1}">`
            : `<div>${item.emoji || getEmojiForType(selectedAuction.type)}</div>`
          }
        </button>
      `).join('');

      categoryBadge.textContent = getCategoryLabel(selectedAuction.type);
      modeBadge.textContent = selectedAuction.mode === 'live' ? 'LIVE' : 'NORMAL';

      document.querySelectorAll('.thumb').forEach(btn => {
        btn.addEventListener('click', () => {
          activeGalleryIndex = Number(btn.dataset.index);
          renderGallery();
        });
      });

      const inlineWatchBtn = document.getElementById('watchlistBtnInline');
      if (inlineWatchBtn) {
        inlineWatchBtn.addEventListener('click', toggleWatchlist);
      }
    }

    function renderQuickBids() {
      const minBid = getMinimumNextBid();
      const increment = getIncrement(selectedAuction.price || 0);
      const options = [
        minBid,
        minBid + increment,
        minBid + increment * 2
      ];

      quickBidsWrap.innerHTML = options.map(value => `
        <button type="button" class="quick-bid" data-amount="${value}">
          ${formatPrice(value)}
        </button>
      `).join('');

      document.querySelectorAll('.quick-bid').forEach(btn => {
        btn.addEventListener('click', () => {
          bidAmount.value = Number(btn.dataset.amount);
          bidAmount.focus();
        });
      });
    }

    function renderCoreInfo() {
      const sourceInfo = getSourcePageInfo();

      sourcePageLink.textContent = sourceInfo.title;
      sourcePageLink.href = sourceInfo.href;
      crumbTitle.textContent = selectedAuction.title;

      heroTitle.textContent = 'AUCTION DETAILS';
      heroSubtitle.textContent = `Review this ${getCategoryLabel(selectedAuction.type).toLowerCase()} listing, track the live bid status, and place your next offer securely.`;

      auctionTitle.textContent = selectedAuction.title;
     const isImportant = Number(selectedAuction.featured) === 1 || selectedAuction.featured === true || selectedAuction.featured === '1';
const isLive = String(selectedAuction.mode || '').toLowerCase() === 'live';

metaLine.textContent = `by ${selectedAuction.seller} • ${getCategoryLabel(selectedAuction.type)} • ${isImportant ? 'Important' : 'Standard'} • ${isLive ? 'Live Auction' : 'Normal Auction'}`;
      sellerValue.textContent = selectedAuction.seller;
      categoryValue.textContent = getCategoryLabel(selectedAuction.type);
      statusValue.textContent = selectedAuction.mode === 'live' ? 'Live / Active' : 'Active';
      auctionIdValue.textContent = `#${getAuctionId()}`;
      descText.textContent = selectedAuction.description;

      categoryBadge.textContent = getCategoryLabel(selectedAuction.type);
      modeBadge.textContent = isImportant
  ? `IMPORTANT • ${isLive ? 'LIVE' : 'NORMAL'}`
  : (isLive ? 'LIVE' : 'NORMAL');
    statusPill.textContent = isImportant
  ? `IMPORTANT ${isLive ? 'LIVE AUCTION' : 'AUCTION'}`
  : (isLive ? 'LIVE AUCTION' : 'AUCTION ACTIVE');

      const tagItems = [
        getCategoryLabel(selectedAuction.type),
        selectedAuction.mode === 'live' ? 'Live Bidding' : 'Open Bidding',
        'Premium Listing',
        'Secure Offer Flow'
      ];

      tagsWrap.innerHTML = tagItems.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('');
    }

    function renderBidStats(animated = false) {
      syncSelectedAuctionPriceFromHistory();

      const current = moneyToNumber(selectedAuction.price || 0);
      const minNext = getMinimumNextBid();
      const totalBids = getAuctionBids().length;

      startingPriceValue.textContent = formatPrice(selectedAuction.startingPrice || 0);
      currentBidValue.textContent = formatPrice(current);
      minimumBidValue.textContent = formatPrice(minNext);
      stickyBidValue.textContent = formatPrice(current);

      if (animated) {
        currentBidValue.style.animation = 'none';
        void currentBidValue.offsetWidth;
        currentBidValue.style.animation = 'bidFlash .45s ease';
      }

      minimumBidHelper.textContent = `The next valid bid starts from ${formatPrice(minNext)} and above.`;
      bidCountValue.textContent = String(totalBids);
      bidStatusText.textContent = totalBids ? 'Bidding is active on this lot' : 'Be the first bidder on this lot';
      infoNote.innerHTML = totalBids
        ? `Current competition is active. Your next bid must be at least <strong>${formatPrice(minNext)}</strong>.`
        : `No bids yet. Open bidding starts from <strong>${formatPrice(selectedAuction.startingPrice || 0)}</strong>.`;
    }

    function renderHistory() {
      const itemBids = getAuctionBids();

      historyMeta.textContent = itemBids.length
        ? `${itemBids.length} total bid${itemBids.length > 1 ? 's' : ''}`
        : 'No activity yet';

      if (!itemBids.length) {
        historyList.innerHTML = `<div class="empty">No bids yet. Be the first one to place a bid on this item.</div>`;
        return;
      }

      historyList.innerHTML = itemBids
        .slice()
        .map((bid, idx) => `
          <div class="history-item ${idx === 0 ? 'latest' : ''}">
            <div class="history-avatar">${escapeHtml((bid.bidder || 'U').slice(0, 1).toUpperCase())}</div>

            <div class="history-main">
              <div class="history-name">${escapeHtml(bid.bidder || 'Anonymous')}</div>
              <div class="history-sub">${escapeHtml(relativeTime(bid.time))} • ${idx === 0 ? 'Latest highest bid' : 'Offer submitted'}</div>
            </div>

            <div class="history-price">${formatPrice(bid.amount)}</div>
          </div>
        `).join('');
    }

    function persistCurrentAuctionAcrossListings() {
      const selectedId = Number(selectedAuction.id);
      Object.values(listingStorageMap).forEach(key => {
        try {
          const items = JSON.parse(localStorage.getItem(key)) || [];
          const index = items.findIndex(item => Number(item.id) === selectedId);
          if (index !== -1) {
            items[index].price = selectedAuction.price;
            if (!items[index].startingPrice) {
              items[index].startingPrice = selectedAuction.startingPrice;
            }
            if (!items[index].endsAt) {
              items[index].endsAt = selectedAuction.endsAt;
            }
            localStorage.setItem(key, JSON.stringify(items));
          }
        } catch (e) {}
      });
    }

    function createBidEntry(amount) {
      return {
        amount: Number(amount),
        bidder: generateBidderName(),
        time: Date.now()
      };
    }

    async function placeBid(value, triggerToast = true) {
          const amount = moneyToNumber(value);

          if (!selectedAuction) return;
          if (!amount || Number.isNaN(amount)) {
            showToast('Invalid bid', 'Please enter a valid bid amount.', 'error');
            return;
          }

          await refreshAuctionBidState(false);

          if (selectedAuction && selectedAuction.endsAt && Date.now() >= Number(selectedAuction.endsAt)) {
            showToast('Auction ended', 'This auction is closed and no longer accepts bids.', 'error');
            startCountdown();
            return;
          }

          const minimum = getMinimumNextBid();
          if (amount < minimum) {
            showToast('Bid too low', `Your bid must be at least ${formatPrice(minimum)}.`, 'error');
            return;
          }

          // Check logged in user
          try {
            const userRes = await fetch('/mazad/api/get-current-user.php');
            const userJson = await userRes.json();
            if (userJson.status !== 'success') {
              showToast('Please sign in', 'You must be signed in to place a bid.', 'error');
              setTimeout(() => { window.location.href = 'login.html'; }, 900);
              return;
            }

            // Send bid to server
            const params = new URLSearchParams();
            params.append('auction_id', getAuctionId());
            params.append('amount', amount);

            const res = await fetch('/mazad/api/add-bid.php', {
              method: 'POST',
              body: params
            });

            const json = await res.json();
            if (!json || json.status !== 'success') {
              showToast('Bid failed', (json && json.message) ? json.message : 'Server error', 'error');
              return;
            }
if (json.needs_approval) {
  showToast(
    'Bid submitted for review',
    json.message || 'Your high-value bid is waiting for admin approval.',
    'info'
  );

  bidAmount.value = '';

  await refreshAuctionBidState(true);

  return;
}

bidAmount.value = '';
await refreshAuctionBidState(true);

            if (triggerToast) {
              showToast('Bid placed successfully', `Current highest offer is ${formatPrice(selectedAuction.price || amount)}.`, 'success');
            }

          } catch (err) {
            console.error('Bid error', err);
            showToast('Bid failed', 'Network or server error', 'error');
          }
        }

    function startCountdown() {
      if (countdownTimer) {
        clearInterval(countdownTimer);
      }

      function update() {
        const now = Date.now();
        const diff = Number(selectedAuction.endsAt) - now;

        if (diff <= 0) {
          countdownPill.textContent = '⏳ Auction ended';
          countdownPill.classList.add('ending-soon');
          timeLeftMini.textContent = 'Ended';
          statusPill.textContent = 'AUCTION CLOSED';
          statusValue.textContent = 'Closed';
          placeBidBtn.disabled = true;
          autoFillMinBtn.disabled = true;
          bidAmount.disabled = true;
          stickyBidBtn.disabled = true;
          bidStatusText.textContent = 'This auction has ended';
          infoNote.innerHTML = `This auction is closed. Final highest bid: <strong>${formatPrice(selectedAuction.price || 0)}</strong>.`;
          clearInterval(countdownTimer);
          return;
        }

        const totalSeconds = Math.floor(diff / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        const formatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        countdownPill.textContent = `⏳ Ends in: ${formatted}`;
        timeLeftMini.textContent = formatted;

        if (diff < 1000 * 60 * 30) {
          countdownPill.classList.add('ending-soon');
        } else {
          countdownPill.classList.remove('ending-soon');
        }
      }

      update();
      countdownTimer = setInterval(update, 1000);
    }

    function showToast(title, text, type = 'info') {
      const toast = document.createElement('div');
      toast.className = `toast ${type}`;
      toast.innerHTML = `
        <div class="toast-title">${escapeHtml(title)}</div>
        <div class="toast-text">${escapeHtml(text)}</div>
      `;
      toastWrap.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(12px)';
        toast.style.transition = 'all .22s ease';
        setTimeout(() => toast.remove(), 220);
      }, 2800);
    }

    function safeCopyLink() {
      const text = window.location.href;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text)
          .then(() => showToast('Link copied', 'Auction page link copied to your clipboard.', 'success'))
          .catch(() => showToast('Copy failed', 'Unable to copy the auction link.', 'error'));
      } else {
        showToast('Copy unavailable', 'Clipboard is not supported in this browser.', 'error');
      }
    }

    function safeShare() {
      const shareData = {
        title: selectedAuction.title,
        text: `Check out this auction on Mazad: ${selectedAuction.title}`,
        url: window.location.href
      };

      if (navigator.share) {
        navigator.share(shareData)
          .then(() => showToast('Shared', 'Auction link shared successfully.', 'success'))
          .catch(() => {});
      } else {
        safeCopyLink();
      }
    }

    function initDefaultBidHistoryIfMissing() {
      if (getAuctionBids().length) return;

      const base = Number(selectedAuction.startingPrice || selectedAuction.price || 0);
      if (!base) return;

      const shouldSeed = Math.random() > 0.45;
      if (!shouldSeed) return;

      const increment = getIncrement(base);
      const seeded = [
        {
          amount: base,
          bidder: generateBidderName(),
          time: Date.now() - 1000 * 60 * 85
        },
        {
          amount: base + increment,
          bidder: generateBidderName(),
          time: Date.now() - 1000 * 60 * 34
        }
      ];

      allBids[getAuctionId()] = seeded;
      selectedAuction.price = seeded[seeded.length - 1].amount;
      saveAllBids();
      saveSelectedAuction();
      persistCurrentAuctionAcrossListings();
    }

    function bindActions() {
      watchlistBtn.addEventListener('click', toggleWatchlist);

      placeBidBtn.addEventListener('click', () => {
        placeBid(bidAmount.value);
      });

      autoFillMinBtn.addEventListener('click', () => {
        bidAmount.value = getMinimumNextBid();
        bidAmount.focus();
      });

      stickyBidBtn.addEventListener('click', () => {
        document.querySelector('.price-panel').scrollIntoView({ behavior:'smooth', block:'start' });
        setTimeout(() => bidAmount.focus(), 350);
      });

      bidAmount.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          placeBid(bidAmount.value);
        }
      });

      copyLinkBtn.addEventListener('click', safeCopyLink);
      shareBidBtn.addEventListener('click', safeShare);
    }

    let commentsState = {
      currentUserId: 0,
      canModerate: false
    };

    function formatCommentTime(value) {
      if (!value) return '';
      const t = new Date(String(value).replace(' ', 'T'));
      if (isNaN(t.getTime())) return '';
      return relativeTime(t.getTime());
    }

    async function loadComments() {
      const list = document.getElementById('commentsList');
      const meta = document.getElementById('commentsMeta');
      const composer = document.getElementById('commentComposer');
      const loginNote = document.getElementById('commentLoginNote');

      if (!list || !meta) return;

      try {
        const res = await fetch(
          `/mazad/api/get-comments.php?auction_id=${encodeURIComponent(getAuctionId())}`,
          { cache: 'no-store' }
        );
        const json = await res.json();

        if (!json || json.status !== 'success') {
          meta.textContent = 'Could not load comments.';
          return;
        }

        commentsState.currentUserId = Number(json.current_user_id || 0);
        commentsState.canModerate   = Boolean(json.can_moderate);

        if (commentsState.currentUserId > 0) {
          if (composer)  composer.style.display = '';
          if (loginNote) loginNote.style.display = 'none';
        } else {
          if (composer)  composer.style.display = 'none';
          if (loginNote) loginNote.style.display = '';
        }

        const items = Array.isArray(json.data) ? json.data : [];
        meta.textContent = items.length
          ? `${items.length} comment${items.length > 1 ? 's' : ''}`
          : 'Be the first to comment';

        if (!items.length) {
          list.innerHTML = `<div class="empty">No comments yet. Share your thoughts about this auction.</div>`;
          return;
        }

        list.innerHTML = items.map(c => {
          const authorName = escapeHtml(c.author_name || 'User');
          const role       = String(c.author_role || '').toLowerCase();
          const roleBadge  = role === 'admin'
            ? '<span class="tag" style="margin-left:.4rem">Admin</span>'
            : role === 'employee'
              ? '<span class="tag" style="margin-left:.4rem">Employee</span>'
              : '';
          const initial    = (c.author_name || 'U').slice(0, 1).toUpperCase();
          const avatar     = c.profile_image && String(c.profile_image).startsWith('data:image/')
            ? `<img src="${c.profile_image}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
            : escapeHtml(initial);
          const canDelete  = commentsState.canModerate || Number(c.user_id) === commentsState.currentUserId;
          const deleteBtn  = canDelete
            ? `<button class="btn btn-secondary comment-delete-btn" data-id="${c.id}" style="font-size:.75rem;padding:.25rem .55rem;">Delete</button>`
            : '';
          const safeContent = escapeHtml(c.content || '');

          return `
            <div class="history-item" data-comment-id="${c.id}" style="align-items:flex-start;">
              <div class="history-avatar">${avatar}</div>
              <div class="history-main" style="min-width:0;">
                <div class="history-name">${authorName}${roleBadge}</div>
                <div class="history-sub">${escapeHtml(formatCommentTime(c.created_at))}</div>
                <div style="margin-top:.35rem;white-space:pre-wrap;word-break:break-word;">${safeContent}</div>
              </div>
              <div>${deleteBtn}</div>
            </div>
          `;
        }).join('');

        list.querySelectorAll('.comment-delete-btn').forEach(btn => {
          btn.addEventListener('click', () => deleteComment(Number(btn.dataset.id)));
        });
      } catch (err) {
        console.error('loadComments error:', err);
        meta.textContent = 'Network error loading comments.';
      }
    }

    async function postComment() {
      const input = document.getElementById('commentInput');
      const btn   = document.getElementById('postCommentBtn');
      if (!input || !btn) return;

      const content = (input.value || '').trim();
      if (!content) {
        showToast('Empty comment', 'Please write something before posting.', 'error');
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Posting...';

      try {
        const params = new URLSearchParams();
        params.append('auction_id', getAuctionId());
        params.append('content', content);

        const res = await fetch('/mazad/api/add-comment.php', {
          method: 'POST',
          body: params
        });
        const json = await res.json();

        if (!json || json.status !== 'success') {
          if ((json && json.message || '').toLowerCase().includes('not logged in')) {
            showToast('Please sign in', 'You must be signed in to comment.', 'error');
            setTimeout(() => { window.location.href = 'login.html'; }, 900);
          } else {
            showToast('Could not post', (json && json.message) || 'Server error', 'error');
          }
          return;
        }

        input.value = '';
        await loadComments();
        showToast('Comment posted', 'Your comment is visible to everyone.', 'success');
      } catch (err) {
        console.error('postComment error:', err);
        showToast('Network error', 'Failed to post the comment.', 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Post Comment';
      }
    }

    async function deleteComment(commentId) {
      if (!commentId) return;
      if (!confirm('Delete this comment?')) return;

      try {
        const params = new URLSearchParams();
        params.append('comment_id', commentId);

        const res = await fetch('/mazad/api/delete-comment.php', {
          method: 'POST',
          body: params
        });
        const json = await res.json();

        if (!json || json.status !== 'success') {
          showToast('Delete failed', (json && json.message) || 'Server error', 'error');
          return;
        }

        await loadComments();
        showToast('Comment deleted', 'The comment was removed and logged.', 'success');
      } catch (err) {
        console.error('deleteComment error:', err);
        showToast('Network error', 'Failed to delete the comment.', 'error');
      }
    }

    function bindComments() {
      const btn = document.getElementById('postCommentBtn');
      if (btn) btn.addEventListener('click', postComment);

      const input = document.getElementById('commentInput');
      if (input) {
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            postComment();
          }
        });
      }
    }


  async function loadBidsFromServer() {
  if (!selectedAuction || !selectedAuction.id) return;

  try {
    const res = await fetch(`/mazad/api/get-bids.php?auction_id=${encodeURIComponent(getAuctionId())}`, {
      cache: 'no-store'
    });

    const json = await res.json();

    if (json.status === 'success' && Array.isArray(json.data)) {
      const normalizedBids = json.data
        .map(bid => ({
          amount: moneyToNumber(bid.amount || bid.bid_amount || 0),
          bidder: bid.bidder || bid.user_name || bid.name || 'Anonymous',
          time: bid.created_at ? new Date(String(bid.created_at).replace(' ', 'T')).getTime() : Date.now(),
          id: Number(bid.id || 0)
        }))
        .filter(bid => bid.amount > 0)
        .sort((a, b) => (b.amount - a.amount) || (b.id - a.id) || (b.time - a.time));

      allBids[getAuctionId()] = normalizedBids;

      if (normalizedBids.length) {
        const highestBid = moneyToNumber(normalizedBids[0].amount || 0);

        selectedAuction.price = Math.max(
          moneyToNumber(selectedAuction.price || 0),
          highestBid
        );
        selectedAuction.highestBidder = normalizedBids[0].bidder || '';
      }
    }
  } catch (err) {
    console.error('Failed to load bids from server:', err);
  }
}
function mapServerAuction(found) {
  const serverPrice = Number(found.current_price || found.start_price || 0);

  return normalizeAuction({
    id: found.id,
    title: found.title,
    seller: found.seller || found.username || ('User#' + (found.user_id || '')),
    price: serverPrice,
    startingPrice: Number(found.start_price || serverPrice || 0),
    images: Array.isArray(found.images) ? found.images : [],
    imageUrl: found.image || '',
    description: found.description || '',
    type: found.category || 'auction',
    mode: found.auction_type || 'normal',
    status: found.status || '',
    featured: Number(found.featured) === 1 || found.featured === true || found.featured === '1',
    endsAt: found.end_time ? new Date(String(found.end_time).replace(' ', 'T')).getTime() : null,
    end_time: found.end_time || '',
    createdAt: found.created_at ? new Date(String(found.created_at).replace(' ', 'T')).getTime() : Date.now()
  });
}

async function refreshAuctionFromServer() {
  const params = new URLSearchParams(window.location.search);
  const idFromUrl = params.get('id');
  const id = idFromUrl || (selectedAuction && selectedAuction.id ? selectedAuction.id : '');

  if (!id) return false;

  try {
    const url = id
      ? `/mazad/api/api/get-auctions.php?id=${encodeURIComponent(id)}&include_ended=1`
      : '/mazad/api/api/get-auctions.php';

    const res = await fetch(url, {
      cache: 'no-store'
    });

    const json = await res.json();

    if (!json || json.status !== 'success' || !Array.isArray(json.data)) {
      return false;
    }

    const found = json.data.find(a => String(a.id) === String(id));

    if (!found) {
      return false;
    }

    selectedAuction = mapServerAuction(found);
    return true;
  } catch (err) {
    console.error('Failed to refresh auction from server:', err);
    return false;
  }

}

async function refreshAuctionBidState(animated = false) {
  await refreshAuctionFromServer();
  await loadBidsFromServer();
  syncSelectedAuctionPriceFromHistory();
  renderBidStats(animated);
  renderHistory();
  renderQuickBids();
}

async function trackAuctionView() {
  if (!selectedAuction || !selectedAuction.id) return;

  try {
    await fetch('/mazad/api/track-auction-view.php', {
      method: 'POST',
      body: new URLSearchParams({
        auction_id: getAuctionId()
      })
    });
  } catch (err) {
    console.warn('Could not track auction view:', err);
  }
}

async function loadAuctionViews() {
  if (!selectedAuction || !selectedAuction.id || !watchCountValue) return;

  try {
    const res = await fetch(`/mazad/api/get-auction-views.php?auction_id=${encodeURIComponent(getAuctionId())}`, {
      cache: 'no-store'
    });

    const json = await res.json();

    if (json.status === 'success') {
      watchCountValue.textContent = String(Number(json.views_count || 0));
    }
  } catch (err) {
    console.warn('Could not load auction views:', err);
  }
}
    function renderEverything() {
      renderCoreInfo();
      renderGallery();
      renderWatchlistState();
      renderBidStats();
      renderQuickBids();
      renderHistory();
      startCountdown();
    }

    async function init() {
  const params = new URLSearchParams(window.location.search);
  const idParam = params.get('id');
  const loadedAuction = loadSelectedAuction();

  selectedSource = localStorage.getItem(selectedAuctionSourceKey) || 'auctions';

  if (idParam) {
    selectedAuction = { id: idParam };
  } else if (loadedAuction && loadedAuction.id) {
    selectedAuction = { id: loadedAuction.id };
    window.history.replaceState(
      null,
      '',
      `auction-details.html?id=${encodeURIComponent(loadedAuction.id)}`
    );
  }

  const refreshed = await refreshAuctionFromServer();

  if (!refreshed || !selectedAuction) {
    const sourceInfo = getSourcePageInfo();
    alert('Auction not found');
    window.location.href = sourceInfo.href;
    return;
  }

renderCoreInfo();
renderGallery();
renderWatchlistState();
await refreshAuctionBidState();
startCountdown();
await trackAuctionView();
await loadAuctionViews();

bindActions();
bindComments();
loadComments();
}
    init();
  


  
