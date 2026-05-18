document.addEventListener("DOMContentLoaded", function () {

  // ── Load profile data ──────────────────────────────────────────

  fetch("/mazad/api/get-profile.php")
    .then(res => res.json())
    .then(data => {
      if (data.status !== "success") {
        window.location.href = "login.html";
        return;
      }

      const user = data.user;
const calculatedAge = calculateAge(user.birth_date);
const displayAge = user.age && Number(user.age) > 0 ? user.age : calculatedAge;
      document.getElementById("fullNameView").textContent =
        [(user.first_name || ''), (user.last_name || '')].filter(Boolean).join(' ') || user.name || "";
      document.getElementById("emailView").textContent    = user.email || "";
      document.getElementById("securityEmailView").textContent = user.email || "";
      document.getElementById("ageView").textContent = "Age: " + (displayAge || "-");

      document.getElementById("firstName").value  = user.first_name  || "";
      document.getElementById("lastName").value   = user.last_name   || "";
     document.getElementById("age").value = displayAge || "";
      document.getElementById("birthDate").value  = user.birth_date  || "";
      document.getElementById("phone").value      = user.phone       || "";
      document.getElementById("email").value      = user.email       || "";
      document.getElementById("city").value       = user.city        || "";
      document.getElementById("bio").value        = user.bio         || "";

      const tokensEl = document.getElementById("tokensValue");
      const rankEl   = document.getElementById("rankValue");
      if (tokensEl) tokensEl.textContent = String(user.tokens || 0);
      if (rankEl)   rankEl.textContent   = user.rank_title || "Bronze";

      const pct = Math.min(100, Math.max(5, Number(user.rank_score || 0) / 15));
      document.getElementById("usagePercentText").textContent = Math.round(pct) + "%";
      document.getElementById("usageBar").style.width         = Math.round(pct) + "%";

      // ── Credibility panel ──────────────────────────────────────
      const tiers = [
        { name: 'Bronze',   min: 0,    color: '#cd7f32' },
        { name: 'Silver',   min: 150,  color: '#c0c0c0' },
        { name: 'Gold',     min: 350,  color: '#f4c430' },
        { name: 'Platinum', min: 700,  color: '#e5e4e2' },
        { name: 'Diamond',  min: 1200, color: '#7df9ff' }
      ];
      const tokens = Number(user.tokens || 0);
      let curIdx = 0;
      for (let i = 0; i < tiers.length; i++) if (tokens >= tiers[i].min) curIdx = i;
      const cur = tiers[curIdx];
      const next = tiers[curIdx + 1];

      const badgeEl  = document.getElementById('credibilityBadge');
      const tokensTxt = document.getElementById('credibilityTokens');
      const nextEl   = document.getElementById('credibilityNext');
      const barEl    = document.getElementById('credibilityBar');

      if (badgeEl) {
        badgeEl.textContent = '★ ' + cur.name;
        badgeEl.style.color = cur.color;
      }
      if (tokensTxt) tokensTxt.textContent = tokens + ' tokens';
      if (nextEl) {
        nextEl.textContent = next
          ? `${next.min - tokens} tokens to ${next.name}`
          : 'Top tier reached';
      }
      if (barEl) {
        const span = next ? (next.min - cur.min) : 1;
        const into = next ? (tokens - cur.min) : 1;
        const pctBar = next ? Math.max(4, Math.min(100, (into / span) * 100)) : 100;
        barEl.style.width = pctBar + '%';
        barEl.style.background = next
          ? `linear-gradient(90deg, ${cur.color}, ${next.color})`
          : cur.color;
      }

      // Avatar: show saved image or initials
      const avatarEl = document.getElementById("profileAvatarPreview");
      if (user.profile_image && user.profile_image.startsWith("data:")) {
        avatarEl.innerHTML = `<img src="${user.profile_image}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
      } else {
        avatarEl.textContent = (user.name || "U").charAt(0).toUpperCase();
      }
    });

  });

// ── Header is handled by js/header.js ────────────────────────────


// ── Toast ──────────────────────────────────────────────────────

const toast = document.getElementById("profileToast");

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(window._profileToastTimer);
  window._profileToastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
}

// ── Profile tabs ───────────────────────────────────────────────

const profileTabs   = document.querySelectorAll(".profile-tab");
const profilePanels = document.querySelectorAll(".profile-panel");

profileTabs.forEach(tab => {
  tab.addEventListener("click", () => {
    profileTabs.forEach(b   => b.classList.remove("active"));
    profilePanels.forEach(p => p.classList.remove("active"));
    tab.classList.add("active");
    const panel = document.getElementById(tab.dataset.tab);
    if (panel) panel.classList.add("active");
  });
});

function activateProfileTab(panelId) {
  const targetTab = document.querySelector(`.profile-tab[data-tab="${panelId}"]`);
  const targetPanel = document.getElementById(panelId);

  if (!targetTab || !targetPanel) return;

  profileTabs.forEach(b => b.classList.remove("active"));
  profilePanels.forEach(p => p.classList.remove("active"));

  targetTab.classList.add("active");
  targetPanel.classList.add("active");

  if (panelId === "myAuctionsPanel" && typeof loadMyAuctions === "function") {
    loadMyAuctions();
  }

  if (panelId === "favoritesPanel" && typeof loadFavorites === "function") {
    loadFavorites();
  }

  if (panelId === "friendsPanel" && typeof loadFriendsPanel === "function") {
    loadFriendsPanel();
  }

  setTimeout(() => {
    targetPanel.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }, 200);
}

function openPanelFromHash() {
  const hashPanel = window.location.hash.replace("#", "");

  if (hashPanel) {
    activateProfileTab(hashPanel);
  }
}

window.addEventListener("load", openPanelFromHash);
window.addEventListener("hashchange", openPanelFromHash);
// ── Save profile ───────────────────────────────────────────────

let _avatarDataUrl = null; // store selected avatar base64

document.getElementById("saveProfileBtn").addEventListener("click", () => {
  const formData = new URLSearchParams();

  formData.append("first_name", document.getElementById("firstName").value.trim());
  formData.append("middle_name", "");
  formData.append("last_name",  document.getElementById("lastName").value.trim());
  formData.append("age",        document.getElementById("age").value.trim());
  formData.append("birth_date", document.getElementById("birthDate").value);
  formData.append("phone",      document.getElementById("phone").value.trim());
  formData.append("city",       document.getElementById("city").value.trim());
  formData.append("bio",        document.getElementById("bio").value.trim());

  if (_avatarDataUrl) {
    formData.append("profile_image", _avatarDataUrl);
  }

  fetch("/mazad/api/update-profile.php", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: formData.toString()
  })
    .then(res => res.text())
    .then(text => {

      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error("Invalid JSON from update-profile.php:", text);
        showToast("Server response is not JSON — check the Console ❌");
        return;
      }

      if (data.status === "success") {
        showToast("Account information saved successfully ✅");

        setTimeout(() => {
          window.location.reload();
        }, 700);
      } else {
        console.error("Update profile error:", data);
        showToast((data.message || "Failed to save information") + " ❌");
      }
    })
    .catch(err => {
      console.error("Save profile fetch error:", err);
      showToast("A problem occurred while saving ❌");
    });
});
// ── Avatar upload ──────────────────────────────────────────────

document.getElementById("profileAvatarInput").addEventListener("change", function (e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    showToast("The file must be an image ❌");
    return;
  }

  if (file.size > 6 * 1024 * 1024) {
    showToast("The image is too large. Choose an image under 6MB ❌");
    return;
  }

  compressProfileImage(file, 320, 0.75)
    .then(dataUrl => {
      _avatarDataUrl = dataUrl;

      const avatarEl = document.getElementById("profileAvatarPreview");
      avatarEl.innerHTML = `
        <img src="${_avatarDataUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">
      `;

      showToast("Image is ready — press Save to keep it ✅");
    })
    .catch(err => {
      console.error("Image compression error:", err);
      showToast("Failed to prepare the image ❌");
    });
});

function compressProfileImage(file, maxSize = 320, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = function (event) {
      const img = new Image();

      img.onload = function () {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };

      img.onerror = reject;
      img.src = event.target.result;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Change password ────────────────────────────────────────────

document.getElementById("changePasswordBtn").addEventListener("click", () => {
  const currentPassword = document.getElementById("currentPassword").value.trim();
  const newPassword     = document.getElementById("newPassword").value.trim();
  const confirmPassword = document.getElementById("confirmPassword").value.trim();

  if (!currentPassword || !newPassword || !confirmPassword) {
    showToast("Fill in all password fields ⚠️");
    return;
  }

  if (newPassword !== confirmPassword) {
    showToast("The new passwords do not match ❌");
    return;
  }

  if (newPassword.length < 6) {
    showToast("Password must be at least 6 characters ❌");
    return;
  }

  const params = new URLSearchParams();
  params.append("current_password", currentPassword);
  params.append("new_password",     newPassword);
  params.append("confirm_password", confirmPassword);

  fetch("/mazad/api/change-password.php", {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    params.toString()
  })
    .then(res => res.json())
    .then(data => {
      if (data.status === "success") {
        document.getElementById("currentPassword").value = "";
        document.getElementById("newPassword").value     = "";
        document.getElementById("confirmPassword").value = "";
        showToast("Password updated successfully ✅");
      } else {
        showToast((data.message || "Failed to update password") + " ❌");
      }
    })
    .catch(() => showToast("There is a server problem ❌"));
});

// ── Favorites tab ──────────────────────────────────────────────

function loadFavorites() {
  const grid = document.getElementById("favoritesGrid");
  if (!grid) return;

  grid.innerHTML = `
    <div class="empty-state-box">
      <div class="empty-icon">⏳</div>
      <h4>Loading...</h4>
      <p>Loading favorites.</p>
    </div>
  `;

  fetch("/mazad/api/get-favorites.php", { cache: "no-store" })
    .then(r => r.json())
    .then(data => {
      if (data.status !== "success") {
        grid.innerHTML = `
          <div class="empty-state-box">
            <div class="empty-icon">⚠️</div>
            <h4>Could not load favorites</h4>
            <p>${escapeProfileHtml(data.message || "An error occurred while loading")}</p>
          </div>
        `;
        return;
      }

      const favorites = Array.isArray(data.data) ? data.data : [];

      if (!favorites.length) {
        grid.innerHTML = `
          <div class="empty-state-box">
            <div class="empty-icon">♡</div>
            <h4>No favorites yet</h4>
            <p>When you like any product from the pages, it will appear here right away.</p>
          </div>
        `;
        return;
      }

      grid.innerHTML = favorites.map(a => {
        const isImportant = Number(a.featured) === 1 || a.featured === true || a.featured === "1";
      const isLive = String(a.auction_type || a.mode || "").toLowerCase() === "live";
        const typeLabel = isLive ? "LIVE" : "NORMAL";
        const category = String(a.category || "auction").toLowerCase();

        const imageUrl =
          Array.isArray(a.images) && a.images.length
            ? a.images[0]
            : (a.image || a.imageUrl || "");

        const auctionId = a.auction_id || a.id;

        return `
          <div class="my-auction-pro-card favorite-card-pro">
            <div class="my-auction-img">
              ${
                imageUrl
                  ? `<img src="${escapeProfileHtml(imageUrl)}" alt="${escapeProfileHtml(a.title || "Auction")}">`
                  : `<div class="my-auction-fallback">${getMyAuctionEmoji(category)}</div>`
              }

              <div class="my-auction-badges">
                ${isImportant ? `<span class="my-badge important">IMPORTANT</span>` : ""}
                <span class="my-badge ${isLive ? "live" : "normal"}">${typeLabel}</span>
              </div>

              <span class="my-auction-category">${escapeProfileHtml(category)}</span>

              <div class="my-auction-overlay">
                <div class="my-auction-info">
                  <h4>${escapeProfileHtml(a.title || "Untitled Auction")}</h4>
                  <p>by ${escapeProfileHtml(a.seller || "Unknown")}</p>
                </div>

                <div class="my-auction-action">
                  <strong>$${Number(a.current_price || a.start_price || 0).toLocaleString()}</strong>
                 <button class="btn btn-primary" onclick="window.location.href='${isLive ? "live-auction.html" : "auction-details.html"}?id=${auctionId}'">
  View
</button>
                </div>
              </div>
            </div>

           
        `;
      }).join("");
    })
    .catch(err => {
      console.error("loadFavorites error:", err);
      grid.innerHTML = `
        <div class="empty-state-box">
          <div class="empty-icon">⚠️</div>
          <h4>Network error</h4>
          <p>Could not load favorites.</p>
        </div>
      `;
    });
}

// Load favorites when tab is clicked
document.querySelectorAll('.profile-tab').forEach(tab => {
  if (tab.dataset.tab === 'favoritesPanel') {
    tab.addEventListener('click', loadFavorites);
  }
});

function calculateAge(birthDate) {
  if (!birthDate) return "";

  const dob = new Date(birthDate);
  if (isNaN(dob.getTime())) return "";

  const today = new Date();

  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  const dayDiff = today.getDate() - dob.getDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age--;
  }

  return age > 0 ? age : "";
}
// ── My Auctions tab ─────────────────────────────────────────────

function getMyAuctionStatusInfo(status) {
  const clean = String(status || "pending").trim().toLowerCase();

  const map = {
    pending: {
      label: "Pending Review",
      text: "Waiting for admin approval",
      className: "pending"
    },
    approved: {
      label: "Approved",
      text: "Your auction is approved and visible to users",
      className: "approved"
    },
    rejected: {
      label: "Rejected",
      text: "The auction was rejected by admin",
      className: "rejected"
    },
    suspended: {
      label: "Suspended",
      text: "The auction was temporarily suspended",
      className: "suspended"
    },
    ended: {
      label: "Ended",
      text: "This auction has ended",
      className: "ended"
    }
  };

  return map[clean] || {
    label: clean || "Unknown",
    text: "Unknown status",
    className: "unknown"
  };
}

function escapeProfileHtml(value) {
  const div = document.createElement("div");
  div.textContent = value || "";
  return div.innerHTML;
}

function loadMyAuctions() {
  const grid = document.getElementById("myAuctionsGrid");
  if (!grid) return;

  grid.innerHTML = `
    <div class="empty-state-box">
      <div class="empty-icon">⏳</div>
      <h4>Loading...</h4>
      <p>Loading your auctions.</p>
    </div>
  `;

  fetch("/mazad/api/get-my-auctions.php", { cache: "no-store" })
    .then(res => res.json())
    .then(data => {
      if (data.status !== "success") {
        grid.innerHTML = `
          <div class="empty-state-box">
            <div class="empty-icon">⚠️</div>
            <h4>Could not load auctions</h4>
            <p>${escapeProfileHtml(data.message || "An error occurred while loading")}</p>
          </div>
        `;
        return;
      }

      const auctions = Array.isArray(data.data) ? data.data : [];

      if (!auctions.length) {
        grid.innerHTML = `
          <div class="empty-state-box">
            <div class="empty-icon">📦</div>
            <h4>No auctions yet</h4>
            <p>When you add an auction, it will appear here with its status.</p>
          </div>
        `;
        return;
      }

     grid.innerHTML = auctions.map(a => {
  const statusInfo = getMyAuctionStatusInfo(a.status);
  const cleanStatus = String(a.status || "").trim().toLowerCase();
  const isApproved = cleanStatus === "approved";
  const isImportant = Number(a.featured) === 1;
  const isLive = String(a.auction_type || "").toLowerCase() === "live";

  const imageUrl = a.image || "";
  const category = String(a.category || "auction").toLowerCase();
  const typeLabel = isLive ? "LIVE" : "NORMAL";

  return `
    <div class="my-auction-pro-card ${!isApproved ? "not-approved" : ""}">
      <div class="my-auction-img">
        ${
          imageUrl
            ? `<img src="${escapeProfileHtml(imageUrl)}" alt="${escapeProfileHtml(a.title || "Auction")}">`
            : `<div class="my-auction-fallback">${getMyAuctionEmoji(category)}</div>`
        }

        <div class="my-auction-badges">
          ${isImportant ? `<span class="my-badge important">IMPORTANT</span>` : ""}
          <span class="my-badge ${isLive ? "live" : "normal"}">${typeLabel}</span>
        </div>

        <span class="my-auction-category">${escapeProfileHtml(category)}</span>

        <div class="my-auction-overlay">
          <div class="my-auction-info">
            <h4>${escapeProfileHtml(a.title || "Untitled Auction")}</h4>
            <p>by You</p>
          </div>

          <div class="my-auction-action">
            <strong>$${Number(a.current_price || a.start_price || 0).toLocaleString()}</strong>
            ${
              isApproved
              ? `<button class="btn btn-primary" onclick="window.location.href='${isLive ? "live-auction.html" : "auction-details.html"}?id=${a.id}'">View</button>`
                : `<button class="btn btn-secondary" disabled>Waiting</button>`
            }
          </div>
        </div>
      </div>

      <div class="my-auction-status-box ${statusInfo.className}">
        <div>
          <strong>${statusInfo.label}</strong>
          <span>${statusInfo.text}</span>
        </div>
        <small>Created ${escapeProfileHtml(String(a.created_at || "").slice(0, 10))}</small>
      </div>
    </div>
  `;
}).join("");
    })
    .catch(err => {
      console.error("loadMyAuctions error:", err);
      grid.innerHTML = `
        <div class="empty-state-box">
          <div class="empty-icon">⚠️</div>
          <h4>Network error</h4>
          <p>Could not load your auctions.</p>
        </div>
      `;
    });
}

document.querySelectorAll(".profile-tab").forEach(tab => {
  if (tab.dataset.tab === "myAuctionsPanel") {
    tab.addEventListener("click", loadMyAuctions);
  }
});
function getMyAuctionEmoji(category) {
  const map = {
    fashion: "👗",
    electronics: "💻",
    art: "🖼️",
    cars: "🚗",
    watch: "⌚",
    home: "🏡"
  };

  return map[category] || "💠";
}
// ── Real Friends System ─────────────────────────────────────────

function friendAvatarHtml(user) {
  const img = user.profile_image || user.sender_image || "";
  const name = user.name || user.sender_name || "User";
  const initial = String(name).charAt(0).toUpperCase() || "U";

  if (img && String(img).startsWith("data:image/")) {
    return `<img src="${img}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
  }

  return escapeProfileHtml(initial);
}

function renderFriendUserCard(user) {
  const status = user.online_status === "online" ? "online-text" : "offline-text";
  const statusText = user.online_status === "online" ? "Online" : "Offline";

  let actionHtml = "";

  if (user.friendship_status === "pending") {
    const sentByMe = Number(user.sender_id) !== Number(user.id);
    actionHtml = `<button class="btn btn-secondary friend-btn" disabled>${sentByMe ? "Request Sent" : "Pending"}</button>`;
  } else if (user.friendship_status === "accepted") {
    actionHtml = `<button class="btn btn-secondary friend-btn" disabled>Friends</button>`;
  } else {
    actionHtml = `<button class="btn btn-primary friend-btn send-friend-btn" data-id="${user.id}">Add Friend</button>`;
  }

  return `
    <div class="friend-card">
      <div class="friend-avatar">${friendAvatarHtml(user)}</div>
      <div class="friend-info">
        <strong>${escapeProfileHtml(user.name || "User")}</strong>
        <span>${escapeProfileHtml(user.email || "")}</span>
        <span class="${status}">${statusText}</span>
      </div>
      ${actionHtml}
    </div>
  `;
}

function searchFriendsUsers() {
  const input = document.getElementById("friendSearchInput");
  const results = document.getElementById("friendSearchResults");
  if (!input || !results) return;

  const q = input.value.trim();

  if (q.length < 2) {
    results.innerHTML = `
      <div class="empty-state-box">
        <div class="empty-icon">🔎</div>
        <h4>Type at least 2 letters</h4>
        <p>Type at least two letters to search.</p>
      </div>
    `;
    return;
  }

  results.innerHTML = `
    <div class="empty-state-box">
      <div class="empty-icon">⏳</div>
      <h4>Searching...</h4>
      <p>Searching.</p>
    </div>
  `;

  fetch(`/mazad/api/search-users.php?q=${encodeURIComponent(q)}`, { cache: "no-store" })
    .then(r => r.json())
    .then(data => {
      if (data.status !== "success") {
        results.innerHTML = `<div class="empty-state-box"><div class="empty-icon">⚠️</div><h4>Error</h4><p>${escapeProfileHtml(data.message || "Search failed")}</p></div>`;
        return;
      }

      const users = Array.isArray(data.data) ? data.data : [];

      if (!users.length) {
        results.innerHTML = `<div class="empty-state-box"><div class="empty-icon">🙁</div><h4>No users found</h4><p>No users matched this search.</p></div>`;
        return;
      }

      results.innerHTML = users.map(renderFriendUserCard).join("");

      results.querySelectorAll(".send-friend-btn").forEach(btn => {
        btn.addEventListener("click", () => sendFriendRequest(btn.dataset.id));
      });
    })
    .catch(err => {
      console.error("searchFriendsUsers error:", err);
      results.innerHTML = `<div class="empty-state-box"><div class="empty-icon">⚠️</div><h4>Network error</h4><p>Could not search.</p></div>`;
    });
}

function sendFriendRequest(receiverId) {
  const formData = new URLSearchParams();
  formData.append("receiver_id", receiverId);

  fetch("/mazad/api/send-friend-request.php", {
    method: "POST",
    body: formData
  })
    .then(r => r.json())
    .then(data => {
      if (data.status === "success") {
        showToast("Friend request sent ✅");
        searchFriendsUsers();
      } else {
        showToast((data.message || "Failed to send request") + " ❌");
      }
    })
    .catch(() => showToast("Connection problem while sending the request ❌"));
}

function loadFriendRequests() {
  const grid = document.getElementById("friendRequestsGrid");
  if (!grid) return;

  fetch("/mazad/api/get-friend-requests.php", { cache: "no-store" })
    .then(r => r.json())
    .then(data => {
      const requests = data.status === "success" && Array.isArray(data.data) ? data.data : [];

      if (!requests.length) {
        grid.innerHTML = `<div class="empty-state-box"><div class="empty-icon">📩</div><h4>No requests</h4><p>There are no friend requests right now.</p></div>`;
        return;
      }

      grid.innerHTML = requests.map(req => `
        <div class="friend-card">
          <div class="friend-avatar">${friendAvatarHtml(req)}</div>
          <div class="friend-info">
            <strong>${escapeProfileHtml(req.sender_name || "User")}</strong>
            <span>${escapeProfileHtml(req.sender_email || "")}</span>
            <span class="online-text">Sent you a request</span>
          </div>
          <div style="display:flex;gap:.5rem;flex-wrap:wrap;">
            <button class="btn btn-primary accept-friend-btn" data-id="${req.id}">Accept</button>
            <button class="btn btn-secondary reject-friend-btn" data-id="${req.id}">Reject</button>
          </div>
        </div>
      `).join("");

      grid.querySelectorAll(".accept-friend-btn").forEach(btn => {
        btn.addEventListener("click", () => respondFriendRequest(btn.dataset.id, "accept"));
      });

      grid.querySelectorAll(".reject-friend-btn").forEach(btn => {
        btn.addEventListener("click", () => respondFriendRequest(btn.dataset.id, "reject"));
      });
    });
}

function respondFriendRequest(requestId, action) {
  const formData = new URLSearchParams();
  formData.append("request_id", requestId);
  formData.append("action", action);

  fetch("/mazad/api/respond-friend-request.php", {
    method: "POST",
    body: formData
  })
    .then(r => r.json())
    .then(data => {
      if (data.status === "success") {
        showToast(action === "accept" ? "Request accepted ✅" : "Request rejected");
        loadFriendRequests();
        loadFriendsList();
      } else {
        showToast((data.message || "Failed to complete the action") + " ❌");
      }
    })
    .catch(() => showToast("Connection problem ❌"));
}

function loadFriendsList() {
  const grid = document.getElementById("friendsGrid");
  if (!grid) return;

  fetch("/mazad/api/get-friends.php", { cache: "no-store" })
    .then(r => r.json())
    .then(data => {
      const friends = data.status === "success" && Array.isArray(data.data) ? data.data : [];

      if (!friends.length) {
        grid.innerHTML = `<div class="empty-state-box"><div class="empty-icon">👥</div><h4>No friends yet</h4><p>Accepted friends will appear here.</p></div>`;
        return;
      }

   grid.innerHTML = friends.map(friend => `
  <div class="friend-card">
    <div class="friend-avatar">${friendAvatarHtml(friend)}</div>

    <div class="friend-info">
      <strong>${escapeProfileHtml(friend.name || "User")}</strong>
      <span>${escapeProfileHtml(friend.email || "")}</span>
      <span class="${friend.online_status === "online" ? "online-text" : "offline-text"}">
        ${friend.online_status === "online" ? "Online" : "Offline"}
      </span>
    </div>

    <div style="display:flex;gap:.5rem;flex-wrap:wrap;justify-content:flex-end;">
    <button class="btn btn-primary friend-report-btn" data-id="${friend.id}">
  View Report
</button>

<button class="btn btn-secondary friend-chat-btn" data-id="${friend.id}" data-name="${escapeProfileHtml(friend.name || "User")}">
  Chat
</button>

<button class="btn remove-friend-btn" data-id="${friend.id}">
  Remove
</button>
    </div>
  </div>
`).join("");

grid.querySelectorAll(".friend-report-btn").forEach(btn => {
  btn.addEventListener("click", () => openFriendReport(btn.dataset.id));
});

grid.querySelectorAll(".friend-chat-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    openFriendChat(btn.dataset.id, btn.dataset.name || "Friend");
  });
});

grid.querySelectorAll(".remove-friend-btn").forEach(btn => {
  btn.addEventListener("click", () => removeFriend(btn.dataset.id));
});
    });
}

function loadFriendsPanel() {
  loadFriendRequests();
  loadFriendsList();
}

const friendSearchBtn = document.getElementById("friendSearchBtn");
const friendSearchInput = document.getElementById("friendSearchInput");

if (friendSearchBtn) {
  friendSearchBtn.addEventListener("click", searchFriendsUsers);
}

if (friendSearchInput) {
  friendSearchInput.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      searchFriendsUsers();
    }
  });
}

document.querySelectorAll(".profile-tab").forEach(tab => {
  if (tab.dataset.tab === "friendsPanel") {
    tab.addEventListener("click", loadFriendsPanel);
  }
});
// ── Friend Profile Report ───────────────────────────────────────

function setFriendReportAvatar(friend) {
  const avatar = document.getElementById("friendReportAvatar");
  if (!avatar) return;

  const img = friend.profile_image || "";
  const initial = String(friend.name || "U").charAt(0).toUpperCase();

  if (img && String(img).startsWith("data:image/")) {
    avatar.innerHTML = `<img src="${img}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
  } else {
    avatar.textContent = initial;
  }
}

function openFriendReport(friendId) {
  const modal = document.getElementById("friendReportModal");

  if (!modal) return;

  modal.classList.add("active");

  document.getElementById("friendReportName").textContent = "Loading...";
  document.getElementById("friendReportEmail").textContent = "";
  document.getElementById("friendReportStatus").textContent = "";
  document.getElementById("friendReportRank").textContent = "--";
  document.getElementById("friendReportTokens").textContent = "0";
  document.getElementById("friendReportAuctions").textContent = "0";
  document.getElementById("friendReportApprovedAuctions").textContent = "0";
  document.getElementById("friendReportBids").textContent = "0";
  document.getElementById("friendReportLastSeen").textContent = "--";

  fetch(`/mazad/api/get-friend-profile.php?friend_id=${encodeURIComponent(friendId)}`, {
    cache: "no-store"
  })
    .then(r => r.json())
    .then(data => {
      if (data.status !== "success") {
        showToast((data.message || "Could not load friend report") + " ❌");
        closeFriendReport();
        return;
      }

      const friend = data.friend;

      setFriendReportAvatar(friend);

      document.getElementById("friendReportName").textContent = friend.name || "User";
      document.getElementById("friendReportEmail").textContent = friend.email || "";
      document.getElementById("friendReportStatus").textContent =
        friend.online_status === "online" ? "● Online" : "○ Offline";

      document.getElementById("friendReportStatus").className =
        friend.online_status === "online"
          ? "friend-report-status online-text"
          : "friend-report-status offline-text";

      document.getElementById("friendReportRank").textContent = friend.rank_title || "Bronze";
      document.getElementById("friendReportTokens").textContent = Number(friend.tokens || 0).toLocaleString();
      document.getElementById("friendReportAuctions").textContent = Number(friend.auctions_count || 0);
      document.getElementById("friendReportApprovedAuctions").textContent = Number(friend.approved_auctions_count || 0);
      document.getElementById("friendReportBids").textContent = Number(friend.bids_count || 0);
      document.getElementById("friendReportLastSeen").textContent = friend.last_seen || "--";

     const chatBtn = document.getElementById("friendReportChatBtn");
if (chatBtn) {
  chatBtn.onclick = () => {
    closeFriendReport();
    openFriendChat(friend.id, friend.name || "Friend");
  };
}
    })
    .catch(err => {
      console.error("openFriendReport error:", err);
      showToast("Network error loading friend report ❌");
      closeFriendReport();
    });
}

function closeFriendReport() {
  const modal = document.getElementById("friendReportModal");
  if (modal) modal.classList.remove("active");
}

const closeFriendReportBtn = document.getElementById("closeFriendReportBtn");
if (closeFriendReportBtn) {
  closeFriendReportBtn.addEventListener("click", closeFriendReport);
}

const friendReportModal = document.getElementById("friendReportModal");
if (friendReportModal) {
  friendReportModal.addEventListener("click", e => {
    if (e.target === friendReportModal) {
      closeFriendReport();
    }
  });
}
function removeFriend(friendId) {
  const formData = new URLSearchParams();
  formData.append("friend_id", friendId);

  fetch("/mazad/api/remove-friend.php", {
    method: "POST",
    body: formData
  })
    .then(r => r.json())
    .then(data => {
      if (data.status === "success") {
        showToast("Friend removed ✅");
        loadFriendsList();
      } else {
        showToast((data.message || "Failed to remove friend") + " ❌");
      }
    })
    .catch(() => showToast("Connection problem while removing the friend ❌"));
}
// ── Friend Chat Modal ───────────────────────────────────────────

let currentChatFriendId = null;
let currentChatFriendName = "";
let chatRefreshTimer = null;

function openFriendChat(friendId, friendName) {
  currentChatFriendId = friendId;
  currentChatFriendName = friendName || "Friend";

  const modal = document.getElementById("friendChatModal");
  const nameEl = document.getElementById("chatFriendName");
  const statusEl = document.getElementById("chatFriendStatus");
  const input = document.getElementById("friendChatInput");

  if (!modal) {
    showToast("Chat modal not found ❌");
    return;
  }

  if (nameEl) nameEl.textContent = currentChatFriendName;
  if (statusEl) statusEl.textContent = "Messages are saved in your account";
  if (input) input.value = "";

  modal.classList.add("active");

  loadFriendChatMessages();

  clearInterval(chatRefreshTimer);
  chatRefreshTimer = setInterval(loadFriendChatMessages, 5000);
}

function closeFriendChat() {
  const modal = document.getElementById("friendChatModal");
  if (modal) modal.classList.remove("active");

  currentChatFriendId = null;
  currentChatFriendName = "";

  clearInterval(chatRefreshTimer);
  chatRefreshTimer = null;
}

function loadFriendChatMessages() {
  if (!currentChatFriendId) return;

  const box = document.getElementById("friendChatMessages");
  if (!box) return;

  fetch(`/mazad/api/get-chat-messages.php?friend_id=${encodeURIComponent(currentChatFriendId)}`, {
    cache: "no-store"
  })
    .then(r => r.json())
    .then(data => {
      if (data.status !== "success") {
        box.innerHTML = `
          <div class="empty-state-box">
            <div class="empty-icon">⚠️</div>
            <h4>Could not load chat</h4>
            <p>${escapeProfileHtml(data.message || "An error occurred while loading")}</p>
          </div>
        `;
        return;
      }

      const messages = Array.isArray(data.data) ? data.data : [];

      if (!messages.length) {
        box.innerHTML = `
          <div class="empty-state-box">
            <div class="empty-icon">💬</div>
            <h4>No messages yet</h4>
            <p>Start the conversation now.</p>
          </div>
        `;
        return;
      }

      box.innerHTML = messages.map(msg => `
        <div class="chat-message ${msg.mine ? "mine" : "theirs"}">
          <div class="chat-bubble">
            <p>${escapeProfileHtml(msg.message)}</p>
            <span>${escapeProfileHtml(msg.created_at || "")}</span>
          </div>
        </div>
      `).join("");

      box.scrollTop = box.scrollHeight;
    })
    .catch(err => {
      console.error("loadFriendChatMessages error:", err);
      box.innerHTML = `
        <div class="empty-state-box">
          <div class="empty-icon">⚠️</div>
          <h4>Network error</h4>
          <p>Could not load messages.</p>
        </div>
      `;
    });
}

function sendFriendChatMessage() {
  const input = document.getElementById("friendChatInput");
  if (!input || !currentChatFriendId) return;

  const message = input.value.trim();
  if (!message) return;

  const formData = new URLSearchParams();
  formData.append("receiver_id", currentChatFriendId);
  formData.append("message", message);

  input.disabled = true;

  fetch("/mazad/api/send-chat-message.php", {
    method: "POST",
    body: formData
  })
    .then(r => r.json())
    .then(data => {
      if (data.status === "success") {
        input.value = "";
        loadFriendChatMessages();
      } else {
        showToast((data.message || "Failed to send message") + " ❌");
      }
    })
    .catch(() => showToast("Connection problem while sending the message ❌"))
    .finally(() => {
      input.disabled = false;
      input.focus();
    });
}

const sendFriendChatBtn = document.getElementById("sendFriendChatBtn");
if (sendFriendChatBtn) {
  sendFriendChatBtn.addEventListener("click", sendFriendChatMessage);
}

const friendChatInput = document.getElementById("friendChatInput");
if (friendChatInput) {
  friendChatInput.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendFriendChatMessage();
    }
  });
}

const closeFriendChatBtn = document.getElementById("closeFriendChatBtn");
if (closeFriendChatBtn) {
  closeFriendChatBtn.addEventListener("click", closeFriendChat);
}

const friendChatModal = document.getElementById("friendChatModal");
if (friendChatModal) {
  friendChatModal.addEventListener("click", e => {
    if (e.target === friendChatModal) {
      closeFriendChat();
    }
  });
}
