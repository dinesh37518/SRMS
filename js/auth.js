/**
 * auth.js – Authentication: login, register, forgot password, session
 */

const Auth = (() => {

  let currentRole = 'student'; // 'student' | 'admin'
  let forgotEmailVerified = false; // state for 2-step forgot password

  // ============================================================
  // INIT
  // ============================================================
  const init = () => {
    bindRoleTabs();
    bindLoginForm();
    bindRegisterForm();
    bindForgotForm();
    bindNavLinks();
    bindPasswordToggles();
    setupPhotoUpload();
    setupPasswordStrength();
    setupStepNavigation();
    setupAutoIdGeneration();
  };

  // ============================================================
  // ROLE TABS
  // ============================================================
  const bindRoleTabs = () => {
    Utils.$$('.role-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        Utils.$$('.role-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentRole = tab.dataset.role;
        // Update email placeholder
        const emailInput = Utils.$('#login-email');
        if (emailInput) {
          emailInput.placeholder = currentRole === 'admin' ? 'admin@srms.edu' : 'student@university.edu';
        }
      });
    });
  };

  // ============================================================
  // NAV LINKS (between auth views)
  // ============================================================
  const bindNavLinks = () => {
    const goReg = document.getElementById('btn-go-register');
    const goLogin = document.getElementById('btn-go-login');
    const goForgot = document.getElementById('btn-forgot-password');
    const backFromForgot = document.getElementById('btn-back-login-from-forgot');

    goReg?.addEventListener('click', () => App.showAuthView('register'));
    goLogin?.addEventListener('click', () => App.showAuthView('login'));
    goForgot?.addEventListener('click', () => App.showAuthView('forgot'));
    backFromForgot?.addEventListener('click', () => App.showAuthView('login'));
  };

  // ============================================================
  // LOGIN FORM
  // ============================================================
  const bindLoginForm = () => {
    const form = document.getElementById('login-form');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!validateLoginForm()) return;

      const email = document.getElementById('login-email').value.trim().toLowerCase();
      const password = document.getElementById('login-password').value;
      const remember = document.getElementById('remember-me').checked;

      // Show loading
      const submitBtn = document.getElementById('login-submit');
      submitBtn.classList.add('loading');
      submitBtn.disabled = true;

      // Simulate async delay
      await delay(600);

      const user = Storage.getUser(email);
      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;

      if (!user) {
        showFieldError('login-email-error', 'No account found with this email.');
        Toast.show('Login failed', 'Account not found.', 'error');
        return;
      }
      if (!Utils.verifyPassword(password, user.passwordHash)) {
        showFieldError('login-password-error', 'Incorrect password. Please try again.');
        Toast.show('Login failed', 'Incorrect password.', 'error');
        return;
      }
      // Role check
      if (currentRole === 'admin' && user.role !== 'admin') {
        showFieldError('login-email-error', 'This account does not have admin privileges.');
        return;
      }
      if (currentRole === 'student' && user.role !== 'student') {
        showFieldError('login-email-error', 'Please use the Admin tab to sign in.');
        return;
      }

      // Success — set session
      Storage.setSession(email);
      if (remember) Storage.setRemember(email);

      // Log activity
      Storage.addActivity({
        type: 'login',
        text: `<strong>${user.fullName || user.email}</strong> logged in`,
        userEmail: email,
      });
      if (user.role === 'student') {
        Storage.updateUser(email, {
          activityLog: [
            { type: 'login', text: 'Logged in', timestamp: new Date().toISOString() },
            ...(user.activityLog || []).slice(0, 49),
          ]
        });
      }

      Toast.show('Welcome back!', `Signed in as ${user.fullName || email}`, 'success');
      App.onLoginSuccess(user);
    });
  };

  const validateLoginForm = () => {
    clearErrors();
    let valid = true;
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    if (!email) { showFieldError('login-email-error', 'Email is required.'); valid = false; }
    else if (!Utils.isValidEmail(email)) { showFieldError('login-email-error', 'Enter a valid email address.'); valid = false; }
    if (!password) { showFieldError('login-password-error', 'Password is required.'); valid = false; }
    return valid;
  };

  // ============================================================
  // REGISTER FORM
  // ============================================================
  let currentStep = 1;
  const bindRegisterForm = () => {
    const form = document.getElementById('register-form');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!validateStep3()) return;

      const submitBtn = form.querySelector('[type="submit"]');
      submitBtn.classList.add('loading');
      submitBtn.disabled = true;

      await delay(800);

      try {
        const data = collectRegisterData();
        const user = {
          role: 'student',
          studentId: data.studentId || Utils.generateStudentId(),
          fullName: data.fullName,
          email: data.email,
          passwordHash: Utils.hashPassword(data.password),
          phone: data.phone,
          dob: data.dob,
          address: data.address,
          course: data.course,
          yearLevel: data.yearLevel,
          status: data.status || 'Active',
          enrollmentDate: data.enrollmentDate || new Date().toISOString().split('T')[0],
          profilePhoto: data.profilePhoto || null,
          activityLog: [{ type: 'create', text: 'Account created', timestamp: new Date().toISOString() }],
          createdAt: new Date().toISOString(),
        };

        Storage.saveUser(user);
        Storage.addActivity({ type: 'create', text: `New student <strong>${user.fullName}</strong> registered`, userEmail: user.email });

        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;

        Toast.show('Account created!', 'You can now sign in with your credentials.', 'success');

        // Reset form & go to login
        form.reset();
        resetRegisterForm();
        App.showAuthView('login');
      } catch (err) {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        Toast.show('Registration failed', err.message, 'error');
      }
    });
  };

  const collectRegisterData = () => ({
    studentId: document.getElementById('reg-student-id')?.value.trim(),
    fullName: document.getElementById('reg-name')?.value.trim(),
    phone: document.getElementById('reg-phone')?.value.trim(),
    dob: document.getElementById('reg-dob')?.value,
    address: document.getElementById('reg-address')?.value.trim(),
    course: document.getElementById('reg-course')?.value,
    yearLevel: document.getElementById('reg-year')?.value,
    status: document.getElementById('reg-status')?.value,
    enrollmentDate: document.getElementById('reg-enrollment')?.value,
    profilePhoto: window._regPhotoData || null,
    email: document.getElementById('reg-email')?.value.trim().toLowerCase(),
    password: document.getElementById('reg-password')?.value,
  });

  // Step navigation
  const setupStepNavigation = () => {
    document.getElementById('step1-next')?.addEventListener('click', () => { if (validateStep1()) goToStep(2); });
    document.getElementById('step2-next')?.addEventListener('click', () => { if (validateStep2()) goToStep(3); });
    document.getElementById('step2-back')?.addEventListener('click', () => goToStep(1));
    document.getElementById('step3-back')?.addEventListener('click', () => goToStep(2));
  };

  const goToStep = (step) => {
    currentStep = step;
    Utils.$$('.form-step').forEach((el, i) => {
      el.classList.toggle('active', i + 1 === step);
    });
    Utils.$$('.step[data-step]').forEach(el => {
      const s = parseInt(el.dataset.step);
      el.classList.toggle('active', s === step);
      el.classList.toggle('done', s < step);
    });
    Utils.$$('.step-line').forEach((el, i) => {
      el.classList.toggle('done', i + 1 < step);
    });
  };

  const resetRegisterForm = () => {
    currentStep = 1;
    window._regPhotoData = null;
    goToStep(1);
    const preview = document.getElementById('photo-preview');
    if (preview) preview.innerHTML = '<i class="fas fa-user-circle"></i>';
  };

  const validateStep1 = () => {
    clearErrors(['reg-id-error', 'reg-name-error', 'reg-phone-error', 'reg-dob-error']);
    let valid = true;
    const name = document.getElementById('reg-name').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    const dob = document.getElementById('reg-dob').value;
    const sid = document.getElementById('reg-student-id').value.trim();

    if (!name) { showFieldError('reg-name-error', 'Full name is required.'); valid = false; }
    if (!phone) { showFieldError('reg-phone-error', 'Phone number is required.'); valid = false; }
    else if (!Utils.isValidPhone(phone)) { showFieldError('reg-phone-error', 'Enter a valid phone number.'); valid = false; }
    if (!dob) { showFieldError('reg-dob-error', 'Date of birth is required.'); valid = false; }
    if (sid && Storage.studentIdExists(sid)) { showFieldError('reg-id-error', 'This Student ID is already taken.'); valid = false; }
    return valid;
  };

  const validateStep2 = () => {
    clearErrors(['reg-course-error', 'reg-year-error']);
    let valid = true;
    if (!document.getElementById('reg-course').value) { showFieldError('reg-course-error', 'Please select a course.'); valid = false; }
    if (!document.getElementById('reg-year').value) { showFieldError('reg-year-error', 'Please select a year level.'); valid = false; }
    return valid;
  };

  const validateStep3 = () => {
    clearErrors(['reg-email-error', 'reg-password-error', 'reg-confirm-error']);
    let valid = true;
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirm = document.getElementById('reg-confirm-password').value;

    if (!email) { showFieldError('reg-email-error', 'Email is required.'); valid = false; }
    else if (!Utils.isValidEmail(email)) { showFieldError('reg-email-error', 'Enter a valid email address.'); valid = false; }
    else if (Storage.emailExists(email)) { showFieldError('reg-email-error', 'This email is already registered.'); valid = false; }

    if (!password) { showFieldError('reg-password-error', 'Password is required.'); valid = false; }
    else if (!Utils.isStrongPassword(password)) {
      showFieldError('reg-password-error', 'Password must be 8+ chars with uppercase, lowercase, and a number.');
      valid = false;
    }
    if (password && confirm !== password) { showFieldError('reg-confirm-error', 'Passwords do not match.'); valid = false; }
    return valid;
  };

  // ============================================================
  // AUTO ID GENERATION
  // ============================================================
  const setupAutoIdGeneration = () => {
    document.getElementById('btn-gen-id')?.addEventListener('click', () => {
      let id;
      do { id = Utils.generateStudentId(); } while (Storage.studentIdExists(id));
      const el = document.getElementById('reg-student-id');
      if (el) { el.value = id; el.classList.add('success'); setTimeout(() => el.classList.remove('success'), 1500); }
    });
  };

  // ============================================================
  // PHOTO UPLOAD
  // ============================================================
  const setupPhotoUpload = () => {
    const area = document.getElementById('photo-upload-area');
    const input = document.getElementById('reg-photo');
    if (!area || !input) return;

    area.addEventListener('click', () => input.click());
    area.addEventListener('dragover', (e) => { e.preventDefault(); area.style.borderColor = 'var(--brand-primary)'; });
    area.addEventListener('dragleave', () => { area.style.borderColor = ''; });
    area.addEventListener('drop', (e) => {
      e.preventDefault();
      area.style.borderColor = '';
      const file = e.dataTransfer.files[0];
      if (file) handlePhotoFile(file, 'photo-preview', 'reg-photo-error');
    });
    input.addEventListener('change', () => {
      if (input.files[0]) handlePhotoFile(input.files[0], 'photo-preview', 'reg-photo-error');
    });
  };

  const handlePhotoFile = async (file, previewId, errorId) => {
    clearErrors([errorId]);
    if (!file.type.startsWith('image/')) { showFieldError(errorId, 'Only image files are allowed.'); return; }
    if (file.size > 2 * 1024 * 1024) { showFieldError(errorId, 'Image must be under 2MB.'); return; }
    try {
      const dataUrl = await Utils.readFileAsDataURL(file);
      window._regPhotoData = dataUrl;
      const preview = document.getElementById(previewId);
      if (preview) preview.innerHTML = `<img src="${dataUrl}" alt="Preview" style="width:100%;height:100%;object-fit:cover;border-radius:50%" />`;
    } catch { showFieldError(errorId, 'Failed to read image file.'); }
  };

  // ============================================================
  // PASSWORD STRENGTH METER
  // ============================================================
  const setupPasswordStrength = () => {
    const passInput = document.getElementById('reg-password');
    if (!passInput) return;
    passInput.addEventListener('input', () => {
      const { score, label, color } = Utils.getPasswordStrength(passInput.value);
      const fill = document.getElementById('strength-fill');
      const lbl = document.getElementById('strength-label');
      if (fill) { fill.style.width = score + '%'; fill.style.background = color; }
      if (lbl) { lbl.textContent = label; lbl.style.color = color; }
    });
  };

  // ============================================================
  // FORGOT PASSWORD FORM
  // ============================================================
  const bindForgotForm = () => {
    const form = document.getElementById('forgot-form');
    if (!form) return;
    forgotEmailVerified = false;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!forgotEmailVerified) {
        // Step 1: verify email exists
        clearErrors(['forgot-email-error']);
        const email = document.getElementById('forgot-email').value.trim().toLowerCase();
        if (!email || !Utils.isValidEmail(email)) { showFieldError('forgot-email-error', 'Enter a valid email.'); return; }
        const user = Storage.getUser(email);
        if (!user || user.role === 'admin') { showFieldError('forgot-email-error', 'No student account found with this email.'); return; }

        forgotEmailVerified = true;
        Utils.show('forgot-new-pass-section');
        document.getElementById('forgot-btn-text').textContent = 'Reset Password';
        document.getElementById('forgot-email').readOnly = true;
        Toast.show('Account found!', 'Enter your new password below.', 'info');
      } else {
        // Step 2: reset password
        clearErrors(['forgot-pass-error', 'forgot-confirm-error']);
        const email = document.getElementById('forgot-email').value.trim().toLowerCase();
        const newPass = document.getElementById('forgot-new-pass').value;
        const confirm = document.getElementById('forgot-confirm-pass').value;
        let valid = true;
        if (!Utils.isStrongPassword(newPass)) { showFieldError('forgot-pass-error', 'Password must be 8+ chars with uppercase, lowercase, and a number.'); valid = false; }
        if (newPass !== confirm) { showFieldError('forgot-confirm-error', 'Passwords do not match.'); valid = false; }
        if (!valid) return;

        Storage.updateUser(email, { passwordHash: Utils.hashPassword(newPass) });
        Storage.addActivity({ type: 'reset', text: `Password reset for <strong>${Storage.getUser(email)?.fullName || email}</strong>`, userEmail: email });

        Toast.show('Password reset!', 'You can now sign in with your new password.', 'success');
        forgotEmailVerified = false;
        form.reset();
        Utils.hide('forgot-new-pass-section');
        document.getElementById('forgot-btn-text').textContent = 'Find Account';
        document.getElementById('forgot-email').readOnly = false;
        App.showAuthView('login');
      }
    });
  };

  // ============================================================
  // CHANGE PASSWORD (student & admin)
  // ============================================================
  const bindChangePasswordForm = (formId, currentPassId, newPassId, confirmPassId, curErrId, newErrId, confErrId, email) => {
    const form = document.getElementById(formId);
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      clearErrors([curErrId, newErrId, confErrId]);
      const current = document.getElementById(currentPassId).value;
      const newPass = document.getElementById(newPassId).value;
      const confirm = document.getElementById(confirmPassId).value;
      let valid = true;
      const user = Storage.getUser(email);
      if (!Utils.verifyPassword(current, user.passwordHash)) { showFieldError(curErrId, 'Current password is incorrect.'); valid = false; }
      if (!Utils.isStrongPassword(newPass)) { showFieldError(newErrId, 'Password must be 8+ chars with uppercase, lowercase, and a number.'); valid = false; }
      if (newPass !== confirm) { showFieldError(confErrId, 'Passwords do not match.'); valid = false; }
      if (!valid) return;
      Storage.updateUser(email, { passwordHash: Utils.hashPassword(newPass) });
      Storage.addActivity({ type: 'update', text: `Password changed for <strong>${user.fullName || email}</strong>`, userEmail: email });
      form.reset();
      Toast.show('Password updated!', 'Your password has been changed successfully.', 'success');
    });
  };

  const initChangePasswordForms = (email, role) => {
    if (role === 'admin') {
      bindChangePasswordForm('admin-change-password-form', 'admin-current-pass', 'admin-new-pass', 'admin-confirm-pass', 'admin-current-pass-error', 'admin-new-pass-error', 'admin-confirm-pass-error', email);
    } else {
      bindChangePasswordForm('stu-change-password-form', 'stu-current-pass', 'stu-new-pass', 'stu-confirm-pass', 'stu-current-pass-error', 'stu-new-pass-error', 'stu-confirm-pass-error', email);
    }
  };

  // ============================================================
  // PASSWORD TOGGLES
  // ============================================================
  const bindPasswordToggles = () => {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.toggle-password');
      if (!btn) return;
      const wrapper = btn.closest('.input-wrapper');
      const input = wrapper?.querySelector('input[type="password"], input[type="text"]');
      if (!input) return;
      const isText = input.type === 'text';
      input.type = isText ? 'password' : 'text';
      btn.querySelector('i').className = isText ? 'fas fa-eye' : 'fas fa-eye-slash';
    });
  };

  // ============================================================
  // HELPERS
  // ============================================================
  const showFieldError = (id, msg) => {
    const el = document.getElementById(id);
    if (el) { el.textContent = msg; el.style.display = 'block'; }
  };
  const clearErrors = (ids = null) => {
    if (ids) {
      ids.forEach(id => { const el = document.getElementById(id); if (el) el.textContent = ''; });
    } else {
      Utils.$$('.field-error').forEach(el => { el.textContent = ''; });
    }
  };
  const delay = (ms) => new Promise(res => setTimeout(res, ms));

  return { init, initChangePasswordForms, handlePhotoFile, showFieldError, clearErrors };
})();
