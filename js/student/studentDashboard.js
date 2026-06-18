/**
 * studentDashboard.js – Student dashboard, profile, and course management
 */

const StudentDashboard = (() => {
  let currentStudentEmail = '';

  // Subject configurations matching course streams
  const COURSE_SUBJECTS = {
    'Bachelor of Science in Computer Science': [
      { code: 'CS101', name: 'Introduction to Computer Science', credits: 4, schedule: 'Mon/Wed 9:00 AM - 10:30 AM', instructor: 'Dr. Alan Turing' },
      { code: 'CS201', name: 'Data Structures and Algorithms', credits: 4, schedule: 'Tue/Thu 11:00 AM - 12:30 PM', instructor: 'Prof. Grace Hopper' },
      { code: 'CS301', name: 'Database Management Systems', credits: 3, schedule: 'Mon/Wed 1:00 PM - 2:30 PM', instructor: 'Dr. Edgar Codd' },
      { code: 'CS401', name: 'Software Engineering', credits: 3, schedule: 'Fri 9:00 AM - 12:00 PM', instructor: 'Prof. Margaret Hamilton' }
    ],
    'Bachelor of Science in Information Technology': [
      { code: 'IT101', name: 'Information Technology Fundamentals', credits: 3, schedule: 'Mon/Wed 10:30 AM - 12:00 PM', instructor: 'Dr. Tim Berners-Lee' },
      { code: 'IT202', name: 'Network Administration', credits: 4, schedule: 'Tue/Thu 9:00 AM - 10:30 AM', instructor: 'Prof. Vint Cerf' },
      { code: 'IT303', name: 'Web Development & Applications', credits: 3, schedule: 'Mon/Wed 3:00 PM - 4:30 PM', instructor: 'Dr. Brendan Eich' },
      { code: 'IT404', name: 'Cybersecurity Principles', credits: 3, schedule: 'Fri 1:00 PM - 4:00 PM', instructor: 'Prof. Dorothy Denning' }
    ]
  };

  const getSubjectsForCourse = (course) => {
    if (COURSE_SUBJECTS[course]) return COURSE_SUBJECTS[course];
    
    // Generate subjects dynamically for other courses to ensure visual richness
    const name = course || 'General Studies';
    const cleanName = name.replace('Bachelor of Science in ', '').replace('Bachelor of Arts in ', '').replace('Bachelor of ', '');
    return [
      { code: 'CORE101', name: `${cleanName} Fundamentals`, credits: 4, schedule: 'Mon/Wed 9:00 AM - 10:30 AM', instructor: 'Dr. Alice Smith' },
      { code: 'CORE202', name: `Advanced ${cleanName} Theory`, credits: 4, schedule: 'Tue/Thu 11:00 AM - 12:30 PM', instructor: 'Prof. Bob Martinez' },
      { code: 'CORE303', name: `Research in ${cleanName}`, credits: 3, schedule: 'Mon/Wed 1:00 PM - 2:30 PM', instructor: 'Dr. Charlie Brown' },
      { code: 'CORE404', name: 'Capstone Senior Project', credits: 3, schedule: 'Fri 9:00 AM - 12:00 PM', instructor: 'Prof. Diana Prince' }
    ];
  };

  // ============================================================
  // INIT
  // ============================================================
  const init = (email) => {
    currentStudentEmail = email.toLowerCase();
    
    bindProfileForm();
    bindPhotoUpload();
    bindPrintTriggers();
    bindQuickEditTriggers();
    
    refresh();
  };

  // ============================================================
  // REFRESH
  // ============================================================
  const refresh = () => {
    const student = Storage.getUser(currentStudentEmail);
    if (!student) {
      console.error('StudentDashboard error: student account not found.');
      return;
    }

    // Set Welcome Header
    const welcomeTitle = document.getElementById('student-welcome-title');
    if (welcomeTitle) welcomeTitle.textContent = `Welcome back, ${student.fullName}!`;

    // Populate Top Stats
    Utils.setText('stu-stat-course', student.course ? student.course.replace('Bachelor of Science in ', 'B.Sc. ').replace('Bachelor of Arts in ', 'B.A. ') : '—');
    Utils.setText('stu-stat-year', Utils.yearDisplay(student.yearLevel));
    Utils.setText('stu-stat-enrolled', Utils.formatDateShort(student.enrollmentDate));
    
    // Status Badge
    const statusVal = document.getElementById('stu-stat-status');
    if (statusVal) {
      statusVal.innerHTML = Utils.statusBadge(student.status);
    }

    // Populate Overview Card & Digital ID Card Photo / Details
    populateProfilePhotosAndAvatars(student);

    // Overview Card text details
    Utils.setText('overview-name', student.fullName);
    Utils.setText('overview-id', `ID: ${student.studentId}`);
    
    const emailEl = document.getElementById('overview-email');
    if (emailEl) emailEl.innerHTML = `<i class="fas fa-envelope"></i> ${Utils.escapeHtml(student.email)}`;
    
    const phoneEl = document.getElementById('overview-phone');
    if (phoneEl) phoneEl.innerHTML = `<i class="fas fa-phone"></i> ${Utils.escapeHtml(student.phone || '—')}`;
    
    const dobEl = document.getElementById('overview-dob');
    if (dobEl) dobEl.innerHTML = `<i class="fas fa-birthday-cake"></i> ${Utils.formatDate(student.dob)}`;

    const statusBadgeEl = document.getElementById('overview-status-badge');
    if (statusBadgeEl) {
      statusBadgeEl.textContent = student.status;
      statusBadgeEl.className = `status-badge ${student.status.toLowerCase()}`;
    }

    // Render Information Displays (Personal & Academic)
    renderPersonalInfoDisplay(student);
    renderAcademicInfoDisplay(student);

    // Render Student Specific Activity Feed
    refreshStudentActivityFeed(student);

    // Render Enrolled Course Cards
    renderEnrolledCourses(student);
  };

  // ============================================================
  // PHOTOS & AVATARS POPULATION
  // ============================================================
  const populateProfilePhotosAndAvatars = (student) => {
    const isPhoto = !!student.profilePhoto;
    
    // 1. Overview Avatar
    const overviewAvatar = document.getElementById('overview-avatar');
    if (overviewAvatar) {
      if (isPhoto) {
        overviewAvatar.innerHTML = `<img src="${student.profilePhoto}" alt="${student.fullName}" style="width:100%;height:100%;object-fit:cover;border-radius:50%" />`;
        overviewAvatar.style.background = 'none';
      } else {
        overviewAvatar.innerHTML = `<span style="font-size:1.8rem;font-weight:700;">${Utils.getInitials(student.fullName)}</span>`;
        overviewAvatar.style.background = Utils.nameToColor(student.fullName);
      }
    }

    // 2. ID Card Photo
    const idCardPhoto = document.getElementById('profile-card-photo');
    if (idCardPhoto) {
      if (isPhoto) {
        idCardPhoto.innerHTML = `<img src="${student.profilePhoto}" alt="${student.fullName}" style="width:100%;height:100%;object-fit:cover;border-radius:12px" />`;
        idCardPhoto.style.background = 'none';
      } else {
        idCardPhoto.innerHTML = `<span style="font-size:3rem;font-weight:700;color:white;">${Utils.getInitials(student.fullName)}</span>`;
        idCardPhoto.style.background = Utils.nameToColor(student.fullName);
      }
    }

    // Update ID details
    Utils.setText('profile-card-name', student.fullName);
    Utils.setText('profile-card-id', student.studentId);
    Utils.setText('profile-card-course', student.course || '—');

    // Sync header / sidebar user avatars inside App if they exist
    if (window.App && App.updateUserHeaderAvatars) {
      App.updateUserHeaderAvatars(student);
    }
  };

  // ============================================================
  // PERSONAL & ACADEMIC INFO DISPLAYS
  // ============================================================
  const renderPersonalInfoDisplay = (student) => {
    const display = document.getElementById('personal-info-display');
    if (!display) return;

    display.innerHTML = `
      <div class="info-grid">
        <div class="info-item"><span class="info-label">Full Name</span><span class="info-value">${Utils.escapeHtml(student.fullName)}</span></div>
        <div class="info-item"><span class="info-label">Email Address</span><span class="info-value">${Utils.escapeHtml(student.email)}</span></div>
        <div class="info-item"><span class="info-label">Phone Number</span><span class="info-value">${Utils.escapeHtml(student.phone || '—')}</span></div>
        <div class="info-item"><span class="info-label">Date of Birth</span><span class="info-value">${Utils.formatDate(student.dob)}</span></div>
        <div class="info-item" style="grid-column: span 2"><span class="info-label">Address</span><span class="info-value">${Utils.escapeHtml(student.address || '—')}</span></div>
      </div>
    `;
  };

  const renderAcademicInfoDisplay = (student) => {
    const display = document.getElementById('academic-info-display');
    if (!display) return;

    display.innerHTML = `
      <div class="info-grid">
        <div class="info-item"><span class="info-label">Student ID</span><span class="info-value" style="font-weight:600;color:var(--text-secondary);">${Utils.escapeHtml(student.studentId)}</span></div>
        <div class="info-item"><span class="info-label">Course Program</span><span class="info-value">${Utils.escapeHtml(student.course || '—')}</span></div>
        <div class="info-item"><span class="info-label">Year Level</span><span class="info-value">${Utils.yearDisplay(student.yearLevel)}</span></div>
        <div class="info-item"><span class="info-label">Student Status</span><span class="info-value">${Utils.statusBadge(student.status)}</span></div>
        <div class="info-item" style="grid-column: span 2"><span class="info-label">Enrollment Date</span><span class="info-value">${Utils.formatDate(student.enrollmentDate)}</span></div>
      </div>
    `;
  };

  // ============================================================
  // PROFILE PERSONAL INFO EDIT FORM
  // ============================================================
  const bindProfileForm = () => {
    const form = document.getElementById('personal-info-form');
    const display = document.getElementById('personal-info-display');
    
    // Toggle edit form view
    document.getElementById('btn-edit-personal')?.addEventListener('click', (e) => {
      e.preventDefault();
      const student = Storage.getUser(currentStudentEmail);
      if (!student) return;

      // Populate input values
      document.getElementById('edit-name').value = student.fullName || '';
      document.getElementById('edit-phone').value = student.phone || '';
      document.getElementById('edit-dob').value = student.dob || '';
      document.getElementById('edit-address').value = student.address || '';

      Auth.clearErrors(['edit-name-error', 'edit-phone-error']);
      Utils.hide(display);
      Utils.show(form);
    });

    // Cancel edit
    document.getElementById('btn-cancel-personal')?.addEventListener('click', (e) => {
      e.preventDefault();
      Utils.hide(form);
      Utils.show(display);
    });

    // Form submission validation & saving
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      Auth.clearErrors(['edit-name-error', 'edit-phone-error']);

      const nameInput = document.getElementById('edit-name');
      const phoneInput = document.getElementById('edit-phone');
      
      const name = nameInput.value.trim();
      const phone = phoneInput.value.trim();
      const dob = document.getElementById('edit-dob').value;
      const address = document.getElementById('edit-address').value.trim();

      let valid = true;
      if (!name) {
        Auth.showFieldError('edit-name-error', 'Full Name is required.');
        valid = false;
      }
      if (phone && !Utils.isValidPhone(phone)) {
        Auth.showFieldError('edit-phone-error', 'Please enter a valid phone number.');
        valid = false;
      }

      if (!valid) return;

      // Update in Storage
      Storage.updateUser(currentStudentEmail, {
        fullName: name,
        phone,
        dob,
        address
      });

      // Add to personal logs
      const updatedUser = Storage.getUser(currentStudentEmail);
      Storage.updateUser(currentStudentEmail, {
        activityLog: [
          { type: 'update', text: 'Updated personal profile information', timestamp: new Date().toISOString() },
          ...(updatedUser.activityLog || []).slice(0, 49)
        ]
      });

      // Add to global admin logs
      Storage.addActivity({
        type: 'update',
        text: `Student <strong>${name}</strong> updated personal details`,
        userEmail: currentStudentEmail,
      });

      Toast.success('Profile Saved', 'Your personal information was updated.');
      
      // Toggle back to display card
      Utils.hide(form);
      Utils.show(display);
      
      refresh();
    });
  };

  // ============================================================
  // QUICK EDIT BINDINGS (Redirects to profile view)
  // ============================================================
  const bindQuickEditTriggers = () => {
    const triggers = ['btn-edit-profile-quick', 'btn-stu-edit-profile'];
    triggers.forEach(id => {
      document.getElementById(id)?.addEventListener('click', (e) => {
        e.preventDefault();
        // Trigger click on Profile sidebar tab
        document.querySelector('.nav-item[data-view="student-profile"]')?.click();
      });
    });
  };

  // ============================================================
  // PHOTO UPLOAD
  // ============================================================
  const bindPhotoUpload = () => {
    const fileInput = document.getElementById('profile-photo-input');

    document.getElementById('btn-change-photo')?.addEventListener('click', (e) => {
      e.preventDefault();
      fileInput?.click();
    });

    fileInput?.addEventListener('change', async () => {
      const file = fileInput.files[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        Toast.error('Format Error', 'Only image files are allowed.');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        Toast.error('Size Limit Exceeded', 'Profile image must be under 2MB.');
        return;
      }

      Loader.show();
      await new Promise(r => setTimeout(r, 500));

      try {
        const dataUrl = await Utils.readFileAsDataURL(file);
        
        // Save photo
        Storage.updateUser(currentStudentEmail, { profilePhoto: dataUrl });

        // Log personal activity
        const student = Storage.getUser(currentStudentEmail);
        Storage.updateUser(currentStudentEmail, {
          activityLog: [
            { type: 'update', text: 'Changed profile photo', timestamp: new Date().toISOString() },
            ...(student.activityLog || []).slice(0, 49)
          ]
        });

        // Log global activity
        Storage.addActivity({
          type: 'update',
          text: `Student <strong>${student.fullName}</strong> updated profile photo`,
          userEmail: currentStudentEmail,
        });

        Toast.success('Photo Updated', 'Your profile image has been saved.');
        refresh();

      } catch (err) {
        Toast.error('Upload Failed', 'Could not process image file.');
        console.error(err);
      } finally {
        fileInput.value = ''; // Reset input
        Loader.hide();
      }
    });
  };

  // ============================================================
  // PRINT PROFILE LOGIC
  // ============================================================
  const bindPrintTriggers = () => {
    const printTriggers = ['btn-print-profile', 'btn-print-profile-2'];
    printTriggers.forEach(id => {
      document.getElementById(id)?.addEventListener('click', (e) => {
        e.preventDefault();
        window.print();
      });
    });
  };

  // ============================================================
  // STUDENT SPECIFIC LOG FEEDS
  // ============================================================
  const refreshStudentActivityFeed = (student) => {
    const recentContainer = document.getElementById('stu-activity-list');
    const fullContainer = document.getElementById('stu-full-activity-list');
    const logs = student.activityLog || [];

    const generateHtml = (activities) => {
      if (activities.length === 0) {
        return '<div class="empty-state-sm"><i class="fas fa-inbox"></i><p>No activity recorded</p></div>';
      }

      return activities.map(act => {
        let icon = 'fa-info-circle';
        let typeClass = 'info';

        switch (act.type) {
          case 'login':
            icon = 'fa-sign-in-alt';
            typeClass = 'login';
            break;
          case 'create':
            icon = 'fa-user-plus';
            typeClass = 'create';
            break;
          case 'update':
            icon = 'fa-user-edit';
            typeClass = 'update';
            break;
          case 'reset':
            icon = 'fa-key';
            typeClass = 'reset';
            break;
        }

        return `
          <div class="activity-item">
            <div class="activity-icon ${typeClass}"><i class="fas ${icon}"></i></div>
            <div class="activity-content">
              <p class="activity-text">${Utils.escapeHtml(act.text)}</p>
              <span class="activity-time">${Utils.timeAgo(act.timestamp)}</span>
            </div>
          </div>
        `;
      }).join('');
    };

    if (recentContainer) {
      recentContainer.innerHTML = generateHtml(logs.slice(0, 5));
    }
    if (fullContainer) {
      fullContainer.innerHTML = generateHtml(logs);
    }
  };

  // ============================================================
  // RENDER STUDENT ENROLLED COURSE DETAILS
  // ============================================================
  const renderEnrolledCourses = (student) => {
    const container = document.getElementById('course-layout');
    if (!container) return;

    const subjects = getSubjectsForCourse(student.course);

    container.innerHTML = subjects.map(sub => `
      <div class="card course-card glass-card">
        <div class="course-card-header">
          <span class="course-code">${Utils.escapeHtml(sub.code)}</span>
          <span class="course-credits">${sub.credits} Credits</span>
        </div>
        <h3 class="course-title">${Utils.escapeHtml(sub.name)}</h3>
        <div class="course-details">
          <p><i class="fas fa-calendar-alt"></i> ${Utils.escapeHtml(sub.schedule)}</p>
          <p><i class="fas fa-user-tie"></i> ${Utils.escapeHtml(sub.instructor)}</p>
        </div>
      </div>
    `).join('');
  };

  return {
    init,
    refresh,
  };
})();
