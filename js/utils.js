/**
 * utils.js – Shared utility functions
 */

const Utils = (() => {

  // ---- Unique ID ----
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

  // ---- Simple password hash (SHA-256 via Web Crypto) ----
  // For demo: synchronous pseudo-hash using btoa + XOR
  const hashPassword = (password) => {
    // Simple deterministic hash for demo (NOT for production!)
    let hash = 0;
    const salt = 'SRMS_SALT_2024';
    const salted = password + salt;
    for (let i = 0; i < salted.length; i++) {
      const chr = salted.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0;
    }
    return btoa(salted.split('').reverse().join('') + hash.toString(16)).replace(/[^a-zA-Z0-9]/g, 'x');
  };

  const verifyPassword = (password, hash) => hashPassword(password) === hash;

  // ---- Email Validation ----
  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  // ---- Phone Validation ----
  const isValidPhone = (phone) => /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{3,5}[-\s\.]?[0-9]{4,6}$/.test(phone.replace(/\s/g, ''));

  // ---- Password Strength ----
  const getPasswordStrength = (password) => {
    let score = 0;
    if (!password) return { score: 0, label: 'Enter a password', color: '#999' };
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return { score: Math.round((score/6)*30), label: 'Weak', color: 'hsl(0,75%,55%)' };
    if (score <= 3) return { score: Math.round((score/6)*100), label: 'Fair', color: 'hsl(38,92%,50%)' };
    if (score <= 4) return { score: Math.round((score/6)*100), label: 'Good', color: 'hsl(200,85%,50%)' };
    return { score: Math.round((score/6)*100), label: 'Strong', color: 'hsl(142,70%,45%)' };
  };

  const isStrongPassword = (password) => {
    return password.length >= 8 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /[0-9]/.test(password);
  };

  // ---- Auto-generate Student ID ----
  const generateStudentId = () => {
    const year = new Date().getFullYear();
    const rand = String(Math.floor(Math.random() * 9000) + 1000);
    return `S${year}${rand}`;
  };

  // ---- Format Date ----
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch { return dateStr; }
  };
  const formatDateShort = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch { return dateStr; }
  };
  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return dateStr; }
  };
  const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return formatDateShort(dateStr);
  };

  // ---- Get initials ----
  const getInitials = (name) => {
    if (!name) return '?';
    return name.trim().split(/\s+/).map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // ---- Status badge HTML ----
  const statusBadge = (status) => {
    const map = {
      'Active': 'active',
      'Graduated': 'graduated',
      'Suspended': 'suspended',
      'Withdrawn': 'withdrawn',
    };
    const cls = map[status] || 'active';
    return `<span class="badge badge-${cls}">${status}</span>`;
  };

  // ---- Avatar HTML (photo or initials) ----
  const avatarHtml = (student, size = 'sm') => {
    if (student.profilePhoto) {
      return `<div class="student-avatar-sm"><img src="${student.profilePhoto}" alt="${student.fullName}" /></div>`;
    }
    return `<div class="student-avatar-sm" style="background:${nameToColor(student.fullName)}">${getInitials(student.fullName)}</div>`;
  };

  // ---- Name to consistent color ----
  const nameToColor = (name) => {
    if (!name) return 'hsl(220,85%,57%)';
    let hash = 0;
    for (let c of name) hash = ((hash << 5) - hash) + c.charCodeAt(0);
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue},60%,45%)`;
  };

  // ---- Year level display ----
  const yearDisplay = (year) => {
    const map = { '1': '1st Year', '2': '2nd Year', '3': '3rd Year', '4': '4th Year', '5': '5th Year', 'Graduate': 'Graduate' };
    return map[year] || year || '—';
  };

  // ---- CSV Export ----
  const studentsToCSV = (students) => {
    const headers = ['Student ID', 'Full Name', 'Email', 'Phone', 'Date of Birth', 'Address', 'Course', 'Year Level', 'Enrollment Date', 'Status'];
    const rows = students.map(s => [
      s.studentId, s.fullName, s.email, s.phone, s.dob,
      s.address, s.course, s.yearLevel, s.enrollmentDate, s.status,
    ].map(v => `"${(v || '').replace(/"/g, '""')}"`).join(','));
    return [headers.join(','), ...rows].join('\n');
  };

  // ---- CSV Import ----
  const csvToStudents = (csvStr) => {
    const lines = csvStr.trim().split('\n');
    if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row.');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase().replace(/\s+/g, ''));
    return lines.slice(1).map((line, i) => {
      const vals = parseCSVLine(line);
      const obj = {};
      headers.forEach((h, idx) => { obj[h] = (vals[idx] || '').trim(); });
      return {
        studentId: obj.studentid || obj['studentid'] || '',
        fullName: obj.fullname || obj.name || '',
        email: obj.email || '',
        phone: obj.phone || obj.phonenumber || '',
        dob: obj.dateofbirth || obj.dob || '',
        address: obj.address || '',
        course: obj.course || obj['course/program'] || '',
        yearLevel: obj.yearlevel || obj.year || '',
        enrollmentDate: obj.enrollmentdate || '',
        status: obj.status || 'Active',
      };
    }).filter(r => r.email || r.fullName);
  };
  const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { inQuotes = !inQuotes; }
      else if (line[i] === ',' && !inQuotes) { result.push(current); current = ''; }
      else { current += line[i]; }
    }
    result.push(current);
    return result;
  };

  // ---- Download helper ----
  const downloadFile = (content, filename, mimeType = 'text/plain') => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ---- Read file as text ----
  const readFileAsText = (file) => new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = e => res(e.target.result);
    reader.onerror = rej;
    reader.readAsText(file);
  });

  // ---- Read file as DataURL ----
  const readFileAsDataURL = (file) => new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = e => res(e.target.result);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });

  // ---- Debounce ----
  const debounce = (fn, delay) => {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
  };

  // ---- Escape HTML ----
  const escapeHtml = (str) => {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  };

  // ---- Set element content safely ----
  const setText = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val || '—';
  };
  const setHtml = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = val || '';
  };

  // ---- Show/Hide ----
  const show = (el) => { if (typeof el === 'string') el = document.getElementById(el); if (el) el.classList.remove('hidden'); };
  const hide = (el) => { if (typeof el === 'string') el = document.getElementById(el); if (el) el.classList.add('hidden'); };
  const toggle = (el, force) => {
    if (typeof el === 'string') el = document.getElementById(el);
    if (!el) return;
    if (force !== undefined) el.classList.toggle('hidden', !force);
    else el.classList.toggle('hidden');
  };

  // ---- $ shorthand ----
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  // ---- Animate number count-up ----
  const animateNumber = (el, target, duration = 600) => {
    if (!el) return;
    const start = parseInt(el.textContent) || 0;
    const range = target - start;
    const startTime = performance.now();
    const update = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(start + range * ease);
      if (progress < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  };

  return {
    uid, hashPassword, verifyPassword,
    isValidEmail, isValidPhone, getPasswordStrength, isStrongPassword,
    generateStudentId, formatDate, formatDateShort, formatDateTime, timeAgo,
    getInitials, statusBadge, avatarHtml, nameToColor, yearDisplay,
    studentsToCSV, csvToStudents,
    downloadFile, readFileAsText, readFileAsDataURL,
    debounce, escapeHtml,
    setText, setHtml, show, hide, toggle,
    $, $$, animateNumber,
  };
})();
