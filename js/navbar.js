// js/navbar.js
// Shared, constant navbar injected into every storefront page.
// Usage: place <div id="site-navbar"></div> where the header should appear,
// then <script src="js/navbar.js"></script> right after it.
// The script runs synchronously and replaces the placeholder with the <header>.
(function () {
  var slot = document.getElementById('site-navbar');
  if (!slot) return;

  // Category pages — current file gets the dropdown highlighted.
  var CATEGORIES = ['fashion', 'electronics', 'art', 'cars', 'watches', 'home'];

  // Current page file name without extension, e.g. "live-auction".
  var page = (location.pathname.split('/').pop() || 'index.html')
    .replace(/\.html?$/i, '')
    .toLowerCase();

  if (!page) page = 'index';

  var isCategory = CATEGORIES.indexOf(page) !== -1;

  var PAGE_LABELS = {
    index: 'Home',
    fashion: 'Fashion',
    electronics: 'Electronics',
    art: 'Art',
    cars: 'Cars',
    watches: 'Watches',
    home: 'Home & Garden',
    'live-auction': 'Live Auction',
    'seller-auctions': 'Sell',
    chatbot: 'Assistant',
    profile: 'Profile',
    details: 'Auction Details',
    'auction-details': 'Auction Details',
    'product-details': 'Auction Details',
    favorites: 'Favorites',
    admin: 'Admin Dashboard',
    employee: 'Employee Dashboard'
  };

  function on(name) {
    return page === name ? ' active' : '';
  }

  function labelFor(name) {
    return PAGE_LABELS[String(name || '').toLowerCase()] || String(name || '')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  function getSameProjectReferrer() {
    if (!document.referrer) return null;

    try {
      var ref = new URL(document.referrer);
      var here = new URL(location.href);

      if (ref.origin !== here.origin) return null;
      if (!ref.pathname.toLowerCase().includes('/mazad/')) return null;

      var refFile = (ref.pathname.split('/').pop() || 'index.html')
        .replace(/\.html?$/i, '')
        .toLowerCase();

      if (!refFile) refFile = 'index';
      if (refFile === page) return null;

      return {
        page: refFile,
        href: ref.pathname.split('/').pop() || 'index.html'
      };
    } catch (err) {
      return null;
    }
  }

  function buildBreadcrumb() {
    if (page === 'index') {
      return '';
    }

    var currentLabel = labelFor(page);

    if (isCategory) {
      return '<div class="breadcrumbs" aria-label="Breadcrumb">' +
        '<a href="index.html">Home</a>' +
        '<span>›</span>' +
        '<span>Categories</span>' +
        '<span>›</span>' +
        '<span>' + currentLabel + '</span>' +
      '</div>';
    }

    return '<div class="breadcrumbs" aria-label="Breadcrumb">' +
      '<a href="index.html">Home</a>' +
      '<span>›</span>' +
      '<span>' + currentLabel + '</span>' +
    '</div>';
  }

  function insertBreadcrumb() {
    document.querySelectorAll('.page-breadcrumb').forEach(function (oldCrumb) {
      oldCrumb.remove();
    });

    if (document.querySelector('.breadcrumbs')) {
      return;
    }

    var target = document.querySelector('main') ||
      document.querySelector('.page-wrap') ||
      document.querySelector('.container');
    var crumb = buildBreadcrumb();
    var isGridMain = target &&
      target.tagName === 'MAIN' &&
      (target.classList.contains('profile-dashboard') ||
        window.getComputedStyle(target).display.indexOf('grid') !== -1);

    if (isGridMain && crumb) {
      target.insertAdjacentHTML('beforebegin', crumb);
      return;
    }

    if (target && crumb) {
      target.insertAdjacentHTML('afterbegin', crumb);
    }
  }

  function initSmartHeader() {
    var header = document.querySelector('header');
    if (!header) return;

    var lastY = window.scrollY || 0;

    function setHeaderHeight() {
      document.body.style.setProperty('--smart-header-height', header.offsetHeight + 'px');
    }

    function hasOpenMenu() {
      return !!(
        document.querySelector('.header-dropdown.open') ||
        document.querySelector('.header-notif-dropdown.open') ||
        document.querySelector('.nav-cat-dropdown:hover')
      );
    }

    function showHeader() {
      document.body.classList.remove('header-hidden');
      document.body.classList.add('header-visible');
    }

    function hideHeader() {
      if (hasOpenMenu()) {
        showHeader();
        return;
      }

      document.body.classList.remove('header-visible');
      document.body.classList.add('header-hidden');
    }

    document.body.classList.add('has-smart-header', 'header-visible');
    setHeaderHeight();
    window.addEventListener('resize', setHeaderHeight);

    window.addEventListener('scroll', function () {
      var currentY = window.scrollY || 0;

      if (currentY <= 120 || currentY < lastY || hasOpenMenu()) {
        showHeader();
      } else if (currentY > lastY) {
        hideHeader();
      }

      lastY = currentY;
    }, { passive: true });

    document.addEventListener('mousemove', function (e) {
      if (e.clientY < 80 || hasOpenMenu()) {
        showHeader();
      }
    });

    document.addEventListener('click', function () {
      setTimeout(function () {
        if (hasOpenMenu()) showHeader();
      }, 0);
    });
  }

  // dir="ltr" forces a consistent left-to-right navbar even on RTL pages.
  var markup =
    '<header dir="ltr">' +

      '<div class="header-left">' +
        '<div class="logo-slot header-logo-left">' +
          '<img src="logo (2).png" alt="Mazad Logo">' +
        '</div>' +
        '<div class="brand-block">' +
          '<span class="brand-kicker">Online Auction Platform</span>' +
        '</div>' +
      '</div>' +

      '<div id="google_translate_element" style="display:none;"></div>' +

      '<div class="header-center">' +
        '<nav>' +
          '<a href="index.html" class="' + (page === 'index' ? 'active' : '') + '">Home</a>' +

          '<div class="nav-cat-dropdown">' +
            '<button class="nav-cat-btn' + (isCategory ? ' active' : '') + '" type="button">Categories &#9662;</button>' +
            '<div class="nav-cat-menu">' +
              '<a href="fashion.html" class="' + (page === 'fashion' ? 'active' : '') + '">Fashion</a>' +
              '<a href="electronics.html" class="' + (page === 'electronics' ? 'active' : '') + '">Electronics</a>' +
              '<a href="art.html" class="' + (page === 'art' ? 'active' : '') + '">Art</a>' +
              '<a href="cars.html" class="' + (page === 'cars' ? 'active' : '') + '">Cars</a>' +
              '<a href="watches.html" class="' + (page === 'watches' ? 'active' : '') + '">Watches</a>' +
              '<a href="home.html" class="' + (page === 'home' ? 'active' : '') + '">Home &amp; Garden</a>' +
            '</div>' +
          '</div>' +

          '<a href="live-auction.html" class="live' + on('live-auction') + '">Live</a>' +
          '<a href="seller-auctions.html" class="' + (page === 'seller-auctions' ? 'active' : '') + '">Sell</a>' +
          '<a href="chatbot.html" class="' + (page === 'chatbot' ? 'active' : '') + '">Assistant</a>' +
          '<a href="profile.html" class="' + (page === 'profile' ? 'active' : '') + '">Profile</a>' +
        '</nav>' +
      '</div>' +

      '<div class="header-right">' +
        '<div class="lang-switch">' +
          '<button id="gtToggle" class="btn btn-secondary" type="button">AR</button>' +
        '</div>' +

        '<div id="userBox"></div>' +

        '<div class="logo-slot header-logo-right">' +
          '<img src="logo (1).png" alt="Mazad Logo">' +
        '</div>' +
      '</div>' +

    '</header>';

  // Replace the placeholder so the final DOM has a real <header> element.
  slot.outerHTML = markup;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      insertBreadcrumb();
      initSmartHeader();
    });
  } else {
    insertBreadcrumb();
    initSmartHeader();
  }
})();
