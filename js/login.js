document.body.classList.add('auth-loading');

(function setupIntro() {
  const intro = document.getElementById('hammerIntro');
  // Hammer strike timing inside the intro video
  const hammerStrikeTime = 4200;
  let dismissed = false;

  function dismissIntro() {
    if (dismissed) return;
    dismissed = true;

    document.body.classList.remove('auth-loading');
    document.body.classList.add('auth-ready');

    if (intro) {
      intro.classList.add('is-hidden');
      setTimeout(() => {
        if (intro && intro.parentNode) intro.remove();
      }, 700);
    }
  }

  window.addEventListener('load', () => {
    setTimeout(dismissIntro, hammerStrikeTime);
  });

  const skipBtn = document.getElementById('hammerSkipBtn');
  if (skipBtn) {
    skipBtn.addEventListener('click', dismissIntro);
  }
})();

const authStage = document.getElementById('authStage');
    const loginScreen = document.getElementById('loginScreen');
    const registerScreen = document.getElementById('registerScreen');

    const tabLogin = document.getElementById('tabLogin');
    const tabRegister = document.getElementById('tabRegister');

    const inlineGoRegister = document.getElementById('inlineGoRegister');
    const inlineGoLogin = document.getElementById('inlineGoLogin');

    const heroKicker = document.getElementById('heroKicker');
    const heroCopy = document.getElementById('heroCopy');
    const heroTitle = document.getElementById('heroTitle');
    const heroText = document.getElementById('heroText');
    const miniNote = document.getElementById('miniNote');
    const authToast = document.getElementById('authToast');

    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const forgotBtn = document.getElementById('forgotBtn');

    let currentMode = 'login';

    const heroContent = {
      login: {
        kicker: 'Exclusive access experience',
        title: 'WELCOME<br>BACK',
        text: 'Step into a premium auction experience designed with global elegance, speed, clarity, and refinement — an interface that reflects the true identity of MAZAD.',
        note: 'Premium access portal'
      },
      register: {
        kicker: 'Create your premium identity',
        title: 'START<br>STRONG',
        text: 'Create your account in a few simple steps and dive into the world of bidding, selling, and connecting — all within a refined, persuasive interface.',
        note: 'Luxury onboarding experience'
      }
    };

    function showToast(message){
      authToast.textContent = message;
      authToast.classList.add('show');
      clearTimeout(showToast.timer);
      showToast.timer = setTimeout(() => {
        authToast.classList.remove('show');
      }, 2600);
    }

function updateHero(mode){
  if (!heroCopy || !heroKicker || !heroTitle || !heroText || !miniNote) {
    return;
  }

  heroCopy.classList.add('is-changing');

  setTimeout(() => {
    heroKicker.textContent = heroContent[mode].kicker;
    heroTitle.innerHTML = heroContent[mode].title;
    heroText.textContent = heroContent[mode].text;
    miniNote.textContent = heroContent[mode].note;
    heroCopy.classList.remove('is-changing');
  }, 220);
}
    function activateScreen(mode){
      if(mode === currentMode) return;

      const outgoing = currentMode === 'login' ? loginScreen : registerScreen;
      const incoming = mode === 'login' ? loginScreen : registerScreen;

      outgoing.classList.remove('is-active');
      outgoing.classList.remove('is-exit-left', 'is-exit-right');
      outgoing.classList.add(mode === 'login' ? 'is-exit-right' : 'is-exit-left');

      incoming.classList.remove('is-exit-left', 'is-exit-right');
      incoming.style.visibility = 'visible';

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          incoming.classList.add('is-active');
        });
      });

      authStage.classList.remove('is-login', 'is-register');
      authStage.classList.add(mode === 'login' ? 'is-login' : 'is-register');

      tabLogin.classList.toggle('is-active', mode === 'login');
      tabRegister.classList.toggle('is-active', mode === 'register');

      currentMode = mode;
      updateHero(mode);
    }

    tabLogin.addEventListener('click', () => activateScreen('login'));
    tabRegister.addEventListener('click', () => activateScreen('register'));
    inlineGoRegister.addEventListener('click', () => activateScreen('register'));
    inlineGoLogin.addEventListener('click', () => activateScreen('login'));

    const GOOGLE_CLIENT_ID = "PUT_GOOGLE_CLIENT_ID_HERE";
const FACEBOOK_APP_ID = "PUT_FACEBOOK_APP_ID_HERE";

function redirectByRole(user, explicitRedirect) {
  if (explicitRedirect) {
    window.location.href = explicitRedirect;
  } else if (user.role === "admin") {
    window.location.href = "Admin.html";
  } else if (user.role === "employee") {
    window.location.href = "Employee.html";
  } else {
    window.location.href = "index.html";
  }
}

/* =========================
   GOOGLE LOGIN
========================= */

window.addEventListener("load", () => {
  if (window.google && google.accounts && google.accounts.id) {
    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleCredential
    });
  }
});

function startGoogleLogin() {
  if (!window.google || !google.accounts || !google.accounts.id) {
    showToast("Google login is still loading. Try again in a second.");
    return;
  }

  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: handleGoogleCredential
  });

  google.accounts.id.prompt();
}

function handleGoogleCredential(response) {
  fetch("api/social-login.php", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      provider: "google",
      credential: response.credential
    }).toString()
  })
  .then(res => res.json())
  .then(data => {
    if (data.status === "success") {
      localStorage.setItem("mazadUser", JSON.stringify(data.user));
      showToast("Signed in with Google");

      setTimeout(() => {
        redirectByRole(data.user);
      }, 900);
    } else {
      showToast(data.message || "Google sign-in failed");
    }
  })
  .catch(() => {
    showToast("Server connection error");
  });
}

document.getElementById("googleLoginBtn")?.addEventListener("click", startGoogleLogin);
document.getElementById("googleRegisterBtn")?.addEventListener("click", startGoogleLogin);


/* =========================
   FACEBOOK LOGIN
========================= */

window.fbAsyncInit = function() {
  FB.init({
    appId: FACEBOOK_APP_ID,
    cookie: true,
    xfbml: false,
    version: "v21.0"
  });
};

function startFacebookLogin() {
  if (!window.FB) {
    showToast("Facebook login is still loading. Try again.");
    return;
  }

  FB.login(function(response) {
    if (!response.authResponse) {
      showToast("Facebook sign-in cancelled");
      return;
    }

    const accessToken = response.authResponse.accessToken;

    fetch("api/social-login.php", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        provider: "facebook",
        access_token: accessToken
      }).toString()
    })
    .then(res => res.json())
    .then(data => {
      if (data.status === "success") {
        localStorage.setItem("mazadUser", JSON.stringify(data.user));
        showToast("Signed in with Facebook");

        setTimeout(() => {
          redirectByRole(data.user);
        }, 900);
      } else {
        showToast(data.message || "Facebook sign-in failed");
      }
    })
    .catch(() => {
      showToast("Server connection error");
    });

  }, { scope: "public_profile,email" });
}

document.getElementById("facebookLoginBtn")?.addEventListener("click", startFacebookLogin);
document.getElementById("facebookRegisterBtn")?.addEventListener("click", startFacebookLogin);

    forgotBtn.addEventListener('click', () => {
  window.location.href = 'forgot-password.html';
});

    function clearFieldState(fieldWrap){
      fieldWrap.classList.remove('is-error', 'shake');
      const err = fieldWrap.querySelector('.field-error');
      if(err) err.textContent = '';
    }

    function setFieldError(fieldWrap, message){
      fieldWrap.classList.add('is-error', 'shake');
      const err = fieldWrap.querySelector('.field-error');
      if(err) err.textContent = message;
      setTimeout(() => fieldWrap.classList.remove('shake'), 350);
    }

    function validateEmail(value){
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }

    function validateLogin(){
      let ok = true;

      const emailWrap = document.querySelector('[data-field="loginEmail"]');
      const passWrap = document.querySelector('[data-field="loginPassword"]');
      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value.trim();

      [emailWrap, passWrap].forEach(clearFieldState);

      if(!email){
        setFieldError(emailWrap, 'Please enter your email');
        ok = false;
      } else if(!validateEmail(email)){
        setFieldError(emailWrap, 'Invalid email format');
        ok = false;
      }

      if(!password){
        setFieldError(passWrap, 'Please enter your password');
        ok = false;
      } else if(password.length < 6){
        setFieldError(passWrap, 'Password is too short');
        ok = false;
      }

      return ok;
    }

    function validateRegister(){
      let ok = true;

      const checks = [
        { key:'firstName', label:'First name', test:v => v.length >= 2, msg:'Enter a valid first name' },
        { key:'middleName', label:'Middle name', test:v => v.length === 0 || v.length >= 2, msg:'Enter a valid middle name or leave it empty' },
        { key:'lastName', label:'Last name', test:v => v.length >= 2, msg:'Enter a valid last name' },
        { key:'phone', label:'Phone', test:v => v.length >= 8, msg:'Enter a valid phone number' },
        { key:'birthdate', label:'Date of birth', test:v => !!v, msg:'Pick your date of birth' },
        { key:'registerEmail', label:'Email', test:v => validateEmail(v), msg:'Enter a valid email address' },
        { key:'registerPassword', label:'Password', test:v => v.length >= 8, msg:'Password must be at least 8 characters' }
      ];

      checks.forEach(item => {
        const wrap = document.querySelector(`[data-field="${item.key}"]`);
        clearFieldState(wrap);
        const value = document.getElementById(item.key).value.trim();

        if(!item.test(value)){
          setFieldError(wrap, item.msg);
          ok = false;
        }
      });

      return ok;
    }

loginBtn.addEventListener('click', () => {
  if(validateLogin()){

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    fetch('api/login.php', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`
    })
   .then(res => res.json())
.then(data => {

  if(data.status === "success"){

    // 🔥 أهم سطر
    localStorage.setItem("mazadUser", JSON.stringify(data.user));

    showToast("Signed in successfully");

  setTimeout(() => {
  redirectByRole(data.user, data.redirect);
}, 1000);




  } else {
    showToast(data.message || "Email or password incorrect");
  }

})
    .catch(err => {
      showToast("Server connection error");
    });

  } else {
    showToast('Please complete the login fields correctly.');
  }
});

 registerBtn.addEventListener('click', () => {
  if (validateRegister()) {

    const firstName = document.getElementById('firstName').value.trim();
    const middleName = document.getElementById('middleName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const phone = document.getElementById('phone').value.trim();

    const name = [firstName, middleName, lastName].filter(Boolean).join(' ');

    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value.trim();
    const birthEl = document.getElementById('birthdate');
    const genderEl = document.getElementById('gender');

    const params = new URLSearchParams();
    params.append('name', name);
    params.append('first_name', firstName);
    params.append('middle_name', middleName);
    params.append('last_name', lastName);
    params.append('phone', phone);
    params.append('email', email);
    params.append('password', password);

    if (birthEl && birthEl.value) params.append('birthdate', birthEl.value);
    if (genderEl && genderEl.value) params.append('gender', genderEl.value);

    fetch('api/register.php', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    })
    .then(res => res.json())
    .then(data => {

      if (data.status === "success") {

        localStorage.setItem("mazadUser", JSON.stringify(data.user));

        showToast("Account created successfully");

     setTimeout(() => {
  redirectByRole(data.user);
}, 1000);

      } else {
        showToast(data.message || "Account creation failed");
      }

    })
    .catch(err => {
      showToast('Error connecting to server ❌');
      console.error(err);
    });

  } else {
    showToast('Please complete the registration form correctly.');
  }
});
    window.addEventListener('keydown', (e) => {
      if(e.key === 'Escape'){
        activateScreen('login');
      }
    });
