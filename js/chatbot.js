// js/chatbot.js
(function () {
  const chatMessages  = document.getElementById('chatMessages');
  const chatActions   = document.getElementById('chatActions');
  const chatInputWrap = document.getElementById('chatInputWrap');
  const chatInput     = document.getElementById('chatInput');
  const chatSendBtn   = document.getElementById('chatSendBtn');
  const resetChatBtn  = document.getElementById('resetChatBtn');

  /*
    Cached auction catalog from the live API. Loaded lazily on the first
    search/gift request so the chatbot can give real recommendations.
  */
  let auctionCache = null;
  let auctionCachePromise = null;

  let currentMode      = null; // 'gift' | 'search'
  let conversationStep = 0;
  let searchQuery      = '';
  let giftState = {
    gender:   null,
    occasion: null,
    budget:   null,
    style:    null
  };

  const giftQuestions = [
    {
      key: 'gender',
      question: 'Is this gift for a man or a woman?',
      options: [
        { label: '👨 Man',   value: 'man' },
        { label: '👩 Woman', value: 'woman' }
      ],
      allowText: false
    },
    {
      key: 'occasion',
      question: 'What is the occasion?',
      options: [
        { label: '🎂 Birthday',    value: 'birthday' },
        { label: '💍 Anniversary', value: 'anniversary' },
        { label: '🎓 Graduation',  value: 'graduation' },
        { label: '🎁 Other',       value: 'other' }
      ],
      allowText: true
    },
    {
      key: 'budget',
      question: 'What is your budget?',
      options: [
        { label: 'Up to $200',      value: 200 },
        { label: '$200 – $1,000',   value: 1000 },
        { label: '$1,000 – $5,000', value: 5000 },
        { label: '$5,000+',         value: 999999 }
      ],
      allowText: true
    },
    {
      key: 'style',
      question: 'What style do they prefer?',
      options: [
        { label: '🕰 Classic / Luxury', value: 'watches' },
        { label: '👗 Fashion',          value: 'fashion' },
        { label: '💻 Tech',             value: 'electronics' },
        { label: '🎨 Art / Decor',      value: 'art' }
      ],
      allowText: true
    }
  ];

  const styleCategoryMap = {
    watches:     { category: 'Watches & Jewelry', page: 'watches.html',     emoji: '⌚' },
    fashion:     { category: 'Fashion',           page: 'fashion.html',     emoji: '👜' },
    electronics: { category: 'Electronics',       page: 'electronics.html', emoji: '💻' },
    art:         { category: 'Art & Collectibles',page: 'art.html',         emoji: '🎨' },
    cars:        { category: 'Vehicles',          page: 'cars.html',        emoji: '🚗' },
    home:        { category: 'Home',              page: 'home.html',        emoji: '🏡' }
  };

  function escapeHtml(value) {
    const d = document.createElement('div');
    d.textContent = value == null ? '' : String(value);
    return d.innerHTML;
  }

  function addMessage(text, isBot = true) {
    const div = document.createElement('div');
    div.className = isBot ? 'message bot-message' : 'message user-message';
    div.innerHTML = `<div class="message-content">${text}</div>`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function clearActions() {
    chatActions.innerHTML = '';
  }

  function showActionButtons(buttons) {
    clearActions();
    chatActions.style.display = 'flex';
    buttons.forEach(b => {
      const btn = document.createElement('button');
      btn.className = 'action-btn';
      btn.type = 'button';
      btn.textContent = b.label;
      btn.addEventListener('click', () => {
        addMessage(escapeHtml(b.label), false);
        b.callback();
      });
      chatActions.appendChild(btn);
    });
  }

  function loadAuctions() {
    if (auctionCache) return Promise.resolve(auctionCache);
    if (auctionCachePromise) return auctionCachePromise;

    auctionCachePromise = fetch('/mazad/api/api/get-auctions.php', { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        if (data && data.status === 'success' && Array.isArray(data.data)) {
          auctionCache = data.data.filter(a => (a.status || '').toLowerCase() === 'approved');
        } else {
          auctionCache = [];
        }
        return auctionCache;
      })
      .catch(() => {
        auctionCache = [];
        return auctionCache;
      });

    return auctionCachePromise;
  }

  function openAuctionDetails(auction) {
    if (!auction || !auction.id) {
      window.location.href = 'index.html';
      return;
    }
    const payload = {
      id: Number(auction.id),
      title: auction.title || 'Auction',
      seller: auction.seller || 'Mazad',
      price: Number(auction.current_price || auction.start_price || 0),
      startingPrice: Number(auction.start_price || 0),
      description: auction.description || '',
      imageUrl: (auction.images && auction.images[0]) || auction.image || '',
      images: Array.isArray(auction.images) ? auction.images : [],
      gallery: Array.isArray(auction.images) ? auction.images : [],
      type: (auction.category || '').toLowerCase(),
      mode: auction.auction_type || 'normal',
      createdAt: auction.created_at ? new Date(auction.created_at).getTime() : Date.now()
    };
    localStorage.setItem('selectedAuction', JSON.stringify(payload));
    localStorage.setItem('selectedAuctionSource', 'auctions');
    if (payload.mode === 'live') {
      localStorage.setItem('currentLiveAuction', JSON.stringify(payload));
      window.location.href = `live-auction.html?id=${encodeURIComponent(payload.id)}`;
    } else {
      window.location.href = `auction-details.html?id=${encodeURIComponent(payload.id)}`;
    }
  }

  /* ────────── Gift suggestion flow ────────── */

  function startGiftSuggestion() {
    currentMode = 'gift';
    conversationStep = 0;
    giftState = { gender: null, occasion: null, budget: null, style: null };
    chatInputWrap.style.display = 'none';
    addMessage('Great! Let me ask a few quick questions to find the right gift.');
    setTimeout(askGiftQuestion, 350);
  }

  function askGiftQuestion() {
    if (conversationStep >= giftQuestions.length) {
      giveGiftRecommendation();
      return;
    }

    const q = giftQuestions[conversationStep];
    addMessage(escapeHtml(q.question));

    const buttons = q.options.map(opt => ({
      label: opt.label,
      callback: () => {
        giftState[q.key] = opt.value;
        conversationStep++;
        setTimeout(askGiftQuestion, 250);
      }
    }));
    showActionButtons(buttons);

    if (q.allowText) {
      chatInputWrap.style.display = 'flex';
      chatInput.placeholder = 'Or type your own answer...';
      chatInput.value = '';
      chatInput.focus();
    } else {
      chatInputWrap.style.display = 'none';
    }
  }

  function pickGiftMatches(auctions) {
    const styleKey = giftState.style && styleCategoryMap[giftState.style] ? giftState.style : 'watches';
    const targetCat = styleCategoryMap[styleKey].category.toLowerCase();
    const budget = Number(giftState.budget) > 0 ? Number(giftState.budget) : Infinity;

    const matched = auctions.filter(a => {
      const cat = (a.category || '').toLowerCase();
      return cat === targetCat || cat.includes(styleKey);
    });

    const withinBudget = matched.filter(a => {
      const price = Number(a.current_price || a.start_price || 0);
      return price <= budget;
    });

    const ordered = (withinBudget.length ? withinBudget : matched).slice();
    ordered.sort((a, b) =>
      Number(b.current_price || b.start_price || 0) -
      Number(a.current_price || a.start_price || 0)
    );

    return ordered.slice(0, 3);
  }

  function giveGiftRecommendation() {
    chatInputWrap.style.display = 'none';
    clearActions();

    const styleKey = giftState.style && styleCategoryMap[giftState.style] ? giftState.style : 'watches';
    const meta     = styleCategoryMap[styleKey];

    const summary = `
      <div style="background:rgba(0,0,0,.04);padding:.8rem;border-radius:8px;line-height:1.6;">
        <div style="font-size:2rem;margin-bottom:.3rem;">${meta.emoji}</div>
        <div style="font-weight:700;font-size:1.05rem;margin-bottom:.4rem;">Recommended: ${escapeHtml(meta.category)}</div>
        <div style="font-size:.9rem;color:#444;">
          For: <strong>${escapeHtml(giftState.gender || 'anyone')}</strong> &middot;
          Occasion: <strong>${escapeHtml(giftState.occasion || 'general')}</strong> &middot;
          Budget: <strong>${giftState.budget && giftState.budget !== 999999 ? '$' + Number(giftState.budget).toLocaleString() : 'flexible'}</strong>
        </div>
      </div>
    `;
    addMessage(summary);
    addMessage('Pulling matching items from our live catalog... 🔎');

    loadAuctions().then(list => {
      const matches = pickGiftMatches(list);

      if (!matches.length) {
        addMessage(`I could not find a perfect match right now, but you can browse the full ${escapeHtml(meta.category)} collection.`);
        showActionButtons([
          { label: `🛍️ Open ${meta.category}`, callback: () => { window.location.href = meta.page; } },
          { label: '🔄 Start Over',             callback: resetChat }
        ]);
        return;
      }

      renderAuctionList(matches, 'Top picks for you:');

      showActionButtons([
        { label: `🛍️ Browse ${meta.category}`, callback: () => { window.location.href = meta.page; } },
        { label: '🔄 Start Over',               callback: resetChat }
      ]);
    });
  }

  /* ────────── Product search flow ────────── */

  function startProductSearch() {
    currentMode = 'search';
    conversationStep = 0;
    clearActions();
    chatActions.style.display = 'none';
    chatInputWrap.style.display = 'flex';

    addMessage('What are you looking for? Try keywords like "rolex watch", "designer bag", or "gaming laptop".');
    chatInput.placeholder = 'Describe what you are looking for...';
    chatInput.value = '';
    chatInput.focus();
  }

  function performProductSearch() {
    searchQuery = chatInput.value.trim();
    if (!searchQuery) return;

    addMessage(escapeHtml(searchQuery), false);
    chatInput.value = '';

    addMessage('Searching our collection... 🔍');

    loadAuctions().then(list => {
      const q = searchQuery.toLowerCase();
      const results = list.filter(item => {
        const title = (item.title || '').toLowerCase();
        const desc  = (item.description || '').toLowerCase();
        const cat   = (item.category || '').toLowerCase();
        const seller= (item.seller || '').toLowerCase();
        return title.includes(q) || desc.includes(q) || cat.includes(q) || seller.includes(q);
      }).slice(0, 5);

      showSearchResults(results);
    });
  }

  function renderAuctionList(items, heading) {
    if (!items.length) return;

    const wrap = document.createElement('div');
    wrap.className = 'message bot-message';

    let html = '<div class="message-content" style="background:rgba(0,0,0,.04);padding:.8rem;border-radius:8px;">';
    html += `<div style="font-weight:700;margin-bottom:.4rem;">${escapeHtml(heading)}</div>`;
    items.forEach(item => {
      const img    = (item.images && item.images[0]) || item.image || '';
      const imgTag = img
        ? `<img src="${escapeHtml(img)}" style="width:64px;height:64px;object-fit:cover;border-radius:6px;flex-shrink:0;" onerror="this.style.display='none'">`
        : `<div style="width:64px;height:64px;border-radius:6px;background:linear-gradient(135deg,#667eea,#764ba2);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:1.4rem;">🔥</div>`;
      const price  = Number(item.current_price || item.start_price || 0);
      const mode   = (item.auction_type || '').toLowerCase() === 'live' ? 'LIVE' : 'NORMAL';

      html += `
        <button type="button" class="chatbot-result-card" data-id="${escapeHtml(item.id)}"
                style="display:flex;gap:.6rem;align-items:center;padding:.5rem;margin-top:.5rem;border-radius:8px;cursor:pointer;background:rgba(255,255,255,.6);width:100%;text-align:left;border:1px solid rgba(0,0,0,.05);">
          ${imgTag}
          <div style="flex:1;font-size:.9rem;min-width:0;">
            <div style="font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(item.title || 'Auction Item')}</div>
            <div style="color:#666;font-size:.8rem;">by ${escapeHtml(item.seller || 'Mazad')} &middot; ${escapeHtml(item.category || '')}</div>
            <div style="color:#d97706;font-weight:700;margin-top:.2rem;">$${price.toLocaleString()} &middot; ${mode}</div>
          </div>
        </button>
      `;
    });
    html += '</div>';
    wrap.innerHTML = html;

    chatMessages.appendChild(wrap);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    wrap.querySelectorAll('.chatbot-result-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = Number(card.dataset.id);
        const target = items.find(it => Number(it.id) === id);
        if (target) openAuctionDetails(target);
      });
    });
  }

  function showSearchResults(results) {
    if (!results.length) {
      addMessage('Sorry, no products matched your search. Try different keywords. 😕');
      showActionButtons([
        { label: '🔍 Search Again', callback: startProductSearch },
        { label: '🔄 Start Over',   callback: resetChat }
      ]);
      return;
    }

    renderAuctionList(results, `Found ${results.length} match${results.length > 1 ? 'es' : ''}:`);

    showActionButtons([
      { label: '🛍️ Browse All Auctions', callback: () => { window.location.href = 'index.html'; } },
      { label: '🔍 Search Again',         callback: startProductSearch },
      { label: '🔄 Start Over',           callback: resetChat }
    ]);
  }

  /* ────────── Reset / wiring ────────── */

  function resetChat() {
    currentMode      = null;
    conversationStep = 0;
    giftState        = { gender: null, occasion: null, budget: null, style: null };
    searchQuery      = '';
    chatMessages.innerHTML = '';
    chatInputWrap.style.display = 'none';
    chatInput.value = '';

    const welcome = document.createElement('div');
    welcome.className = 'message bot-message';
    welcome.innerHTML = `<div class="message-content">
      👋 Hello! I'm your Mazad Assistant. I can help you:
      <br><br>
      <strong>1. Gift Suggestion:</strong> Answer a few questions and I'll recommend the perfect gift.
      <br>
      <strong>2. Product Search:</strong> Tell me what you're looking for, and I'll find it for you.
      <br><br>
      What would you like to do?
    </div>`;
    chatMessages.appendChild(welcome);

    chatActions.style.display = 'flex';
    chatActions.innerHTML = `
      <button class="action-btn" data-action="gift">🎁 Suggest a Gift</button>
      <button class="action-btn" data-action="search">🔍 Search Product</button>
    `;
    attachActionListeners();
  }

  function attachActionListeners() {
    document.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        if (action === 'gift') {
          addMessage('🎁 Suggest a Gift', false);
          startGiftSuggestion();
        } else if (action === 'search') {
          addMessage('🔍 Search Product', false);
          startProductSearch();
        }
      });
    });
  }

  chatSendBtn.addEventListener('click', () => {
    const value = chatInput.value.trim();
    if (!value) return;

    if (currentMode === 'gift') {
      const q = giftQuestions[conversationStep];
      if (!q) return;
      let parsed = value;
      if (q.key === 'budget') {
        const num = Number(String(value).replace(/[^0-9.]/g, ''));
        parsed = num > 0 ? num : value;
      }
      giftState[q.key] = parsed;
      addMessage(escapeHtml(value), false);
      chatInput.value = '';
      conversationStep++;
      setTimeout(askGiftQuestion, 250);
    } else if (currentMode === 'search') {
      performProductSearch();
    }
  });

  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') chatSendBtn.click();
  });

  resetChatBtn.addEventListener('click', resetChat);

  attachActionListeners();
})();
