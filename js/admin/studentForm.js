/**
 * studentForm.js – Modal forms for Add/Edit student (used by Admin)
 */

const StudentForm = (() => {

  // ============================================================
  // OPEN ADD STUDENT MODAL
  // ============================================================
  const openAddModal = () => {
    const html = buildFormHtml(null);
    Modal.open({ title: 'Add New Student', content: html, maxWidth: '620px' });
    setupModalFormEvents(null);
  };

  // ============================================================
  // OPEN EDIT STUDENT MODAL
  // ============================================================
  const openEditModal = (email) => {
    const student = Storage.getUser(email);
    if (!student) { Toast.error('Error', 'Student not found.'); return; }
    const html = buildFormHtml(student);
    Modal.open({ title: 'Edit Student', content: html, maxWidth: '620px' });
    setupModalFormEvents(student);
    fillFormData(student);
  };

  // ============================================================
  // OPEN VIEW STUDENT MODAL
  // ============================================================
  const openViewModal = (email) => {
    const s = Storage.getUser(email);
    if (!s) return;
    const avatar = s.profilePhoto
      ? `<img src="${s.profilePhoto}" alt="${Utils.escapeHtml(s.fullName)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%" />`
      : Utils.getInitials(s.fullName);

    const html = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:16px;padding-bottom:12px;">
        <div style="width:90px;height:90px;border-radius:50%;background:${s.profilePhoto ? 'none' : Utils.nameToColor(s.fullName)};display:flex;align-items:center;justify-content:center;color:white;font-size:${s.profilePhoto ? '0' : '2rem'};font-weight:700;overflow:hidden;border:3px solid var(--border-color);">
          ${avatar}
        </div>
        <div style="text-align:center">
          <h3 style="margin-bottom:4px;">${Utils.escapeHtml(s.fullName)}</h3>
          <p class="text-muted">${Utils.escapeHtml(s.studentId)}</p>
          ${Utils.statusBadge(s.status)}
        </div>
      </div>
      <div class="info-grid" style="padding-top:16px;border-top:1px solid var(--border-color);">
        <div class="info-item"><span class="info-label">Email</span><span class="info-value">${Utils.escapeHtml(s.email)}</span></div>
        <div class="info-item"><span class="info-label">Phone</span><span class="info-value">${Utils.escapeHtml(s.phone || '—')}</span></div>
        <div class="info-item"><span class="info-label">Date of Birth</span><span class="info-value">${Utils.formatDate(s.dob)}</span></div>
        <div class="info-item"><span class="info-label">Address</span><span class="info-value">${Utils.escapeHtml(s.address || '—')}</span></div>
        <div class="info-item"><span class="info-label">Course</span><span class="info-value">${Utils.escapeHtml(s.course || '—')}</span></div>
        <div class="info-item"><span class="info-label">Year Level</span><span class="info-value">${Utils.yearDisplay(s.yearLevel)}</span></div>
        <div class="info-item"><span class="info-label">Enrollment Date</span><span class="info-value">${Utils.formatDate(s.enrollmentDate)}</span></div>
        <div class="info-item"><span class="info-label">Account Created</span><span class="info-value">${Utils.formatDate(s.createdAt)}</span></div>
      </div>
      <div style="margin-top:20px;display:flex;gap:8px;justify-content:flex-end;">
        <button class="btn btn-outline btn-sm" onclick="window.print()"><i class="fas fa-print"></i> Print</button>
        <button class="btn btn-primary btn-sm" onclick="Modal.close();StudentForm.openEditModal('${s.email}')"><i class="fas fa-edit"></i> Edit</button>
      </div>
    `;
    Modal.open({ title: 'Student Profile', content: html, maxWidth: '540px' });
  };

  // ============================================================
  // RESET PASSWORD MODAL
  // ============================================================
  const openResetPasswordModal = (email) => {
    const student = Storage.getUser(email);
    if (!student) return;
    const html = `
      <form id="modal-reset-pass-form" class="modal-form" novalidate>
        <p style="margin-bottom:16px;">Reset password for <strong>${Utils.escapeHtml(student.fullName)}</strong> (${Utils.escapeHtml(email)})</p>
        <div class="form-group">
          <label class="form-label">New Password</label>
          <div class="input-wrapper">
            <i class="fas fa-lock input-icon"></i>
            <input type="password" id="modal-reset-new-pass" class="form-input" placeholder="Enter new password" />
            <button type="button" class="toggle-password"><i class="fas fa-eye"></i></button>
          </div>
          <span class="field-error" id="modal-reset-pass-error"></span>
        </div>
        <div class="form-group">
          <label class="form-label">Confirm Password</label>
          <div class="input-wrapper">
            <i class="fas fa-lock input-icon"></i>
            <input type="password" id="modal-reset-confirm-pass" class="form-input" placeholder="Confirm new password" />
          </div>
          <span class="field-error" id="modal-reset-confirm-error"></span>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" onclick="Modal.close()">Cancel</button>
          <button type="submit" class="btn btn-primary">Reset Password</button>
        </div>
      </form>
    `;
    Modal.open({ title: 'Reset Password', content: html, maxWidth: '440px' });
    document.getElementById('modal-reset-pass-form').addEventListener('submit', (e) => {
      e.preventDefault();
      Auth.clearErrors(['modal-reset-pass-error', 'modal-reset-confirm-error']);
      const newPass = document.getElementById('modal-reset-new-pass').value;
      const confirm = document.getElementById('modal-reset-confirm-pass').value;
      let valid = true;
      if (!Utils.isStrongPassword(newPass)) { Auth.showFieldError('modal-reset-pass-error', 'Min 8 chars with uppercase, lowercase, and number.'); valid = false; }
      if (newPass !== confirm) { Auth.showFieldError('modal-reset-confirm-error', 'Passwords do not match.'); valid = false; }
      if (!valid) return;
      Storage.updateUser(email, { passwordHash: Utils.hashPassword(newPass) });
      Storage.addActivity({ type: 'reset', text: `Password reset for <strong>${student.fullName}</strong> by admin`, userEmail: email });
      Toast.success('Password reset', `Password updated for ${student.fullName}`);
      Modal.close();
    });
  };

  // ============================================================
  // BUILD FORM HTML
  // ============================================================
  const buildFormHtml = (student) => {
    const isEdit = !!student;
    const courses = [
      'Bachelor of Science in Computer Science',
      'Bachelor of Science in Information Technology',
      'Bachelor of Science in Engineering',
      'Bachelor of Science in Mathematics',
      'Bachelor of Arts in English',
      'Bachelor of Business Administration',
      'Bachelor of Science in Nursing',
      'Bachelor of Education',
      'Bachelor of Fine Arts',
      'Master of Science in Computer Science',
      'Master of Business Administration',
    ];
    const courseOptions = courses.map(c => `<option value="${c}" ${student?.course === c ? 'selected' : ''}>${c}</option>`).join('');
    const yearOptions = ['1','2','3','4','5','Graduate'].map(y =>
      `<option value="${y}" ${student?.yearLevel === y ? 'selected' : ''}>${Utils.yearDisplay(y)}</option>`
    ).join('');

    return `
      <form id="modal-student-form" class="modal-form" novalidate>
        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label">Student ID</label>
            <div class="input-wrapper">
              <i class="fas fa-id-badge input-icon"></i>
              <input type="text" id="modal-sid" class="form-input" placeholder="Auto-generated if empty" value="${Utils.escapeHtml(student?.studentId || '')}" ${isEdit ? 'readonly' : ''} />
              ${!isEdit ? '<button type="button" class="input-action-btn" id="modal-gen-id"><i class="fas fa-magic"></i></button>' : ''}
            </div>
            <span class="field-error" id="modal-sid-error"></span>
          </div>
          <div class="form-group flex-1">
            <label class="form-label">Full Name *</label>
            <div class="input-wrapper">
              <i class="fas fa-user input-icon"></i>
              <input type="text" id="modal-name" class="form-input" placeholder="Full name" required />
            </div>
            <span class="field-error" id="modal-name-error"></span>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label">Email *</label>
            <div class="input-wrapper">
              <i class="fas fa-envelope input-icon"></i>
              <input type="email" id="modal-email" class="form-input" placeholder="student@email.com" required ${isEdit ? 'readonly' : ''} />
            </div>
            <span class="field-error" id="modal-email-error"></span>
          </div>
          <div class="form-group flex-1">
            <label class="form-label">Phone *</label>
            <div class="input-wrapper">
              <i class="fas fa-phone input-icon"></i>
              <input type="tel" id="modal-phone" class="form-input" placeholder="+1 234 567 8900" />
            </div>
            <span class="field-error" id="modal-phone-error"></span>
          </div>
        </div>
        ${!isEdit ? `
        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label">Password *</label>
            <div class="input-wrapper">
              <i class="fas fa-lock input-icon"></i>
              <input type="password" id="modal-password" class="form-input" placeholder="Min 8 chars" />
              <button type="button" class="toggle-password"><i class="fas fa-eye"></i></button>
            </div>
            <span class="field-error" id="modal-password-error"></span>
          </div>
        </div>` : ''}
        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label">Date of Birth</label>
            <div class="input-wrapper">
              <i class="fas fa-calendar input-icon"></i>
              <input type="date" id="modal-dob" class="form-input" />
            </div>
          </div>
          <div class="form-group flex-1">
            <label class="form-label">Address</label>
            <div class="input-wrapper">
              <i class="fas fa-map-marker-alt input-icon"></i>
              <input type="text" id="modal-address" class="form-input" placeholder="Address" />
            </div>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label">Course *</label>
            <div class="input-wrapper">
              <i class="fas fa-book input-icon"></i>
              <select id="modal-course" class="form-input form-select"><option value="">Select Course</option>${courseOptions}</select>
            </div>
            <span class="field-error" id="modal-course-error"></span>
          </div>
          <div class="form-group flex-1">
            <label class="form-label">Year Level *</label>
            <div class="input-wrapper">
              <i class="fas fa-layer-group input-icon"></i>
              <select id="modal-year" class="form-input form-select"><option value="">Select Year</option>${yearOptions}</select>
            </div>
            <span class="field-error" id="modal-year-error"></span>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label">Enrollment Date</label>
            <div class="input-wrapper">
              <i class="fas fa-calendar-check input-icon"></i>
              <input type="date" id="modal-enrollment" class="form-input" />
            </div>
          </div>
          <div class="form-group flex-1">
            <label class="form-label">Status</label>
            <div class="input-wrapper">
              <i class="fas fa-toggle-on input-icon"></i>
              <select id="modal-status" class="form-input form-select">
                <option value="Active" ${student?.status === 'Active' ? 'selected' : ''}>Active</option>
                <option value="Graduated" ${student?.status === 'Graduated' ? 'selected' : ''}>Graduated</option>
                <option value="Suspended" ${student?.status === 'Suspended' ? 'selected' : ''}>Suspended</option>
                <option value="Withdrawn" ${student?.status === 'Withdrawn' ? 'selected' : ''}>Withdrawn</option>
              </select>
            </div>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Profile Photo</label>
          <div class="photo-upload" id="modal-photo-area">
            <div class="photo-preview" id="modal-photo-preview">
              ${student?.profilePhoto ? `<img src="${student.profilePhoto}" alt="Photo" />` : '<i class="fas fa-user-circle"></i>'}
            </div>
            <div class="photo-upload-info"><p>Click to upload or drag & drop</p><small>PNG, JPG up to 2MB</small></div>
            <input type="file" id="modal-photo-input" accept="image/*" class="hidden-input" />
          </div>
          <span class="field-error" id="modal-photo-error"></span>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" onclick="Modal.close()">Cancel</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Add Student'}</button>
        </div>
      </form>
    `;
  };

  // ============================================================
  // FILL FORM DATA (for edit)
  // ============================================================
  const fillFormData = (s) => {
    const fields = { 'modal-sid': s.studentId, 'modal-name': s.fullName, 'modal-email': s.email, 'modal-phone': s.phone, 'modal-dob': s.dob, 'modal-address': s.address, 'modal-enrollment': s.enrollmentDate };
    Object.entries(fields).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.value = val || '';
    });
  };

  // ============================================================
  // SETUP MODAL FORM EVENTS
  // ============================================================
  const setupModalFormEvents = (existingStudent) => {
    const isEdit = !!existingStudent;

    // Photo upload
    const area = document.getElementById('modal-photo-area');
    const input = document.getElementById('modal-photo-input');
    if (area && input) {
      area.addEventListener('click', () => input.click());
      area.addEventListener('dragover', (e) => { e.preventDefault(); area.style.borderColor = 'var(--brand-primary)'; });
      area.addEventListener('dragleave', () => { area.style.borderColor = ''; });
      area.addEventListener('drop', (e) => {
        e.preventDefault();
        area.style.borderColor = '';
        if (e.dataTransfer.files[0]) handleModalPhoto(e.dataTransfer.files[0]);
      });
      input.addEventListener('change', () => { if (input.files[0]) handleModalPhoto(input.files[0]); });
    }

    // Auto-generate ID
    document.getElementById('modal-gen-id')?.addEventListener('click', () => {
      let id;
      do { id = Utils.generateStudentId(); } while (Storage.studentIdExists(id));
      document.getElementById('modal-sid').value = id;
    });

    // Form submit
    const form = document.getElementById('modal-student-form');
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      if (isEdit) handleEditSubmit(existingStudent.email);
      else handleAddSubmit();
    });
  };

  // ============================================================
  // PHOTO HANDLING IN MODAL
  // ============================================================
  let _modalPhotoData = null;
  const handleModalPhoto = async (file) => {
    const errId = 'modal-photo-error';
    Auth.clearErrors([errId]);
    if (!file.type.startsWith('image/')) { Auth.showFieldError(errId, 'Only image files allowed.'); return; }
    if (file.size > 2 * 1024 * 1024) { Auth.showFieldError(errId, 'Max 2MB.'); return; }
    try {
      const url = await Utils.readFileAsDataURL(file);
      _modalPhotoData = url;
      const preview = document.getElementById('modal-photo-preview');
      if (preview) preview.innerHTML = `<img src="${url}" alt="Preview" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;
    } catch { Auth.showFieldError(errId, 'Failed to read image.'); }
  };

  // ============================================================
  // VALIDATE MODAL FORM
  // ============================================================
  const validateModalForm = (isEdit, editEmail = null) => {
    const errIds = ['modal-sid-error','modal-name-error','modal-email-error','modal-phone-error','modal-password-error','modal-course-error','modal-year-error'];
    Auth.clearErrors(errIds);
    let valid = true;
    const name = document.getElementById('modal-name').value.trim();
    const email = document.getElementById('modal-email').value.trim().toLowerCase();
    const phone = document.getElementById('modal-phone').value.trim();
    const sid = document.getElementById('modal-sid').value.trim();
    const course = document.getElementById('modal-course').value;
    const year = document.getElementById('modal-year').value;

    if (!name) { Auth.showFieldError('modal-name-error', 'Name is required.'); valid = false; }
    if (!email || !Utils.isValidEmail(email)) { Auth.showFieldError('modal-email-error', 'Valid email is required.'); valid = false; }
    else if (Storage.emailExists(email, editEmail)) { Auth.showFieldError('modal-email-error', 'Email already registered.'); valid = false; }
    if (phone && !Utils.isValidPhone(phone)) { Auth.showFieldError('modal-phone-error', 'Invalid phone number.'); valid = false; }
    if (sid && Storage.studentIdExists(sid, editEmail)) { Auth.showFieldError('modal-sid-error', 'Student ID taken.'); valid = false; }
    if (!course) { Auth.showFieldError('modal-course-error', 'Select a course.'); valid = false; }
    if (!year) { Auth.showFieldError('modal-year-error', 'Select a year.'); valid = false; }
    if (!isEdit) {
      const pass = document.getElementById('modal-password')?.value;
      if (!pass || !Utils.isStrongPassword(pass)) {
        Auth.showFieldError('modal-password-error', 'Min 8 chars with uppercase, lowercase, number.');
        valid = false;
      }
    }
    return valid;
  };

  // ============================================================
  // ADD SUBMIT
  // ============================================================
  const handleAddSubmit = () => {
    if (!validateModalForm(false)) return;
    const sid = document.getElementById('modal-sid').value.trim() || Utils.generateStudentId();
    const email = document.getElementById('modal-email').value.trim().toLowerCase();
    const pass = document.getElementById('modal-password').value;
    const user = {
      role: 'student',
      studentId: sid,
      fullName: document.getElementById('modal-name').value.trim(),
      email,
      passwordHash: Utils.hashPassword(pass),
      phone: document.getElementById('modal-phone').value.trim(),
      dob: document.getElementById('modal-dob').value,
      address: document.getElementById('modal-address').value.trim(),
      course: document.getElementById('modal-course').value,
      yearLevel: document.getElementById('modal-year').value,
      enrollmentDate: document.getElementById('modal-enrollment').value || new Date().toISOString().split('T')[0],
      status: document.getElementById('modal-status').value,
      profilePhoto: _modalPhotoData || null,
      activityLog: [{ type: 'create', text: 'Account created by admin', timestamp: new Date().toISOString() }],
      createdAt: new Date().toISOString(),
    };
    Storage.saveUser(user);
    Storage.addActivity({ type: 'create', text: `Admin added student <strong>${user.fullName}</strong>`, userEmail: email });
    _modalPhotoData = null;
    Modal.close();
    Toast.success('Student added', `${user.fullName} has been registered.`);
    AdminDashboard.refresh();
    StudentTable.refresh();
  };

  // ============================================================
  // EDIT SUBMIT
  // ============================================================
  const handleEditSubmit = (originalEmail) => {
    if (!validateModalForm(true, originalEmail)) return;
    const updates = {
      fullName: document.getElementById('modal-name').value.trim(),
      phone: document.getElementById('modal-phone').value.trim(),
      dob: document.getElementById('modal-dob').value,
      address: document.getElementById('modal-address').value.trim(),
      course: document.getElementById('modal-course').value,
      yearLevel: document.getElementById('modal-year').value,
      enrollmentDate: document.getElementById('modal-enrollment').value,
      status: document.getElementById('modal-status').value,
    };
    if (_modalPhotoData) updates.profilePhoto = _modalPhotoData;
    Storage.updateUser(originalEmail, updates);
    Storage.addActivity({ type: 'update', text: `Admin updated <strong>${updates.fullName}</strong>'s record`, userEmail: originalEmail });
    _modalPhotoData = null;
    Modal.close();
    Toast.success('Student updated', `${updates.fullName}'s record has been saved.`);
    AdminDashboard.refresh();
    StudentTable.refresh();
  };

  return { openAddModal, openEditModal, openViewModal, openResetPasswordModal };
})();
