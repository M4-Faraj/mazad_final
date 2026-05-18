const liveToast = document.getElementById('liveToast');

const backBtn = document.getElementById('backBtn');
const facebookBtn = document.getElementById('facebookBtn');

const joinCameraBtn = document.getElementById('joinCameraBtn');
const muteBtn = document.getElementById('muteBtn');
const videoBtn = document.getElementById('videoBtn');
const raiseHandBtn = document.getElementById('raiseHandBtn');

const hostVideo = document.getElementById('hostVideo');
const streamPlaceholder = document.getElementById('streamPlaceholder');

const liveItemTitle = document.getElementById('liveItemTitle');
const liveItemSubtitle = document.getElementById('liveItemSubtitle');
const hostDisplayName = document.getElementById('hostDisplayName');
const categoryDisplay = document.getElementById('categoryDisplay');

const itemEmoji = document.getElementById('itemEmoji');
const itemImage = document.getElementById('itemImage');
const itemPreview = document.getElementById('itemPreview');
const itemPreviewFallback = document.getElementById('itemPreviewFallback');

const detailTitle = document.getElementById('detailTitle');
const detailDescription = document.getElementById('detailDescription');
const itemTypeBadge = document.getElementById('itemTypeBadge');
const itemSellerBadge = document.getElementById('itemSellerBadge');
const openingPrice = document.getElementById('openingPrice');
const currentBid = document.getElementById('currentBid');
const minRaise = document.getElementById('minRaise');

const highestBidValue = document.getElementById('highestBidValue');
const highestBidderText = document.getElementById('highestBidderText');
const highestBidBox = document.getElementById('highestBidBox');

const bidInput = document.getElementById('bidInput');
const placeBidBtn = document.getElementById('placeBidBtn');
const quickBidGrid = document.getElementById('quickBidGrid');

const bidHistory = document.getElementById('bidHistory');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const chatSendBtn = document.getElementById('chatSendBtn');

const participantsGrid = document.getElementById('participantsGrid');
const participantsCountChip = document.getElementById('participantsCountChip');

const totalBidsEl = document.getElementById('totalBids');
const watchersCount = document.getElementById('watchersCount');
const timeLeftBadge = document.getElementById('timeLeftBadge');
const auctionModeBadge = document.getElementById('auctionModeBadge');
const liveStatusChip = document.getElementById('liveStatusChip');
let lastLiveMessageId = 0;

let appState = {
  item: null,
  currentBid: 0,
  openingPrice: 0,
  minRaise: 500,
  totalBids: 0,
  highestBidder: 'No bids yet',
  watchers: 2412,
  participants: [],
  userName: 'You',
  userRole: 'user',
  canStream: false,
  canBid: false,
  stream: null,
  micMuted: false,
  cameraHidden: false,
  countdownSeconds: 3600,
  endTimeMs: 0,
  auctionEnded: false
};

function showToast(message){
  liveToast.textContent = message;
  liveToast.classList.add('show');

  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    liveToast.classList.remove('show');
  }, 2600);
}

function formatPrice(value){
  return '$' + Number(value || 0).toLocaleString();
}

function moneyToNumber(value){
  return Number(String(value).replace(/[^0-9.]/g, '')) || 0;
}

function safeText(value, fallback = ''){
  if(value === undefined || value === null || value === '') return fallback;
  return String(value);
}

function parseAuctionEndTime(value) {
  if (!value) return 0;
  const time = new Date(String(value).replace(' ', 'T')).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function getRemainingMs(item = appState.item) {
  const end = parseAuctionEndTime(item && item.end_time);
  return end > 0 ? Math.max(0, end - Date.now()) : 0;
}

function isAuctionExpired(item) {
  const end = parseAuctionEndTime(item && item.end_time);
  return end > 0 && Date.now() >= end;
}

function getLiveItem(){
  const direct = localStorage.getItem('currentLiveAuction');
  if (direct) {
    try {
      return JSON.parse(direct);
    } catch (e) {}
  }

  const list = localStorage.getItem('liveAuctionItems');
  if (list) {
    try {
      const parsed = JSON.parse(list);
      if (Array.isArray(parsed) && parsed.length) {
        return parsed[parsed.length - 1];
      }
    } catch (e) {}
  }

  return {
    id: Date.now(),
    title: 'Rare Luxury Vintage Watch',
    seller: 'Mazad Official',
    type: 'Watch',
    category: 'Live Auction',
    price: 18500,
    description: 'An exceptional luxury watch offered now inside the MAZAD live room. Premium collectors can place real-time bids inside this immersive live auction interface.',
    image: '',
    imageUrl: '',
    emoji: '⌚',
    status: 'live',
    durationMinutes: 60,
    facebookLiveUrl: 'https://www.facebook.com/live'
  };
}
async function loadLiveItemFromDatabase() {
  const params = new URLSearchParams(window.location.search);
  const requestedId = params.get('id') || params.get('auction_id');

  const url = requestedId
    ? `/mazad/api/api/get-auctions.php?id=${encodeURIComponent(requestedId)}&include_ended=1`
    : '/mazad/api/api/get-auctions.php';

  const response = await fetch(url, {
    cache: 'no-store'
  });

  const data = await response.json();

  if (data.status !== 'success') {
    throw new Error(data.message || 'Failed to load live auctions');
  }

  const auctions = data.data || [];

  let liveItems = auctions.filter(a =>
    String(a.auction_type || '').toLowerCase() === 'live' &&
    String(a.status || '').toLowerCase() === 'approved' &&
    !isAuctionExpired(a)
  );

  if (requestedId) {
    const selected = auctions.find(a => String(a.id) === String(requestedId));

    if (!selected) {
      throw new Error('Live auction not found');
    }

    if (
      String(selected.auction_type || '').toLowerCase() !== 'live' ||
      String(selected.status || '').toLowerCase() !== 'approved'
    ) {
      throw new Error('This auction is not an active live auction');
    }

    return normalizeLiveAuction(selected);
  }

  if (!liveItems.length) {
    throw new Error('No active live auctions found');
  }

  return normalizeLiveAuction(liveItems[0]);
}

function normalizeLiveAuction(a) {
  return {
    id: a.id,
    title: a.title || 'Live Auction Item',
    seller: a.seller || 'Mazad Seller',
    type: a.category || 'Live Auction',
    category: a.category || 'Live Auction',
    price: Number(a.current_price || a.start_price || 0),
    startPrice: Number(a.start_price || 0),
    currentPrice: Number(a.current_price || a.start_price || 0),
    description: a.description || '',
    images: a.images || [],
    image: a.image || '',
    imageUrl: (a.images && a.images[0]) ? a.images[0] : (a.image || ''),
    status: a.status || '',
    mode: a.auction_type || 'live',
    auction_type: a.auction_type || 'live',
    end_time: a.end_time || '',
    durationMinutes: calculateDurationMinutes(a.end_time),
    facebookLiveUrl: a.facebook_live_url || ''
  };
}

function calculateDurationMinutes(endTime) {
  if (!endTime) return 60;

  const end = new Date(endTime.replace(' ', 'T'));
  const now = new Date();

  if (isNaN(end.getTime())) return 60;

  const diffMs = end.getTime() - now.getTime();
  const diffMinutes = Math.ceil(diffMs / 60000);

  return diffMinutes > 0 ? diffMinutes : 1;
}


function getEmojiForItem(item){
  if(item.emoji) return item.emoji;

  const type = safeText(item.type || item.category, '').toLowerCase();

  const map = {
    fashion: '👜',
    sneakers: '👟',
    bags: '👜',
    jackets: '🧥',
    accessories: '🕶️',
    electronics: '💻',
    laptop: '💻',
    phone: '📱',
    camera: '📷',
    gaming: '🎮',
    vehicles: '🚗',
    sedan: '🚗',
    suv: '🚙',
    sports: '🏎️',
    classic: '🚘',
    truck: '🛻',
    art: '🎨',
    painting: '🖼️',
    vintage: '🏺',
    coins: '🪙',
    cards: '🃏',
    watches: '⌚',
    watch: '⌚',
    ring: '💍',
    earrings: '💎',
    necklace: '✨',
    home: '🏡',
    furniture: '🛋️',
    decor: '🪞',
    kitchen: '🍳',
    garden: '🌿'
  };

  return map[type] || '🔥';
}

function seedParticipants(item){
  const seller = safeText(item.seller, 'Mazad Host');
  const emoji = getEmojiForItem(item);

  return [
    { name: seller, role: 'Host', emoji, live: true, local: false },
    { name: 'Collector Pro', role: 'Bidder', emoji: '🧑‍💼', live: true, local: false },
    { name: 'Luxury Hunter', role: 'Bidder', emoji: '👩‍💼', live: true, local: false },
    { name: 'Premium Guest', role: 'Viewer', emoji: '🧑', live: true, local: false }
  ];
}

function renderParticipants(){
  participantsGrid.innerHTML = '';

  appState.participants.forEach((participant) => {
    const tile = document.createElement('div');
    tile.className = 'participant-tile';

    const camera = document.createElement('div');
    camera.className = 'participant-camera';

    if(participant.local && appState.stream && !appState.cameraHidden){
      const miniVideo = document.createElement('video');
      miniVideo.autoplay = true;
      miniVideo.muted = true;
      miniVideo.playsInline = true;
      miniVideo.srcObject = appState.stream;
      camera.appendChild(miniVideo);
    } else if (participant.profile_image && participant.profile_image.startsWith('data:image/')) {
  camera.innerHTML = `
    <img src="${participant.profile_image}" style="width:100%;height:100%;object-fit:cover;border-radius:18px;">
  `;
} else {
  camera.textContent = participant.emoji || '🎥';
}

    const meta = document.createElement('div');
    meta.className = 'participant-meta';

    const name = document.createElement('div');
    name.className = 'participant-name';
    name.textContent = `${participant.name} • ${participant.role}`;

    const status = document.createElement('div');
    status.className = 'participant-status';

    meta.appendChild(name);
    meta.appendChild(status);

    tile.appendChild(camera);
    tile.appendChild(meta);

    participantsGrid.appendChild(tile);
  });

  participantsCountChip.textContent = `${appState.participants.length} participants`;
}

function renderItemData(){
  const item = appState.item;
  const title = safeText(item.title, 'Live Auction Item');
  const seller = safeText(item.seller, 'Mazad Official');
  const type = safeText(item.type || item.category, 'Live Auction');
  const desc = safeText(item.description, 'Premium live auction item ready for active bidding.');
  const price = Number(item.price || 0);
  const emoji = getEmojiForItem(item);
  const imageUrl = (item.images && item.images.length) ? item.images[0] : (item.image || item.imageUrl || '');

  document.title = `${title} | MAZAD Live`;
  liveItemTitle.textContent = title;
  liveItemSubtitle.textContent = `Hosted by ${seller}`;
  hostDisplayName.textContent = `Host: ${seller}`;
  categoryDisplay.textContent = type;

  detailTitle.textContent = title;
  detailDescription.textContent = desc;
  itemTypeBadge.textContent = type;
  itemSellerBadge.textContent = seller;

  itemEmoji.textContent = emoji;
  itemPreviewFallback.textContent = emoji;

  if(imageUrl){
    itemImage.src = imageUrl;
    itemImage.style.display = 'block';
    itemPreview.classList.add('has-image');
    itemPreviewFallback.style.display = 'none';
  } else {
    itemImage.removeAttribute('src');
    itemImage.style.display = 'none';
    itemPreview.classList.remove('has-image');
    itemPreviewFallback.style.display = 'flex';
  }

  appState.openingPrice = price > 0 ? price : 1000;
  appState.currentBid = appState.openingPrice;
  appState.minRaise = Math.max(100, Math.round(appState.openingPrice * 0.03 / 100) * 100 || 500);
  appState.endTimeMs = parseAuctionEndTime(item.end_time);
  appState.countdownSeconds = Math.ceil(getRemainingMs(item) / 1000);
  appState.auctionEnded = appState.endTimeMs > 0 && appState.countdownSeconds <= 0;

  openingPrice.textContent = formatPrice(appState.openingPrice);
  currentBid.textContent = formatPrice(appState.currentBid);
  minRaise.textContent = formatPrice(appState.minRaise);
  highestBidValue.textContent = formatPrice(appState.currentBid);
  highestBidderText.textContent = 'Opening price is live now';
  bidInput.value = appState.currentBid + appState.minRaise;

  auctionModeBadge.textContent = safeText(item.mode, 'Live Auction').toUpperCase();

  if (appState.auctionEnded) {
    closeAuctionUi(false);
  } else if (liveStatusChip) {
    liveStatusChip.textContent = 'Bidding Open';
  }
}

function addBidHistoryRow(name, amount, note = 'Placed a new bid'){
  const row = document.createElement('div');
  row.className = 'bid-row';
  row.innerHTML = `
    <div>
      <strong>${escapeLiveHtml(name)}</strong>
      <span>${escapeLiveHtml(note)}</span>
    </div>
    <b>${formatPrice(amount)}</b>
  `;

  bidHistory.prepend(row);

  while (bidHistory.children.length > 12) {
    bidHistory.removeChild(bidHistory.lastChild);
  }
}

function addChatMessage(user, text, isBid = false){
  const message = document.createElement('div');
  message.className = 'chat-message' + (isBid ? ' bid' : '');
  message.innerHTML = `
    <div class="user">${escapeLiveHtml(user)}</div>
    <div class="text">${escapeLiveHtml(text)}</div>
  `;

  chatMessages.appendChild(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  while (chatMessages.children.length > 40) {
    chatMessages.removeChild(chatMessages.firstChild);
  }
}

function bumpHighestBid(){
  highestBidBox.classList.add('bump');
  setTimeout(() => highestBidBox.classList.remove('bump'), 320);
}

function updateBidUI(){
  currentBid.textContent = formatPrice(appState.currentBid);
  highestBidValue.textContent = formatPrice(appState.currentBid);
  highestBidderText.textContent = `Highest bidder: ${appState.highestBidder}`;
  totalBidsEl.textContent = appState.totalBids;
  bidInput.value = appState.currentBid + appState.minRaise;
  bumpHighestBid();
}

function placeBid(userName, amount, automated = false){
  if(appState.auctionEnded) {
    showToast('Auction already ended');
    return false;
  }

  const numericAmount = Number(amount);

  if(!numericAmount || numericAmount < appState.currentBid + appState.minRaise){
    showToast(`Minimum next bid is ${formatPrice(appState.currentBid + appState.minRaise)}`);
    return false;
  }

  appState.currentBid = numericAmount;
  appState.totalBids += 1;
  appState.highestBidder = userName;

  updateBidUI();
  addBidHistoryRow(userName, numericAmount, automated ? 'Auto bid' : 'Placed a new bid');
  addChatMessage(userName, `Bid ${formatPrice(numericAmount)}`, true);

  return true;
}
async function submitLiveBidToDatabase(amount) {
  if (!appState.item || !appState.item.id) {
    showToast('No live auction selected');
    return;
  }

  if (!appState.canBid) {
    showToast('Please sign in to place live bids');
    setTimeout(() => { window.location.href = 'login.html'; }, 900);
    return;
  }

  placeBidBtn.disabled = true;
  placeBidBtn.textContent = 'Submitting...';

  try {
    const response = await fetch('/mazad/api/add-bid.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        auction_id: appState.item.id,
        amount: amount
      }).toString()
    });

    const data = await response.json();

    if (data.status !== 'success') {
      showToast(data.message || 'Bid failed');
      return;
    }

   if (data.bid_status === 'pending') {
  showToast('Your high bid is waiting for admin approval ✅');
  addChatMessage(
    'AuctionBot',
    `A high bid of ${formatPrice(amount)} was submitted and is waiting for admin approval.`,
    false
  );
  await refreshAuctionBidState();
  return;
}

    showToast('Bid placed successfully ✅');

    await refreshAuctionBidState();
   sendLiveMessageToDatabase(`Bid ${formatPrice(appState.currentBid)}`, 'bid');

  } catch (err) {
    console.error('submitLiveBidToDatabase error:', err);
    showToast('Network error while placing bid');
  } finally {
    if (!appState.auctionEnded && appState.canBid) {
      placeBidBtn.disabled = false;
      placeBidBtn.textContent = 'Place Bid';
    }
  }
}
function handlePlaceBid(){
  const amount = moneyToNumber(bidInput.value);

  if (appState.auctionEnded) {
    showToast('Auction already ended');
    return;
  }

  if (!amount || amount <= appState.currentBid) {
    showToast(`Bid must be higher than ${formatPrice(appState.currentBid)}`);
    return;
  }

  submitLiveBidToDatabase(amount);
}

function escapeLiveHtml(value) {
  const div = document.createElement('div');
  div.textContent = value || '';
  return div.innerHTML;
}

async function sendLiveMessageToDatabase(message, type = 'chat') {
  if (!appState.item || !appState.item.id) return false;

  try {
    const response = await fetch('/mazad/api/send-live-message.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        auction_id: appState.item.id,
        message: message,
        message_type: type
      }).toString()
    });

    const data = await response.json();

    if (data.status !== 'success') {
      showToast(data.message || 'Failed to send message');
      return false;
    }

    return true;
  } catch (err) {
    console.error('sendLiveMessageToDatabase error:', err);
    showToast('Failed to send message');
    return false;
  }
}

async function loadLiveMessages() {
  if (!appState.item || !appState.item.id) return;

  try {
    const response = await fetch(
      `/mazad/api/get-live-messages.php?auction_id=${encodeURIComponent(appState.item.id)}&after_id=${encodeURIComponent(lastLiveMessageId)}`,
      { cache: 'no-store' }
    );

    const data = await response.json();

    if (data.status !== 'success') return;

    const messages = data.data || [];

    messages.forEach(msg => {
      lastLiveMessageId = Math.max(lastLiveMessageId, Number(msg.id || 0));

      const isBid = msg.message_type === 'bid';
      const isHand = msg.message_type === 'hand';

      addChatMessage(
        msg.user_name || 'User',
        isHand ? '✋ ' + msg.message : msg.message,
        isBid
      );
    });
  } catch (err) {
    console.warn('loadLiveMessages error:', err);
  }
}
async function sendChat(){
  const message = chatInput.value.trim();
  if(!message) return;

  chatInput.value = '';

  const sent = await sendLiveMessageToDatabase(message, 'chat');

  if (sent) {
    loadLiveMessages();
  }
}

function formatTime(seconds){
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if(hrs > 0){
    return `${String(hrs).padStart(2,'0')}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
  }

  return `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
}

function closeAuctionUi(notify = true){
  appState.countdownSeconds = 0;
  appState.auctionEnded = true;

  if (timeLeftBadge) {
    timeLeftBadge.textContent = 'ENDED';
    timeLeftBadge.classList.add('danger');
  }
  if (liveStatusChip) liveStatusChip.textContent = 'Auction Closed';
  if (placeBidBtn) {
    placeBidBtn.disabled = true;
    placeBidBtn.textContent = 'Auction Ended';
  }
  if (bidInput) {
    bidInput.disabled = true;
    bidInput.placeholder = 'Auction ended';
  }
  if (quickBidGrid) {
    quickBidGrid.querySelectorAll('button').forEach(b => b.disabled = true);
  }

  if (notify) {
    addChatMessage('AuctionBot', 'The live auction has ended.', false);
    showToast('Auction ended');
  }
}

function updateCountdown(){
  if(appState.auctionEnded) return;

  const remainingMs = getRemainingMs(appState.item);
  const remainingSeconds = Math.ceil(remainingMs / 1000);

  if(remainingSeconds <= 0){
    closeAuctionUi(true);
    return;
  }

  appState.countdownSeconds = remainingSeconds;
  timeLeftBadge.textContent = formatTime(appState.countdownSeconds);

  if(appState.countdownSeconds <= 300){
    timeLeftBadge.classList.add('danger');
  }
}

function animateWatchers(){
  if(appState.auctionEnded) return;

  const change = Math.floor(Math.random() * 14) - 6;
  appState.watchers = Math.max(2000, appState.watchers + change);
  watchersCount.textContent = appState.watchers.toLocaleString();
}

function simulateRoomActivity(){
  if(appState.auctionEnded) return;

  const names = ['Collector Pro', 'Luxury Hunter', 'Vintage Queen', 'Premium Guest', 'Auction Master'];
  const messages = [
    'Amazing piece.',
    'This is going higher for sure.',
    'Beautiful condition 🔥',
    'Host, show us the item closer.',
    'Serious bidding room tonight.',
    'Mazad always brings top items.'
  ];

  const chance = Math.random();

  if(chance > 0.62){
    const randomName = names[Math.floor(Math.random() * names.length)];
    const raiseFactor = [appState.minRaise, appState.minRaise * 2, appState.minRaise * 3];
    const amount = appState.currentBid + raiseFactor[Math.floor(Math.random() * raiseFactor.length)];
    placeBid(randomName, amount, true);
  } else if(chance > 0.35){
    const randomName = names[Math.floor(Math.random() * names.length)];
    const message = messages[Math.floor(Math.random() * messages.length)];
    addChatMessage(randomName, message, false);
  }
}

async function startCamera(){
  // Normal users can only watch — join as a viewer, no camera.
  if (!appState.canStream) {
    showToast('You are now in the live room ✅');
    joinCameraBtn.classList.add('active');
    joinCameraBtn.textContent = 'Room Joined';
    joinCameraBtn.disabled = true;
    addChatMessage(appState.userName, 'joined the live room.', false);
    joinLiveRoom();
    loadLiveViewers();
    return;
  }

  // Admin / employee already broadcasting -> stop.
  if (appState.stream) {
    stopCamera();
    return;
  }

  // Admin / employee -> start broadcasting the camera.
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    appState.stream = stream;

    hostVideo.srcObject = stream;
    hostVideo.muted = true;
    hostVideo.play().catch(() => {});

    if (streamPlaceholder) streamPlaceholder.style.display = 'none';

    joinCameraBtn.classList.add('active');
    joinCameraBtn.textContent = 'Stop Stream';

    showToast('You are now streaming live 🎥');
    addChatMessage(appState.userName, 'started the live stream.', false);

    joinLiveRoom();
    loadLiveViewers();
  } catch (err) {
    console.error('getUserMedia error:', err);
    showToast('Could not start the camera — check permissions');
  }
}

function stopCamera(){
  if (appState.stream) {
    appState.stream.getTracks().forEach(track => track.stop());
    appState.stream = null;
  }

  hostVideo.srcObject = null;
  if (streamPlaceholder) streamPlaceholder.style.display = '';

  joinCameraBtn.classList.remove('active');
  joinCameraBtn.textContent = 'Go Live (Camera)';

  showToast('Live stream stopped');
  addChatMessage(appState.userName, 'stopped the live stream.', false);
}

function removeDuplicateParticipants(list){
  const seen = new Set();
  return list.filter(person => {
    const key = `${person.name}-${person.role}`;
    if(seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
function toggleMute(){
  showToast('Group audio will be enabled later 🎙️');
}

function toggleVideo(){
  showToast('Group video will be enabled later 🎥');
}
async function raiseHand(){
  const sent = await sendLiveMessageToDatabase('raised hand to speak or ask about the item.', 'hand');

  if (sent) {
    showToast('Raised hand sent to the room');
    loadLiveMessages();
  }
}

function openFacebookLive(){
  const url = appState.item.facebookLiveUrl || 'https://www.facebook.com/live';
  window.open(url, '_blank');
}

async function loadBidHistoryFromDatabase() {
  if (!appState.item || !appState.item.id) return;

  try {
    const response = await fetch(`/mazad/api/get-bids.php?auction_id=${encodeURIComponent(appState.item.id)}`, {
      cache: 'no-store'
    });

    const data = await response.json();

    if (data.status !== 'success') return;

    const bids = (data.data || [])
      .map(b => ({
        ...b,
        amount: moneyToNumber(b.amount || b.bid_amount || 0),
        id: Number(b.id || 0),
        createdTime: b.created_at ? new Date(String(b.created_at).replace(' ', 'T')).getTime() : 0
      }))
      .filter(b => b.amount > 0)
      .sort((a, b) => (b.amount - a.amount) || (b.id - a.id) || (b.createdTime - a.createdTime));

    bidHistory.innerHTML = '';

    if (!bids.length) {
      addBidHistoryRow('AuctionBot', appState.openingPrice, 'Opening price');
      totalBidsEl.textContent = appState.totalBids;
      updateBidUI();
      return;
    }

    appState.totalBids = bids.length;

    const highest = bids[0];
    appState.currentBid = Math.max(
      moneyToNumber(appState.openingPrice),
      moneyToNumber(appState.currentBid),
      moneyToNumber(highest.amount)
    );
    appState.highestBidder = highest.bidder || 'Unknown bidder';

    bids.slice(0, 12).reverse().forEach((b) => {
      const isHighest = Number(b.id || 0) === Number(highest.id || 0);
      addBidHistoryRow(b.bidder, moneyToNumber(b.amount), isHighest ? 'Highest approved bid' : 'Approved bid');
    });

    updateBidUI();

  } catch (err) {
    console.error('loadBidHistoryFromDatabase error:', err);
  }
}

async function refreshAuctionBidState() {
  if (!appState.item || !appState.item.id) return;

  try {
    const params = new URLSearchParams(window.location.search);
    const requestedId = params.get('id') || params.get('auction_id');

    if (requestedId) {
      const freshItem = await loadLiveItemFromDatabase();
      if (String(freshItem.id) !== String(appState.item.id)) return;

      appState.item = freshItem;
      appState.openingPrice = moneyToNumber(freshItem.startPrice || freshItem.price || appState.openingPrice);
      appState.currentBid = Math.max(
        moneyToNumber(appState.currentBid),
        moneyToNumber(freshItem.currentPrice || freshItem.price || 0),
        moneyToNumber(appState.openingPrice)
      );
    }
  } catch (err) {
    console.warn('refreshAuctionBidState auction refresh failed:', err);
  }

  await loadBidHistoryFromDatabase();
}
function seedInitialFeed(){
  chatMessages.innerHTML = '';
  lastLiveMessageId = 0;
  loadLiveMessages();
  refreshAuctionBidState();
}
function initQuickBidButtons(){
  quickBidGrid.querySelectorAll('.quick-bid-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const raise = Number(btn.dataset.raise || 0);
      bidInput.value = appState.currentBid + raise;
    });
  });
}

function initEvents(){
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      history.back();
    });
  }

 if (facebookBtn) {
  facebookBtn.addEventListener('click', openFacebookLive);
}
  joinCameraBtn.addEventListener('click', startCamera);
  muteBtn.addEventListener('click', toggleMute);
  videoBtn.addEventListener('click', toggleVideo);
  raiseHandBtn.addEventListener('click', raiseHand);
  placeBidBtn.addEventListener('click', handlePlaceBid);
  chatSendBtn.addEventListener('click', sendChat);

  chatInput.addEventListener('keypress', (e) => {
    if(e.key === 'Enter'){
      sendChat();
    }
  });
}
async function loadCurrentLiveUser() {
  try {
    const response = await fetch('/mazad/api/get-current-user.php', {
      cache: 'no-store'
    });

    const data = await response.json();

    if (data.status === 'success' && data.user) {
      appState.userName = data.user.name || data.user.email || 'You';
      appState.userRole = String(data.user.role || 'user').toLowerCase();
      // Trust the server-computed flag — only admins/employees may broadcast.
      appState.canStream = data.user.can_stream === true;
      appState.canBid = true;
    } else {
      // Not logged in / no user -> watch only.
      appState.canStream = false;
      appState.canBid = false;
    }
  } catch (err) {
    console.warn('Could not load current user for live room', err);
    appState.canStream = false;
    appState.canBid = false;
  }

  applyStreamPermissions();
}

/* Only admins and employees can broadcast the camera. Logged-in users can bid. */
function applyStreamPermissions(){
  // Reset to a neutral (not joined / not streaming) state before labelling.
  joinCameraBtn.classList.remove('active');
  joinCameraBtn.disabled = false;

  if (appState.canStream) {
    joinCameraBtn.textContent = 'Go Live (Camera)';
    joinCameraBtn.classList.add('warn');
    joinCameraBtn.title = 'Start broadcasting your camera to the room';
    if (muteBtn) muteBtn.disabled = false;
    if (videoBtn) videoBtn.disabled = false;
  } else {
    joinCameraBtn.textContent = 'Join Room';
    joinCameraBtn.classList.remove('warn');
    joinCameraBtn.title = 'Only admins and employees can stream — viewers can only watch';
    if (muteBtn) {
      muteBtn.disabled = true;
      muteBtn.title = 'Only admins and employees can stream audio';
    }
    if (videoBtn) {
      videoBtn.disabled = true;
      videoBtn.title = 'Only admins and employees can stream video';
    }
  }

  if (appState.auctionEnded) {
    closeAuctionUi(false);
  } else if (!appState.canBid) {
    if (placeBidBtn) {
      placeBidBtn.disabled = true;
      placeBidBtn.title = 'Sign in to place live bids';
      placeBidBtn.textContent = 'Sign in to bid';
    }
    if (bidInput) {
      bidInput.disabled = true;
      bidInput.placeholder = 'Sign in to place a live bid';
    }
    if (quickBidGrid) {
      quickBidGrid.querySelectorAll('button').forEach(b => b.disabled = true);
    }
    if (raiseHandBtn) {
      raiseHandBtn.disabled = false;
    }
  } else {
    if (placeBidBtn) {
      placeBidBtn.disabled = false;
      placeBidBtn.title = '';
      placeBidBtn.textContent = 'Place Bid';
    }
    if (bidInput) {
      bidInput.disabled = false;
      bidInput.placeholder = 'Enter your bid';
    }
    if (quickBidGrid) {
      quickBidGrid.querySelectorAll('button').forEach(b => b.disabled = false);
    }
  }
}
async function joinLiveRoom() {
  if (!appState.item || !appState.item.id) return;

  try {
    await fetch('/mazad/api/join-live.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        auction_id: appState.item.id
      }).toString()
    });
  } catch (err) {
    console.warn('joinLiveRoom error:', err);
  }
}

async function loadLiveViewers() {
  if (!appState.item || !appState.item.id) return;

  try {
    const response = await fetch(`/mazad/api/get-live-viewers.php?auction_id=${encodeURIComponent(appState.item.id)}`, {
      cache: 'no-store'
    });

    const data = await response.json();

    if (data.status !== 'success') return;

    const viewers = data.data || [];

    appState.participants = viewers.map(v => ({
      name: v.name || 'User',
      role: v.role === 'admin' ? 'Admin' : v.role === 'employee' ? 'Employee' : 'Viewer',
      emoji: (v.name || 'U').charAt(0).toUpperCase(),
      live: true,
      local: false,
      profile_image: v.profile_image || null
    }));

    renderParticipants();

    if (watchersCount) {
      watchersCount.textContent = String(data.count || viewers.length);
    }

    if (participantsCountChip) {
      participantsCountChip.textContent = `${data.count || viewers.length} participants`;
    }
  } catch (err) {
    console.warn('loadLiveViewers error:', err);
  }
}

function leaveLiveRoom() {
  if (appState.stream) {
    appState.stream.getTracks().forEach(track => track.stop());
    appState.stream = null;
  }

  if (!appState.item || !appState.item.id) return;

  const body = new URLSearchParams({
    auction_id: appState.item.id
  }).toString();

  navigator.sendBeacon(
    '/mazad/api/leave-live.php',
    new Blob([body], { type: 'application/x-www-form-urlencoded' })
  );
}
async function init(){
  // Resolve streaming permission first so the camera stays gated even if
  // the live item itself fails to load.
  await loadCurrentLiveUser();
  const params = new URLSearchParams(window.location.search);
  const requestedId = params.get('id') || params.get('auction_id');

  try {
    appState.item = await loadLiveItemFromDatabase();
    await joinLiveRoom();
  } catch (err) {
    console.error('Live auction load error:', err);
    showToast(err.message || 'Failed to load live auction');

    if (requestedId) {
      appState.item = {
        id: requestedId,
        title: 'Live auction unavailable',
        seller: 'Mazad',
        type: 'Live Auction',
        category: 'Live Auction',
        price: 0,
        startPrice: 0,
        currentPrice: 0,
        description: err.message || 'This auction is not available in the live room.',
        image: '',
        imageUrl: '',
        status: 'unavailable',
        mode: 'unavailable',
        durationMinutes: 1
      };

      renderItemData();
      bidHistory.innerHTML = '';
      addBidHistoryRow('AuctionBot', 0, 'Selected auction is not available for live bidding');
      placeBidBtn.disabled = true;
      bidInput.disabled = true;
      liveStatusChip.textContent = 'Unavailable';
      return;
    }

    appState.item = getLiveItem();
  }

  renderItemData();

  appState.participants = seedParticipants(appState.item);
  await loadLiveViewers();

  seedInitialFeed();
  initQuickBidButtons();
  initEvents();

  totalBidsEl.textContent = appState.totalBids;
  if (appState.auctionEnded) {
    closeAuctionUi(false);
  } else {
    updateCountdown();
  }

  setInterval(updateCountdown, 1000);
  setInterval(loadBidHistoryFromDatabase, 5000);
  setInterval(loadLiveMessages, 3000);
  setInterval(joinLiveRoom, 10000);
  setInterval(loadLiveViewers, 5000);
  

  // Disabled because watchers are now real users from database.
  // setInterval(simulateRoomActivity, 5000);
  // setInterval(animateWatchers, 8000);
}
window.addEventListener('beforeunload', leaveLiveRoom);
init();
