/**
 * helpers.js – Exportable helper utilities for React conversion
 */

// Unique ID
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

// Password hashing (XOR + Base64, backward-compatible with legacy storage)
export const hashPassword = (password) => {
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

export const verifyPassword = (password, hash) => hashPassword(password) === hash;

// Email & Phone validations
export const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

export const isValidPhone = (phone) => /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{3,5}[-\s\.]?[0-9]{4,6}$/.test(phone.replace(/\s/g, ''));

// Password strength indicator
export const getPasswordStrength = (password) => {
  let score = 0;
  if (!password) return { score: 0, label: 'Enter a password', color: '#999' };
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { score: Math.round((score / 6) * 30), label: 'Weak', color: 'hsl(0,75%,55%)' };
  if (score <= 3) return { score: Math.round((score / 6) * 100), label: 'Fair', color: 'hsl(38,92%,50%)' };
  if (score <= 4) return { score: Math.round((score / 6) * 100), label: 'Good', color: 'hsl(200,85%,50%)' };
  return { score: Math.round((score / 6) * 100), label: 'Strong', color: 'hsl(142,70%,45%)' };
};

export const isStrongPassword = (password) => {
  return password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password);
};

// Generate student ID
export const generateStudentId = () => {
  const year = new Date().getFullYear();
  const rand = String(Math.floor(Math.random() * 9000) + 1000);
  return `S${year}${rand}`;
};

// Date Formatters
export const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return dateStr; }
};

export const formatDateShort = (dateStr) => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return dateStr; }
};

export const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return dateStr; }
};

export const timeAgo = (dateStr) => {
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

// Name initials
export const getInitials = (name) => {
  if (!name) return '?';
  return name.trim().split(/\s+/).map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

// Consistent name background colors
export const nameToColor = (name) => {
  if (!name) return 'hsl(220,85%,57%)';
  let hash = 0;
  for (let c of name) hash = ((hash << 5) - hash) + c.charCodeAt(0);
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue},60%,45%)`;
};

// Year Level translator
export const yearDisplay = (year) => {
  const map = { '1': '1st Year', '2': '2nd Year', '3': '3rd Year', '4': '4th Year', '5': '5th Year', 'Graduate': 'Graduate' };
  return map[year] || year || '—';
};

// CSV Utilities
export const studentsToCSV = (students) => {
  const headers = [
    'Student ID', 'Full Name', 'Email', 'Phone', 'Date of Birth', 'Address', 'Course', 'Year Level', 'Enrollment Date', 'Status',
    'Placement Eligibility', 'Placement Status', 'Companies Applied', 'Companies Shortlisted', 'Companies Selected', 'Offers Received',
    'Highest Package', 'Average Package', 'Internship Details', 'Joining Status', 'Interview Status', 'Offer Letter Status',
    'Offers'
  ];
  const rows = students.map(s => {
    const p = s.placement || {};
    return [
      s.studentId, s.fullName, s.email, s.phone, s.dob,
      s.address, s.course, s.yearLevel, s.enrollmentDate, s.status,
      p.eligibility || 'Eligible',
      p.status || 'Unplaced',
      p.appliedCount || 0,
      p.shortlistedCount || 0,
      p.selectedCount || 0,
      p.offersCount || 0,
      p.highestPackage || 0,
      p.averagePackage || 0,
      p.internshipDetails || '',
      p.joiningStatus || 'Not Placed',
      p.interviewStatus || 'None',
      p.offerLetterStatus || 'Not Applicable',
      JSON.stringify(p.offers || [])
    ].map(v => `"${(v === undefined || v === null ? '' : String(v)).replace(/"/g, '""')}"`).join(',');
  });
  return [headers.join(','), ...rows].join('\n');
};

export const csvToStudents = (csvStr) => {
  const lines = csvStr.trim().split('\n');
  if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row.');
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase().replace(/\s+/g, ''));
  return lines.slice(1).map((line) => {
    const vals = parseCSVLine(line);
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = (vals[idx] || '').trim(); });

    let offers = [];
    try {
      if (obj.offers) {
        offers = JSON.parse(obj.offers.replace(/""/g, '"'));
      }
    } catch (e) {
      console.warn("Failed parsing CSV offers JSON:", e);
    }

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
      placement: {
        eligibility: obj.placementeligibility || 'Eligible',
        status: obj.placementstatus || 'Unplaced',
        appliedCount: parseInt(obj.companiesapplied) || 0,
        shortlistedCount: parseInt(obj.companiesshortlisted) || 0,
        selectedCount: parseInt(obj.companiesselected) || 0,
        offersCount: parseInt(obj.offersreceived) || 0,
        highestPackage: parseFloat(obj.highestpackage) || 0,
        averagePackage: parseFloat(obj.averagepackage) || 0,
        internshipDetails: obj.internshipdetails || '',
        joiningStatus: obj.joiningstatus || 'Not Placed',
        interviewStatus: obj.interviewstatus || 'None',
        offerLetterStatus: obj.offerletterstatus || 'Not Applicable',
        offers: offers,
        placementHistory: [
          { date: new Date().toISOString().split('T')[0], event: 'Imported from CSV file' }
        ]
      },
      trainingProgress: {
        aptitudeSolved: 0,
        aptitudeTotal: 10,
        codingSolved: 0,
        codingTotal: 6,
        quizzesTaken: [],
        codingProblemsSolved: [],
        companyPrepViewed: []
      }
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

// Browser download helpers
export const downloadFile = (content, filename, mimeType = 'text/plain') => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// File Reader promises
export const readFileAsText = (file) => new Promise((res, rej) => {
  const reader = new FileReader();
  reader.onload = e => res(e.target.result);
  reader.onerror = rej;
  reader.readAsText(file);
});

export const readFileAsDataURL = (file) => new Promise((res, rej) => {
  const reader = new FileReader();
  reader.onload = e => res(e.target.result);
  reader.onerror = rej;
  reader.readAsDataURL(file);
});

// HTML escaping helper
export const escapeHtml = (str) => {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
};
