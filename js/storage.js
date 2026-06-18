/**
 * storage.js – LocalStorage CRUD wrapper & data seeding
 */

const Storage = (() => {
  const KEYS = {
    USERS: 'srms_users',
    CURRENT_USER: 'srms_current_user',
    REMEMBER: 'srms_remember',
    THEME: 'srms_theme',
    ACTIVITY: 'srms_activity',
    SESSION: 'srms_session',
  };

  // ---- Generic helpers ----
  const get = (key, fallback = null) => {
    try {
      const val = localStorage.getItem(key);
      return val !== null ? JSON.parse(val) : fallback;
    } catch { return fallback; }
  };
  const set = (key, val) => {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { console.error('Storage write error:', e); }
  };
  const remove = (key) => localStorage.removeItem(key);

  // ---- Users ----
  const getUsers = () => get(KEYS.USERS, {});
  const setUsers = (users) => set(KEYS.USERS, users);

  const getUser = (email) => {
    const users = getUsers();
    return users[email.toLowerCase()] || null;
  };
  const saveUser = (data) => {
    const users = getUsers();
    users[data.email.toLowerCase()] = { ...data, email: data.email.toLowerCase() };
    setUsers(users);
  };
  const updateUser = (email, updates) => {
    const users = getUsers();
    const key = email.toLowerCase();
    if (users[key]) {
      users[key] = { ...users[key], ...updates };
      setUsers(users);
      return users[key];
    }
    return null;
  };
  const deleteUser = (email) => {
    const users = getUsers();
    delete users[email.toLowerCase()];
    setUsers(users);
  };
  const getAllStudents = () => {
    const users = getUsers();
    return Object.values(users).filter(u => u.role === 'student');
  };
  const emailExists = (email, excludeEmail = null) => {
    const users = getUsers();
    const key = email.toLowerCase();
    if (excludeEmail && key === excludeEmail.toLowerCase()) return false;
    return !!users[key];
  };
  const studentIdExists = (id, excludeEmail = null) => {
    const students = getAllStudents();
    return students.some(s => s.studentId === id && (!excludeEmail || s.email !== excludeEmail.toLowerCase()));
  };

  // ---- Session / Auth ----
  const getSession = () => get(KEYS.SESSION) || get(KEYS.REMEMBER);
  const setSession = (email) => set(KEYS.SESSION, { email, ts: Date.now() });
  const setRemember = (email) => set(KEYS.REMEMBER, { email, ts: Date.now() });
  const clearSession = () => { remove(KEYS.SESSION); };
  const clearRemember = () => { remove(KEYS.REMEMBER); };
  const getLoggedInEmail = () => {
    const s = getSession();
    return s ? s.email : null;
  };

  // ---- Theme ----
  const getTheme = () => get(KEYS.THEME, 'light');
  const setTheme = (theme) => set(KEYS.THEME, theme);

  // ---- Activity Log ----
  const MAX_ACTIVITY = 200;
  const getActivity = () => get(KEYS.ACTIVITY, []);
  const addActivity = (entry) => {
    const log = getActivity();
    log.unshift({ ...entry, id: Utils.uid(), timestamp: new Date().toISOString() });
    if (log.length > MAX_ACTIVITY) log.length = MAX_ACTIVITY;
    set(KEYS.ACTIVITY, log);
  };
  const clearActivity = () => set(KEYS.ACTIVITY, []);

  // ---- Backup / Restore ----
  const exportBackup = () => {
    return JSON.stringify({
      version: '1.0',
      exported: new Date().toISOString(),
      users: getUsers(),
      activity: getActivity(),
      theme: getTheme(),
    }, null, 2);
  };
  const importBackup = (jsonStr) => {
    const data = JSON.parse(jsonStr);
    if (!data.users) throw new Error('Invalid backup file.');
    setUsers(data.users);
    if (data.activity) set(KEYS.ACTIVITY, data.activity);
    if (data.theme) setTheme(data.theme);
  };
  const clearAllData = () => {
    // Keep admin but clear students + activity
    const users = getUsers();
    const admins = {};
    Object.values(users).filter(u => u.role === 'admin').forEach(a => { admins[a.email] = a; });
    setUsers(admins);
    clearActivity();
  };

  // ---- Seed Data ----
  const seedIfEmpty = () => {
    const users = getUsers();
    if (Object.keys(users).length > 0) return; // already seeded

    // Admin account
    const adminPass = Utils.hashPassword('Admin@123');
    users['admin@srms.edu'] = {
      role: 'admin',
      email: 'admin@srms.edu',
      fullName: 'System Administrator',
      passwordHash: adminPass,
      createdAt: new Date().toISOString(),
    };

    // Sample students
    const sampleStudents = [
      { studentId: 'S2024001', fullName: 'Alice Johnson', email: 'alice.johnson@students.srms.edu', phone: '+1-555-0101', dob: '2002-03-15', address: '123 Elm St, Springfield', course: 'Bachelor of Science in Computer Science', yearLevel: '3', enrollmentDate: '2022-08-15', status: 'Active' },
      { studentId: 'S2024002', fullName: 'Bob Martinez', email: 'bob.martinez@students.srms.edu', phone: '+1-555-0102', dob: '2001-07-22', address: '456 Oak Ave, Rivertown', course: 'Bachelor of Science in Information Technology', yearLevel: '4', enrollmentDate: '2021-08-12', status: 'Active' },
      { studentId: 'S2024003', fullName: 'Carol Chen', email: 'carol.chen@students.srms.edu', phone: '+1-555-0103', dob: '2000-11-05', address: '789 Pine Rd, Lakeside', course: 'Bachelor of Business Administration', yearLevel: 'Graduate', enrollmentDate: '2020-08-10', status: 'Graduated' },
      { studentId: 'S2024004', fullName: 'David Kim', email: 'david.kim@students.srms.edu', phone: '+1-555-0104', dob: '2003-01-30', address: '321 Maple Dr, Hillview', course: 'Bachelor of Science in Engineering', yearLevel: '2', enrollmentDate: '2023-08-14', status: 'Active' },
      { studentId: 'S2024005', fullName: 'Emma Wilson', email: 'emma.wilson@students.srms.edu', phone: '+1-555-0105', dob: '2002-09-18', address: '654 Birch Ln, Maplewood', course: 'Bachelor of Science in Nursing', yearLevel: '3', enrollmentDate: '2022-08-16', status: 'Active' },
      { studentId: 'S2024006', fullName: 'Frank Davis', email: 'frank.davis@students.srms.edu', phone: '+1-555-0106', dob: '2001-04-12', address: '987 Cedar St, Brookfield', course: 'Bachelor of Arts in English', yearLevel: '4', enrollmentDate: '2021-08-11', status: 'Suspended' },
      { studentId: 'S2024007', fullName: 'Grace Lee', email: 'grace.lee@students.srms.edu', phone: '+1-555-0107', dob: '2003-06-25', address: '147 Walnut Ave, Clearview', course: 'Bachelor of Education', yearLevel: '1', enrollmentDate: '2024-01-08', status: 'Active' },
      { studentId: 'S2024008', fullName: 'Henry Brown', email: 'henry.brown@students.srms.edu', phone: '+1-555-0108', dob: '2000-12-10', address: '258 Spruce Ct, Fairview', course: 'Master of Business Administration', yearLevel: 'Graduate', enrollmentDate: '2023-01-09', status: 'Active' },
      { studentId: 'S2024009', fullName: 'Iris Taylor', email: 'iris.taylor@students.srms.edu', phone: '+1-555-0109', dob: '2002-08-03', address: '369 Ash Blvd, Westridge', course: 'Bachelor of Fine Arts', yearLevel: '3', enrollmentDate: '2022-08-15', status: 'Withdrawn' },
      { studentId: 'S2024010', fullName: 'Jack Anderson', email: 'jack.anderson@students.srms.edu', phone: '+1-555-0110', dob: '2001-02-14', address: '741 Poplar Way, Eastwood', course: 'Bachelor of Science in Mathematics', yearLevel: '4', enrollmentDate: '2021-08-13', status: 'Active' },
      { studentId: 'S2024011', fullName: 'Kelly Moore', email: 'kelly.moore@students.srms.edu', phone: '+1-555-0111', dob: '2003-10-07', address: '852 Hickory Rd, Northside', course: 'Bachelor of Science in Computer Science', yearLevel: '1', enrollmentDate: '2024-01-10', status: 'Active' },
      { studentId: 'S2024012', fullName: 'Liam Jackson', email: 'liam.jackson@students.srms.edu', phone: '+1-555-0112', dob: '2000-05-20', address: '963 Willow Dr, Southgate', course: 'Master of Science in Computer Science', yearLevel: 'Graduate', enrollmentDate: '2023-08-14', status: 'Active' },
    ];

    const defaultPass = Utils.hashPassword('Student@123');
    sampleStudents.forEach(s => {
      users[s.email] = {
        ...s,
        role: 'student',
        passwordHash: defaultPass,
        profilePhoto: null,
        activityLog: [
          { type: 'create', text: 'Account created', timestamp: new Date(Date.now() - Math.random() * 90 * 86400000).toISOString() }
        ],
        createdAt: s.enrollmentDate,
      };
    });

    setUsers(users);

    // Seed global activity
    const now = Date.now();
    const activities = sampleStudents.slice(0, 5).map((s, i) => ({
      id: Utils.uid(),
      type: 'create',
      text: `New student <strong>${s.fullName}</strong> registered`,
      timestamp: new Date(now - (i + 1) * 3600000).toISOString(),
    }));
    set(KEYS.ACTIVITY, activities);
  };

  return {
    KEYS,
    get, set, remove,
    getUsers, setUsers, getUser, saveUser, updateUser, deleteUser,
    getAllStudents, emailExists, studentIdExists,
    getSession, setSession, setRemember, clearSession, clearRemember, getLoggedInEmail,
    getTheme, setTheme,
    getActivity, addActivity, clearActivity,
    exportBackup, importBackup, clearAllData,
    seedIfEmpty,
  };
})();
