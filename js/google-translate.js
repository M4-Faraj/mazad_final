// js/google-translate.js
(function () {
  const CONTAINER_ID = 'google_translate_element';
  function resetGoogleTranslateCookie() {
  document.cookie = "googtrans=/en/en;path=/";
}
  const BUTTON_ID = 'gtToggle';

  let currentLang = 'en'; // اللغة الحالية

  function ensureContainer() {
    let container = document.getElementById(CONTAINER_ID);
    if (!container) {
      container = document.createElement('div');
      container.id = CONTAINER_ID;
      container.style.display = 'none';
      document.body.appendChild(container);
    }
  }

  function getButton() {
    return document.getElementById(BUTTON_ID);
  }

  function applyBtnLabel() {
    const btn = getButton();
    if (!btn) return;
    btn.textContent = currentLang === 'en' ? 'AR' : 'EN';
  }

  function setGoogleTranslateLang(lang) {
    const select = document.querySelector('.goog-te-combo');
    if (!select) return false;

    select.value = lang;
    select.dispatchEvent(new Event('change'));
    return true;
  }

  function toggleLanguage() {
    currentLang = currentLang === 'en' ? 'ar' : 'en';

    let tries = 0;
    const timer = setInterval(() => {
      tries++;
      const ok = setGoogleTranslateLang(currentLang);

      if (ok || tries > 40) {
        clearInterval(timer);
        applyBtnLabel();
      }
    }, 150);
  }

  function bindToggleButton() {
    const btn = getButton();
    if (!btn) return;

    btn.addEventListener('click', toggleLanguage);
  }

  function loadGoogleScript() {
    if (window.googleTranslateElementInitLoaded) return;
    window.googleTranslateElementInitLoaded = true;

    window.googleTranslateElementInit = function () {
      ensureContainer();

      new google.translate.TranslateElement(
        {
          pageLanguage: 'en',
          includedLanguages: 'en,ar',
          autoDisplay: false
        },
        CONTAINER_ID
      );
    };

    const s = document.createElement('script');
    s.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    s.async = true;
    document.head.appendChild(s);
  }

  function initGoogleTranslate() {
  resetGoogleTranslateCookie(); // 🔥 أهم سطر

  ensureContainer();
  bindToggleButton();
  applyBtnLabel();
  loadGoogleScript();
}

  window.initGoogleTranslate = initGoogleTranslate;
})();