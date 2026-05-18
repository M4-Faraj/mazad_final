(function () {
  var header = document.querySelector('body > header');
  if (!header) return;

  var lastY = window.scrollY || 0;

  function setHeaderHeight() {
    document.body.style.setProperty('--smart-header-height', header.offsetHeight + 'px');
  }

  function hasOpenMenu() {
    return !!(
      document.querySelector('.admin-profile-dropdown.open') ||
      document.querySelector('.admin-profile-dropdown.show') ||
      document.querySelector('.header-dropdown.open') ||
      document.querySelector('.notif-dropdown.open') ||
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
})();
