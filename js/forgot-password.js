// login.css hides .auth-shell + header until body.auth-ready is set (login.js does this
// after the hammer-intro video). The forgot page has no intro, so reveal it immediately.
document.body.classList.add('auth-ready');

const forgotToast = document.getElementById('forgotToast');

const forgotBrandCopy = document.getElementById('forgotBrandCopy');
const forgotKicker = document.getElementById('forgotKicker');
const forgotHeroTitle = document.getElementById('forgotHeroTitle');
const forgotHeroText = document.getElementById('forgotHeroText');
const forgotMiniNote = document.getElementById('forgotMiniNote');
const forgotCard = document.querySelector('.forgot-card');

const screen1 = document.getElementById('screen1');
const screen2 = document.getElementById('screen2');
const screen3 = document.getElementById('screen3');

const chip1 = document.getElementById('chip1');
const chip2 = document.getElementById('chip2');
const chip3 = document.getElementById('chip3');

const recoverEmail = document.getElementById('recoverEmail');
const sendCodeBtn = document.getElementById('sendCodeBtn');
const verifyBtn = document.getElementById('verifyBtn');
const saveBtn = document.getElementById('saveBtn');

const resendBtn = document.getElementById('resendBtn');
const backToEmailBtn = document.getElementById('backToEmailBtn');
const goLoginBtnTop = document.getElementById('goLoginBtnTop');
const goLoginBtnBottom = document.getElementById('goLoginBtnBottom');

const otpInputs = Array.from(document.querySelectorAll('.otp-input'));
const otpTimer = document.getElementById('otpTimer');

const newPassword = document.getElementById('newPassword');
const confirmPassword = document.getElementById('confirmPassword');
const strengthBar = document.getElementById('strengthBar');
const strengthText = document.getElementById('strengthText');

let currentStep = 1;
let timerInterval = null;
let timerSeconds = 90;
let resetEmail = '';
let resetToken = '';
const API_BASE = '/mazad/api';

const heroContent = {
  1: {
    kicker: 'Secure premium recovery',
    title: 'RESET<br>PASSWORD',
    text: 'Recover access to your account in an elegant MAZAD-branded flow, with clear steps, smooth motion, and a professional experience ready for backend integration later.',
    note: 'Recover your account elegantly'
  },
  2: {
    kicker: 'Verification in progress',
    title: 'CHECK<br>YOUR CODE',
    text: 'Enter the verification code in a clean, fast experience with smooth transitions and an interface that feels real and ready to use.',
    note: 'Enter the verification code'
  },
  3: {
    kicker: 'Create a stronger password',
    title: 'SET<br>NEW ACCESS',
    text: 'Create a new password in a clear, polished flow with a live strength indicator and light interactive touches that make the interface feel alive.',
    note: 'Create a secure new password'
  }
};

function showToast(message){
  forgotToast.textContent = message;
  forgotToast.classList.add('show');

  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    forgotToast.classList.remove('show');
  }, 2500);
}

function updateHero(step){
  forgotBrandCopy.classList.add('is-changing');

  setTimeout(() => {
    forgotKicker.textContent = heroContent[step].kicker;
    forgotHeroTitle.innerHTML = heroContent[step].title;
    forgotHeroText.textContent = heroContent[step].text;
    forgotMiniNote.textContent = heroContent[step].note;
    forgotBrandCopy.classList.remove('is-changing');
  }, 220);
}

function goToStep(step){
  currentStep = step;

  [screen1, screen2, screen3].forEach(screen => screen.classList.remove('is-active'));
  [chip1, chip2, chip3].forEach(chip => chip.classList.remove('is-active'));

  if(step === 1){
    screen1.classList.add('is-active');
    chip1.classList.add('is-active');
    stopTimer();
  }

  if(step === 2){
    screen2.classList.add('is-active');
    chip2.classList.add('is-active');
    startTimer();
  }

  if(step === 3){
    screen3.classList.add('is-active');
    chip3.classList.add('is-active');
    stopTimer();
  }

  updateHero(step);
  forgotCard.classList.add('success-flash');
  setTimeout(() => forgotCard.classList.remove('success-flash'), 450);
}

function validateEmail(value){
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function clearFieldState(fieldWrap){
  if(!fieldWrap) return;
  fieldWrap.classList.remove('is-error', 'shake');
  const err = fieldWrap.querySelector('.field-error');
  if(err) err.textContent = '';
}

function setFieldError(fieldWrap, message){
  if(!fieldWrap) return;
  fieldWrap.classList.add('is-error', 'shake');
  const err = fieldWrap.querySelector('.field-error');
  if(err) err.textContent = message;
  setTimeout(() => fieldWrap.classList.remove('shake'), 350);
}

async function postForm(url, data){
  const body = new URLSearchParams();
  Object.entries(data).forEach(([k, v]) => body.append(k, v));
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Accept': 'application/json' },
    body
  });
  // Tolerate non-JSON error pages from PHP
  const text = await res.text();
  try { return JSON.parse(text); }
  catch { return { status: 'error', message: 'Server error', raw: text }; }
}

sendCodeBtn.addEventListener('click', async () => {
  const emailWrap = document.querySelector('[data-field="recoverEmail"]');
  clearFieldState(emailWrap);

  const emailValue = recoverEmail.value.trim();

  if(!emailValue){
    setFieldError(emailWrap, 'Please enter your email');
    showToast('Please enter your email first');
    return;
  }

  if(!validateEmail(emailValue)){
    setFieldError(emailWrap, 'Invalid email format');
    showToast('Invalid email format');
    return;
  }

  sendCodeBtn.disabled = true;
  const origLabel = sendCodeBtn.textContent;
  sendCodeBtn.textContent = 'Sending...';

  const out = await postForm(`${API_BASE}/forgot-password-send.php`, { email: emailValue });

  sendCodeBtn.disabled = false;
  sendCodeBtn.textContent = origLabel;

  if(out.status !== 'success'){
    setFieldError(emailWrap, out.message || 'Failed to send code');
    showToast(out.message || 'Failed to send code');
    return;
  }

  resetEmail = emailValue;
  showToast('Recovery code sent to your email');
  goToStep(2);

  setTimeout(() => {
    otpInputs[0]?.focus();
  }, 120);
});

otpInputs.forEach((input, index) => {
  input.addEventListener('input', () => {
    input.value = input.value.replace(/\D/g, '').slice(0, 1);

    if(input.value && otpInputs[index + 1]){
      otpInputs[index + 1].focus();
    }
  });

  input.addEventListener('keydown', (e) => {
    if(e.key === 'Backspace' && !input.value && otpInputs[index - 1]){
      otpInputs[index - 1].focus();
    }
  });
});

function getOtpCode(){
  return otpInputs.map(input => input.value).join('');
}

verifyBtn.addEventListener('click', async () => {
  const otpWrap = document.querySelector('[data-field="otpCode"]');
  clearFieldState(otpWrap);

  const code = getOtpCode();

  if(code.length !== 6){
    setFieldError(otpWrap, 'Enter a 6-digit code');
    showToast('Complete the verification code');
    return;
  }

  verifyBtn.disabled = true;
  const orig = verifyBtn.textContent;
  verifyBtn.textContent = 'Verifying...';

  const out = await postForm(`${API_BASE}/forgot-password-verify.php`, {
    email: resetEmail,
    code
  });

  verifyBtn.disabled = false;
  verifyBtn.textContent = orig;

  if(out.status !== 'success'){
    setFieldError(otpWrap, out.message || 'Invalid code');
    showToast(out.message || 'Invalid code');
    return;
  }

  resetToken = out.reset_token;
  showToast('Verified successfully');
  goToStep(3);

  setTimeout(() => {
    newPassword.focus();
  }, 120);
});

resendBtn.addEventListener('click', async () => {
  if(!resetEmail){
    showToast('Go back to the first step and enter your email');
    goToStep(1);
    return;
  }
  resendBtn.disabled = true;
  const out = await postForm(`${API_BASE}/forgot-password-send.php`, { email: resetEmail });
  resendBtn.disabled = false;

  otpInputs.forEach(input => input.value = '');
  timerSeconds = 90;
  startTimer(true);

  if(out.status === 'success'){
    showToast('Code resent successfully');
  } else {
    showToast(out.message || 'Could not resend the code');
  }
  otpInputs[0]?.focus();
});

backToEmailBtn.addEventListener('click', () => {
  otpInputs.forEach(input => input.value = '');
  goToStep(1);
});

function formatTime(seconds){
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function startTimer(reset = false){
  if(reset){
    stopTimer();
  }

  if(timerInterval) return;

  otpTimer.textContent = formatTime(timerSeconds);
  otpTimer.classList.toggle('ending', timerSeconds <= 15);

  timerInterval = setInterval(() => {
    timerSeconds--;

    if(timerSeconds <= 0){
      timerSeconds = 0;
      otpTimer.textContent = formatTime(timerSeconds);
      otpTimer.classList.add('ending');
      stopTimer();
      showToast('The code expired — resend it');
      return;
    }

    otpTimer.textContent = formatTime(timerSeconds);
    otpTimer.classList.toggle('ending', timerSeconds <= 15);
  }, 1000);
}

function stopTimer(){
  clearInterval(timerInterval);
  timerInterval = null;
}

function evaluatePasswordStrength(password){
  let score = 0;

  if(password.length >= 8) score++;
  if(/[A-Z]/.test(password)) score++;
  if(/[a-z]/.test(password)) score++;
  if(/\d/.test(password)) score++;
  if(/[^\w\s]/.test(password)) score++;

  return score;
}

function updateStrength(){
  const value = newPassword.value;
  const score = evaluatePasswordStrength(value);

  let text = 'Password strength will appear here';
  let width = score * 20;

  if(score <= 1){
    text = 'Weak password';
  } else if(score === 2){
    text = 'Fair password';
  } else if(score === 3){
    text = 'Good password';
  } else if(score === 4){
    text = 'Strong password';
  } else if(score === 5){
    text = 'Very strong password';
  }

  strengthBar.style.width = `${width}%`;
  strengthText.textContent = text;
}

newPassword.addEventListener('input', updateStrength);

saveBtn.addEventListener('click', async () => {
  const newPasswordWrap = document.querySelector('[data-field="newPasswordWrap"]');
  const confirmPasswordWrap = document.querySelector('[data-field="confirmPasswordWrap"]');

  clearFieldState(newPasswordWrap);
  clearFieldState(confirmPasswordWrap);

  const passwordValue = newPassword.value.trim();
  const confirmValue = confirmPassword.value.trim();

  let valid = true;

  if(passwordValue.length < 8){
    setFieldError(newPasswordWrap, 'Password must be at least 8 characters');
    valid = false;
  }

  if(confirmValue !== passwordValue){
    setFieldError(confirmPasswordWrap, 'Passwords do not match');
    valid = false;
  }

  if(!valid){
    showToast('Check the password fields');
    return;
  }

  if(!resetToken || !resetEmail){
    showToast('Session expired, start again');
    goToStep(1);
    return;
  }

  saveBtn.disabled = true;
  const orig = saveBtn.textContent;
  saveBtn.textContent = 'Saving...';

  const out = await postForm(`${API_BASE}/forgot-password-reset.php`, {
    email: resetEmail,
    reset_token: resetToken,
    new_password: passwordValue
  });

  saveBtn.disabled = false;
  saveBtn.textContent = orig;

  if(out.status !== 'success'){
    setFieldError(newPasswordWrap, out.message || 'Failed to update password');
    showToast(out.message || 'Failed to update password');
    return;
  }

  showToast('Password changed successfully');

  setTimeout(() => {
    window.location.href = 'login.html';
  }, 1200);
});

document.querySelectorAll('.toggle-password').forEach(btn => {
  btn.addEventListener('click', () => {
    const targetId = btn.dataset.target;
    const input = document.getElementById(targetId);

    if(!input) return;

    if(input.type === 'password'){
      input.type = 'text';
      btn.textContent = '🙈';
    } else {
      input.type = 'password';
      btn.textContent = '👁';
    }
  });
});

goLoginBtnTop.addEventListener('click', () => {
  window.location.href = 'login.html';
});

goLoginBtnBottom.addEventListener('click', () => {
  window.location.href = 'login.html';
});
