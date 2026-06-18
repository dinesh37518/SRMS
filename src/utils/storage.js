/**
 * storage.js – Data persistence utilities (React compatible)
 */

import { uid, hashPassword } from './helpers.js';

const KEYS = {
  USERS: 'srms_users',
  CURRENT_USER: 'srms_current_user',
  REMEMBER: 'srms_remember',
  THEME: 'srms_theme',
  ACTIVITY: 'srms_activity',
  SESSION: 'srms_session',
  TRAINING_APTITUDE: 'srms_training_aptitude',
  TRAINING_CODING: 'srms_training_coding',
  TRAINING_COMPANY: 'srms_training_company',
  COLLEGE_PROFILE: 'srms_college_profile',
};

// Training API accessors
export const getAptitudeQuestions = () => get(KEYS.TRAINING_APTITUDE, []);
export const setAptitudeQuestions = (questions) => set(KEYS.TRAINING_APTITUDE, questions);

export const getCodingQuestions = () => get(KEYS.TRAINING_CODING, []);
export const setCodingQuestions = (questions) => set(KEYS.TRAINING_CODING, questions);

export const getCompanyPrep = () => get(KEYS.TRAINING_COMPANY, {});
export const setCompanyPrep = (content) => set(KEYS.TRAINING_COMPANY, content);

// Generic read/write helpers
export const get = (key, fallback = null) => {
  try {
    const val = localStorage.getItem(key);
    return val !== null ? JSON.parse(val) : fallback;
  } catch { return fallback; }
};

export const set = (key, val) => {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { console.error('Storage write error:', e); }
};

export const remove = (key) => localStorage.removeItem(key);

// Users API
export const getUsers = () => get(KEYS.USERS, {});

export const setUsers = (users) => set(KEYS.USERS, users);

export const getUser = (email) => {
  if (!email) return null;
  const users = getUsers();
  return users[email.toLowerCase()] || null;
};

export const saveUser = (data) => {
  const users = getUsers();
  users[data.email.toLowerCase()] = { ...data, email: data.email.toLowerCase() };
  setUsers(users);
};

export const updateUser = (email, updates) => {
  const users = getUsers();
  const key = email.toLowerCase();
  if (users[key]) {
    users[key] = { ...users[key], ...updates };
    setUsers(users);
    return users[key];
  }
  return null;
};

export const deleteUser = (email) => {
  const users = getUsers();
  delete users[email.toLowerCase()];
  setUsers(users);
};

export const getAllStudents = () => {
  const users = getUsers();
  return Object.values(users).filter(u => u.role === 'student');
};

export const emailExists = (email, excludeEmail = null) => {
  const users = getUsers();
  const key = email.toLowerCase();
  if (excludeEmail && key === excludeEmail.toLowerCase()) return false;
  return !!users[key];
};

export const studentIdExists = (id, excludeEmail = null) => {
  const students = getAllStudents();
  return students.some(s => s.studentId === id && (!excludeEmail || s.email !== excludeEmail.toLowerCase()));
};

export const registerNumberExists = (regNo, excludeEmail = null) => {
  if (!regNo) return false;
  const students = getAllStudents();
  return students.some(s => s.registerNumber && s.registerNumber.toLowerCase() === regNo.toLowerCase() && (!excludeEmail || s.email !== excludeEmail.toLowerCase()));
};

// College Profile
export const getCollegeProfile = () => get(KEYS.COLLEGE_PROFILE, { name: '', address: '', registerNumber: '' });
export const setCollegeProfile = (profile) => set(KEYS.COLLEGE_PROFILE, profile);

// Session & Auth management
export const getSession = () => get(KEYS.SESSION) || get(KEYS.REMEMBER);

export const setSession = (email) => set(KEYS.SESSION, { email, ts: Date.now() });

export const setRemember = (email) => set(KEYS.REMEMBER, { email, ts: Date.now() });

export const clearSession = () => { remove(KEYS.SESSION); };

export const clearRemember = () => { remove(KEYS.REMEMBER); };

export const getLoggedInEmail = () => {
  const s = getSession();
  return s ? s.email : null;
};

// Theme preferences
export const getTheme = () => get(KEYS.THEME, 'light');

export const setTheme = (theme) => set(KEYS.THEME, theme);

// Activity Log
const MAX_ACTIVITY = 200;

export const getActivity = () => get(KEYS.ACTIVITY, []);

export const addActivity = (entry) => {
  const log = getActivity();
  log.unshift({ ...entry, id: uid(), timestamp: new Date().toISOString() });
  if (log.length > MAX_ACTIVITY) log.length = MAX_ACTIVITY;
  set(KEYS.ACTIVITY, log);
};

export const clearActivity = () => set(KEYS.ACTIVITY, []);

// Backup & Restore operations
export const exportBackup = () => {
  return JSON.stringify({
    version: '1.0',
    exported: new Date().toISOString(),
    users: getUsers(),
    activity: getActivity(),
    theme: getTheme(),
  }, null, 2);
};

export const importBackup = (jsonStr) => {
  const data = JSON.parse(jsonStr);
  if (!data.users) throw new Error('Invalid backup file.');
  setUsers(data.users);
  if (data.activity) set(KEYS.ACTIVITY, data.activity);
  if (data.theme) setTheme(data.theme);
};

export const clearAllData = () => {
  const users = getUsers();
  const admins = {};
  Object.values(users).filter(u => u.role === 'admin').forEach(a => { admins[a.email] = a; });
  setUsers(admins);
  clearActivity();
};

// Seeding Default Database
export const seedIfEmpty = () => {
  // Seed default college profile if not set
  if (!localStorage.getItem(KEYS.COLLEGE_PROFILE)) {
    setCollegeProfile({
      name: 'Sri Ramakrishna Engineering College',
      address: 'Vattamalaipalayam, S.R.K.V. Post, Coimbatore, Tamil Nadu 641022',
      registerNumber: 'SREC-6112'
    });
  }

  const users = getUsers();
  if (Object.keys(users).length > 0) return; // Database already seeded

  // Seed Admin Account
  const adminPass = hashPassword('Admin@123');
  users['admin@srms.edu'] = {
    role: 'admin',
    email: 'admin@srms.edu',
    fullName: 'System Administrator',
    passwordHash: adminPass,
    createdAt: new Date().toISOString(),
  };

  // Seed Sample Students (Engineering courses only)
  const sampleStudents = [
    { studentId: 'S2024001', registerNumber: 'REG2024001', fullName: 'Arjun Sharma', email: 'arjun.sharma@students.srms.edu', phone: '+91-9876543201', dob: '2002-03-15', address: '12 Anna Nagar, Chennai', course: 'B.E. Computer Science and Engineering', yearLevel: '3', enrollmentDate: '2022-08-15', status: 'Active' },
    { studentId: 'S2024002', registerNumber: 'REG2024002', fullName: 'Priya Rajan', email: 'priya.rajan@students.srms.edu', phone: '+91-9876543202', dob: '2001-07-22', address: '45 T. Nagar, Chennai', course: 'B.E. Electronics and Communication Engineering', yearLevel: '4', enrollmentDate: '2021-08-12', status: 'Active' },
    { studentId: 'S2024003', registerNumber: 'REG2024003', fullName: 'Karthik Venkat', email: 'karthik.venkat@students.srms.edu', phone: '+91-9876543203', dob: '2000-11-05', address: '78 Velachery Main Rd, Chennai', course: 'M.E. Computer Science and Engineering', yearLevel: 'Graduate', enrollmentDate: '2020-08-10', status: 'Graduated' },
    { studentId: 'S2024004', registerNumber: 'REG2024004', fullName: 'Deepa Krishnan', email: 'deepa.krishnan@students.srms.edu', phone: '+91-9876543204', dob: '2003-01-30', address: '23 Porur, Chennai', course: 'B.E. Electrical and Electronics Engineering', yearLevel: '2', enrollmentDate: '2023-08-14', status: 'Active' },
    { studentId: 'S2024005', registerNumber: 'REG2024005', fullName: 'Rahul Murugan', email: 'rahul.murugan@students.srms.edu', phone: '+91-9876543205', dob: '2002-09-18', address: '56 Tambaram, Chennai', course: 'B.E. Mechanical Engineering', yearLevel: '3', enrollmentDate: '2022-08-16', status: 'Active' },
    { studentId: 'S2024006', registerNumber: 'REG2024006', fullName: 'Divya Nair', email: 'divya.nair@students.srms.edu', phone: '+91-9876543206', dob: '2001-04-12', address: '89 Chromepet, Chennai', course: 'B.Tech Information Technology', yearLevel: '4', enrollmentDate: '2021-08-11', status: 'Suspended' },
    { studentId: 'S2024007', registerNumber: 'REG2024007', fullName: 'Vishnu Balaji', email: 'vishnu.balaji@students.srms.edu', phone: '+91-9876543207', dob: '2003-06-25', address: '34 Avadi, Chennai', course: 'B.Tech Artificial Intelligence and Data Science', yearLevel: '1', enrollmentDate: '2024-01-08', status: 'Active' },
    { studentId: 'S2024008', registerNumber: 'REG2024008', fullName: 'Ananya Subramanian', email: 'ananya.sub@students.srms.edu', phone: '+91-9876543208', dob: '2000-12-10', address: '67 Guindy, Chennai', course: 'M.E. Power Electronics and Drives', yearLevel: 'Graduate', enrollmentDate: '2023-01-09', status: 'Active' },
    { studentId: 'S2024009', registerNumber: 'REG2024009', fullName: 'Surya Prakash', email: 'surya.prakash@students.srms.edu', phone: '+91-9876543209', dob: '2002-08-03', address: '11 Poonamallee, Chennai', course: 'B.E. Civil Engineering', yearLevel: '3', enrollmentDate: '2022-08-15', status: 'Withdrawn' },
    { studentId: 'S2024010', registerNumber: 'REG2024010', fullName: 'Meena Selvam', email: 'meena.selvam@students.srms.edu', phone: '+91-9876543210', dob: '2001-02-14', address: '90 Maduravoyal, Chennai', course: 'B.Tech Cyber Security', yearLevel: '4', enrollmentDate: '2021-08-13', status: 'Active' },
    { studentId: 'S2024011', registerNumber: 'REG2024011', fullName: 'Arun Kumar', email: 'arun.kumar@students.srms.edu', phone: '+91-9876543211', dob: '2003-10-07', address: '55 Sholinganallur, Chennai', course: 'B.Tech Robotics and Automation', yearLevel: '1', enrollmentDate: '2024-01-10', status: 'Active' },
    { studentId: 'S2024012', registerNumber: 'REG2024012', fullName: 'Pavithra Devi', email: 'pavithra.devi@students.srms.edu', phone: '+91-9876543212', dob: '2000-05-20', address: '22 Thiruvanmiyur, Chennai', course: 'M.E. Structural Engineering', yearLevel: 'Graduate', enrollmentDate: '2023-08-14', status: 'Active' },
  ];

  const defaultPass = hashPassword('Student@123');
  sampleStudents.forEach((s, idx) => {
    // Generate simulated placement details
    let eligibility = 'Eligible';
    let placementStatus = 'Unplaced';
    let appliedCount = 0;
    let shortlistedCount = 0;
    let selectedCount = 0;
    let offersCount = 0;
    let highestPackage = 0;
    let averagePackage = 0;
    let internshipDetails = '';
    let joiningStatus = 'Not Placed';
    let interviewStatus = 'None';
    let offerLetterStatus = 'Not Applicable';
    let offers = [];
    let history = [
      { date: s.enrollmentDate, event: 'Enrolled in course program' },
      { date: new Date(new Date(s.enrollmentDate).getTime() + 180 * 24 * 3600000).toISOString().split('T')[0], event: 'Registered with Training & Placement Cell' }
    ];

    if (s.status === 'Suspended' || s.status === 'Withdrawn' || s.yearLevel === '1' || s.yearLevel === '2') {
      eligibility = 'Not Eligible';
    }

    if (eligibility === 'Eligible') {
      if (s.status === 'Graduated' || s.studentId === 'S2024002' || s.studentId === 'S2024008' || s.studentId === 'S2024010') {
        placementStatus = 'Placed';
        appliedCount = 5 + (idx % 3);
        shortlistedCount = 3;
        selectedCount = 2;
        offersCount = 2;
        joiningStatus = 'Joined';
        interviewStatus = 'Completed';
        offerLetterStatus = 'Received';
        
        let comp1 = idx % 2 === 0 ? 'Zoho' : 'TCS';
        let comp2 = idx % 2 === 0 ? 'Infosys' : 'Accenture';
        let sal1 = idx % 2 === 0 ? 8.5 : 4.2;
        let sal2 = idx % 2 === 0 ? 3.6 : 6.5;
        
        offers = [
          { company: comp1, role: 'Software Engineer', salary: sal1, status: 'Selected', interviewStatus: 'Completed', joiningStatus: 'Joined', offerLetterStatus: 'Received' },
          { company: comp2, role: 'Associate Software Engineer', salary: sal2, status: 'Selected', interviewStatus: 'Completed', joiningStatus: 'Declined', offerLetterStatus: 'Received' }
        ];
        highestPackage = Math.max(sal1, sal2);
        averagePackage = parseFloat(((sal1 + sal2) / 2).toFixed(2));
        internshipDetails = `Completed 6-month software development internship at ${comp1}`;
        history.push(
          { date: '2025-09-15', event: `Applied to ${comp2}` },
          { date: '2025-10-10', event: `Shortlisted for ${comp2} technical and HR rounds` },
          { date: '2025-10-22', event: `Received job offer from ${comp2} with package ${sal2} LPA` },
          { date: '2025-11-05', event: `Applied to ${comp1}` },
          { date: '2025-12-01', event: `Offered Software Developer role at ${comp1} with package of ${sal1} LPA` },
          { date: '2026-01-15', event: `Accepted offer from ${comp1} and marked joining status as Joined` }
        );
      } else if (idx % 2 === 0) {
        placementStatus = 'In Progress';
        appliedCount = 3;
        shortlistedCount = 1;
        selectedCount = 0;
        offersCount = 0;
        interviewStatus = 'Scheduled';
        joiningStatus = 'Not Placed';
        offerLetterStatus = 'Not Applicable';
        offers = [
          { company: 'Wipro', role: 'Project Engineer', salary: 3.5, status: 'Shortlisted', interviewStatus: 'Scheduled', joiningStatus: 'Pending', offerLetterStatus: 'Pending' },
          { company: 'Cognizant', role: 'Programmer Analyst', salary: 4.0, status: 'Applied', interviewStatus: 'Pending', joiningStatus: 'Pending', offerLetterStatus: 'Pending' }
        ];
        history.push(
          { date: '2026-04-10', event: 'Applied to Cognizant' },
          { date: '2026-05-02', event: 'Applied to Wipro' },
          { date: '2026-05-20', event: 'Shortlisted for Wipro technical interview rounds' }
        );
      } else {
        placementStatus = 'Unplaced';
        appliedCount = 2;
        offers = [
          { company: 'Capgemini', role: 'Software Analyst', salary: 4.2, status: 'Applied', interviewStatus: 'Pending', joiningStatus: 'Pending', offerLetterStatus: 'Pending' }
        ];
        history.push(
          { date: '2026-05-15', event: 'Applied to Capgemini' }
        );
      }
    }

    const trainingProgress = {
      aptitudeSolved: 0,
      aptitudeTotal: 10,
      codingSolved: 0,
      codingTotal: 6,
      quizzesTaken: [],
      codingProblemsSolved: [],
      companyPrepViewed: []
    };

    if (placementStatus === 'Placed') {
      trainingProgress.aptitudeSolved = 8;
      trainingProgress.codingSolved = 5;
      trainingProgress.quizzesTaken = [
        { category: 'Quantitative Aptitude', score: 80, date: '2026-02-15' },
        { category: 'Logical Reasoning', score: 100, date: '2026-02-18' },
        { category: 'Verbal Ability', score: 80, date: '2026-02-20' },
        { category: 'Data Interpretation', score: 60, date: '2026-02-25' }
      ];
      trainingProgress.codingProblemsSolved = ['code_py_1', 'code_cpp_2', 'code_java_3', 'code_js_5', 'code_sql_4'];
      trainingProgress.companyPrepViewed = [idx % 2 === 0 ? 'Zoho' : 'TCS', 'Infosys'];
    } else if (placementStatus === 'In Progress') {
      trainingProgress.aptitudeSolved = 4;
      trainingProgress.codingSolved = 2;
      trainingProgress.quizzesTaken = [
        { category: 'Quantitative Aptitude', score: 60, date: '2026-04-05' },
        { category: 'Logical Reasoning', score: 80, date: '2026-04-12' }
      ];
      trainingProgress.codingProblemsSolved = ['code_py_1', 'code_c_6'];
      trainingProgress.companyPrepViewed = ['Wipro'];
    }

    users[s.email] = {
      ...s,
      role: 'student',
      passwordHash: defaultPass,
      profilePhoto: null,
      placement: {
        eligibility,
        status: placementStatus,
        appliedCount,
        shortlistedCount,
        selectedCount,
        offersCount,
        offers,
        highestPackage,
        averagePackage,
        internshipDetails,
        joiningStatus,
        interviewStatus,
        offerLetterStatus,
        placementHistory: history
      },
      trainingProgress,
      activityLog: [
        { type: 'create', text: 'Account created', timestamp: new Date(Date.now() - Math.random() * 90 * 86400000).toISOString() }
      ],
      createdAt: s.enrollmentDate,
    };
  });

  setUsers(users);

  // Seed Aptitude Questions
  const aptitudeQ = [
    {
      id: 'apt_quant_1',
      category: 'Quantitative Aptitude',
      question: 'A train running at the speed of 60 km/hr crosses a pole in 9 seconds. What is the length of the train?',
      options: ['120 meters', '150 meters', '324 meters', '180 meters'],
      correctOption: 1,
      explanation: 'Speed = 60 * (5/18) m/sec = 50/3 m/sec. Length of train = Speed * Time = (50/3) * 9 = 150 meters.'
    },
    {
      id: 'apt_quant_2',
      category: 'Quantitative Aptitude',
      question: 'The average weight of 8 persons increases by 2.5 kg when a new person comes in place of one of them weighing 65 kg. What is the weight of the new person?',
      options: ['70 kg', '75 kg', '80 kg', '85 kg'],
      correctOption: 3,
      explanation: 'Total weight increase = 8 * 2.5 = 20 kg. Weight of new person = 65 + 20 = 85 kg.'
    },
    {
      id: 'apt_logic_1',
      category: 'Logical Reasoning',
      question: 'Look at this series: 2, 1, (1/2), (1/4), ... What number should come next?',
      options: ['(1/3)', '1/8', '2/8', '1/16'],
      correctOption: 1,
      explanation: 'This is a simple division series; each number is one-half of the previous number. Next is (1/4) * (1/2) = 1/8.'
    },
    {
      id: 'apt_logic_2',
      category: 'Logical Reasoning',
      question: 'If blue means green, green means white, white means yellow, yellow means black, black means red, and red means brown, then what is the color of milk?',
      options: ['White', 'Yellow', 'Green', 'Brown'],
      correctOption: 1,
      explanation: 'The color of milk is white. Since white means yellow, the color of milk is yellow.'
    },
    {
      id: 'apt_verbal_1',
      category: 'Verbal Ability',
      question: 'Choose the correct synonym of the word: DILIGENT',
      options: ['Intelligent', 'Hard-working', 'Lazy', 'Reliable'],
      correctOption: 1,
      explanation: 'Diligent means showing care and effort in one\'s work or duties. Thus, Hard-working is the correct synonym.'
    },
    {
      id: 'apt_verbal_2',
      category: 'Verbal Ability',
      question: 'Choose the word that is opposite in meaning to: OBSCURE',
      options: ['Clear', 'Implicit', 'Vague', 'Difficult'],
      correctOption: 0,
      explanation: 'Obscure means not discovered or known about; uncertain. The opposite is Clear.'
    },
    {
      id: 'apt_di_1',
      category: 'Data Interpretation',
      question: 'If a pie chart representing a department\'s budget allocation allocates 108 degrees for marketing, what percentage of the budget is allocated to marketing?',
      options: ['25%', '30%', '35%', '40%'],
      correctOption: 1,
      explanation: 'Total degrees in a circle = 360. Percentage = (108 / 360) * 100 = 30%.'
    },
    {
      id: 'apt_di_2',
      category: 'Data Interpretation',
      question: 'In a class of 50 students, 30 study Python, 25 study Java, and 10 study both. How many study neither?',
      options: ['5', '10', '15', '20'],
      correctOption: 0,
      explanation: 'Total = Python + Java - Both + Neither => 50 = 30 + 25 - 10 + Neither => 50 = 45 + Neither => Neither = 5.'
    },
    {
      id: 'apt_puzzle_1',
      category: 'Puzzle Solving',
      question: 'A farmer has 17 sheep and all but 9 die. How many sheep does he have left?',
      options: ['8', '9', '17', '0'],
      correctOption: 1,
      explanation: '"All but 9 sheep die" means that 9 sheep survived. So, he has 9 sheep left.'
    },
    {
      id: 'apt_puzzle_2',
      category: 'Puzzle Solving',
      question: 'A father and son are in a car crash. The father is killed, the boy is rushed to the hospital. The surgeon says, "I can\'t operate, he is my son." Who is the surgeon?',
      options: ['The father\'s ghost', 'The boy\'s mother', 'The boy\'s grandfather', 'A clone'],
      correctOption: 1,
      explanation: 'The surgeon is the boy\'s mother.'
    }
  ];
  setAptitudeQuestions(aptitudeQ);

  // Seed Coding Questions
  const codingQ = [
    {
      id: 'code_py_1',
      title: 'Reverse a String',
      description: 'Write a program to reverse a given string input.',
      difficulty: 'Basic',
      category: 'Basic problems',
      language: 'Python',
      constraints: 'Length of string <= 1000',
      inputFormat: 'A single string S',
      outputFormat: 'The reversed string S\'',
      sampleInput: 'hello',
      sampleOutput: 'olleh',
      template: 'def reverse_string(s):\n    # Write your code here\n    return s[::-1]'
    },
    {
      id: 'code_cpp_2',
      title: 'Find Largest Element',
      description: 'Write a C++ function to find the maximum element in a given vector of integers.',
      difficulty: 'Basic',
      category: 'Basic problems',
      language: 'C++',
      constraints: '1 <= N <= 10^5, -10^9 <= Arr[i] <= 10^9',
      inputFormat: 'A vector of integers',
      outputFormat: 'An integer representing the largest element',
      sampleInput: '[1, 5, 8, 3, 2]',
      sampleOutput: '8',
      template: '#include <vector>\n#include <algorithm>\n#include <iostream>\n\nint findLargest(const std::vector<int>& arr) {\n    return *std::max_element(arr.begin(), arr.end());\n}'
    },
    {
      id: 'code_java_3',
      title: 'Check Palindrome',
      description: 'Given a string, write a Java method to check if it is a palindrome (reads same forward and backward), ignoring case.',
      difficulty: 'Intermediate',
      category: 'Intermediate problems',
      language: 'Java',
      constraints: 'Length of string <= 10^4',
      inputFormat: 'A string S',
      outputFormat: 'Boolean value (true or false)',
      sampleInput: 'RaceCar',
      sampleOutput: 'true',
      template: 'public class Palindrome {\n    public static boolean isPalindrome(String s) {\n        String clean = s.toLowerCase();\n        int i = 0, j = clean.length() - 1;\n        while (i < j) {\n            if (clean.charAt(i++) != clean.charAt(j--)) return false;\n        }\n        return true;\n    }\n}'
    },
    {
      id: 'code_sql_4',
      title: 'Second Highest Salary',
      description: 'Write a SQL query to get the second highest salary from the Employee table. If there is no second highest salary, query should return NULL.',
      difficulty: 'Intermediate',
      category: 'Company-specific coding questions',
      language: 'SQL',
      constraints: 'Employee table with columns (id, salary)',
      inputFormat: 'SQL Schema: Employee (id INT, salary INT)',
      outputFormat: 'Second highest salary value',
      sampleInput: 'Employee: {1: 100, 2: 200, 3: 300}',
      sampleOutput: '200',
      template: '-- Write your query here\nSELECT MAX(salary) FROM Employee\nWHERE salary < (SELECT MAX(salary) FROM Employee);'
    },
    {
      id: 'code_js_5',
      title: 'Two Sum Problem',
      description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution.',
      difficulty: 'Intermediate',
      category: 'Previous placement coding questions',
      language: 'JavaScript',
      constraints: '2 <= nums.length <= 10^4, -10^9 <= nums[i] <= 10^9, -10^9 <= target <= 10^9',
      inputFormat: 'Array of numbers and integer target',
      outputFormat: 'Indices of the two numbers in an array [index1, index2]',
      sampleInput: 'nums = [2,7,11,15], target = 9',
      sampleOutput: '[0, 1]',
      template: 'function twoSum(nums, target) {\n    const map = {};\n    for (let i = 0; i < nums.length; i++) {\n        const complement = target - nums[i];\n        if (complement in map) {\n            return [map[complement], i];\n        }\n        map[nums[i]] = i;\n    }\n    return [];\n}'
    },
    {
      id: 'code_c_6',
      title: 'Fibonacci using Recursion',
      description: 'Write a C program that calculates the Nth Fibonacci number using recursion.',
      difficulty: 'Basic',
      category: 'Basic problems',
      language: 'C Programming',
      constraints: '0 <= N <= 30',
      inputFormat: 'An integer N',
      outputFormat: 'Nth Fibonacci number',
      sampleInput: '6',
      sampleOutput: '8',
      template: '#include <stdio.h>\n\nint fib(int n) {\n    if (n <= 1) return n;\n    return fib(n - 1) + fib(n - 2);\n}'
    }
  ];
  setCodingQuestions(codingQ);

  // Seed Company Prep guidelines
  const companyP = {
    TCS: {
      eligibility: '60% throughout academics in 10th, 12th, and UG. No active backlogs.',
      rounds: '1. Online Test (Cognitive & Coding), 2. Technical Interview, 3. HR Interview',
      pattern: 'TCS NQT: 80 mins for Cognitive (Quant, Logical, Verbal), 45 mins for Advanced Programming (2 coding questions).',
      interviewTips: 'Brush up on core subjects like DBMS, Operating Systems, OOPs, and be ready to discuss any final-year projects.',
      hrQuestions: 'Tell me about yourself? Why do you want to join TCS? Are you willing to relocate?',
      techTopics: 'C/C++/Java basics, basic SQL queries, Software Engineering phases (SDLC), basic data structures.',
      guidelines: 'Focus heavily on solving previous TCS NQT papers. TCS values consistency, discipline, and teamwork.'
    },
    Infosys: {
      eligibility: '60% throughout in 10th, 12th, and Graduation. Open to CS, IT, and related branches.',
      rounds: '1. Online Assessment, 2. Combined Tech & HR Interview',
      pattern: 'Reasoning Ability (15 Qs), Mathematical Ability (10 Qs), Verbal Ability (20 Qs), Pseudo Code (5 Qs), Puzzle Solving (4 Qs).',
      interviewTips: 'Be strong in programming logic. Practicing puzzle-solving is essential for Infosys tests.',
      hrQuestions: 'What are your strengths and weaknesses? Talk about a time you handled a difficult peer.',
      techTopics: 'OOPs, Java/Python, DBMS (SQL Joins, Group By, Indexing), basic coding puzzles.',
      guidelines: 'Infosys online test has strict sectional timing. Do not get stuck on a single puzzle.'
    },
    Wipro: {
      eligibility: '60% in 10th, 12th, and 60% or 6.0 CGPA in Graduation. B.E/B.Tech/MCA/M.Sc.',
      rounds: '1. Online Assessment (Aptitude, Written English, Coding), 2. Technical Interview, 3. HR Interview',
      pattern: 'Aptitude (Quant, Logical, Verbal), Essay Writing (20 mins), Coding (2 questions - 45 mins).',
      interviewTips: 'Maintain good grammatical structure in the essay writing section. Coding solutions must pass all sample cases.',
      hrQuestions: 'Why did you choose your engineering branch? Where do you see yourself in 5 years?',
      techTopics: 'C/C++/Java/Python syntax, simple arrays, string reversals, simple database schemas.',
      guidelines: 'Ensure good typing speed and correct grammar for the automated essay assessment.'
    },
    Zoho: {
      eligibility: 'No strict CGPA cutoff. Open to all branches with strong programming logic.',
      rounds: '1. C Programming & Aptitude, 2. Programming round (5-6 coding challenges), 3. Advanced Programming (App development/Design), 4. Tech Interview, 5. HR Interview',
      pattern: 'Focuses entirely on pure problem solving. Evaluators check your logic and clean coding style.',
      interviewTips: 'Zoho values problem-solving. Practice dry running your code on paper before writing it.',
      hrQuestions: 'Why Zoho? Discuss Zoho\'s remote offices philosophy and work-culture.',
      techTopics: 'Recursion, Pointers, Arrays, Strings (manipulation, substring parsing), Data Structures.',
      guidelines: 'Practice dry running your code on paper. You may be asked to write code on a whiteboard during the interview.'
    },
    Cognizant: {
      eligibility: '60% or 6 CGPA in 10th, 12th, and Graduation. No active backlogs.',
      rounds: '1. GenC Assessment (Aptitude & Debugging/Coding), 2. Technical Interview, 3. HR Interview',
      pattern: 'GenC test features Quantitative, Logical, Verbal, and Automata Fix (debugging code snippets).',
      interviewTips: 'Practice debugging syntax, logical, and runtime errors in Java, C, or Python.',
      hrQuestions: 'Are you comfortable with night shifts and rotational shifts? Tell me about your role in final year project.',
      techTopics: 'Database queries (joins, aggregations), basic HTML/CSS/JS, language fundamentals, debugging logic.',
      guidelines: 'Cognizant values general technical adaptability. Having web development project context helps.'
    },
    Accenture: {
      eligibility: '65% or 6.5 CGPA in graduation. Max 1-year gap in education.',
      rounds: '1. Cognitive & Technical Assessment, 2. Coding Assessment, 3. Communication Assessment, 4. Tech/HR Interview',
      pattern: 'Cognitive (50 Qs), Technical (40 Qs on MS Office, Networking, Pseudocodes), Coding (2 Qs). Communication test assesses listening/speaking.',
      interviewTips: 'Practice reasoning and pseudocodes. Ensure a quiet background for the Communication Round.',
      hrQuestions: 'Describe a challenging situation in your team project and how you resolved it.',
      techTopics: 'Pseudocodes (bitwise operators, loops, recursion), Cloud Computing basics, Networking layers.',
      guidelines: 'Pseudocode section is highly scoring. Practice dry-running bitwise logic questions.'
    },
    Capgemini: {
      eligibility: '50% in 10th, 12th, and 60% in Graduation. Max 1-year academic gap.',
      rounds: '1. Online Test (Pseudocode, English, Game-based, Behavioral), 2. Technical Interview, 3. HR Interview',
      pattern: 'Game-based aptitude (short memory/speed games), Pseudocode debugging, English test.',
      interviewTips: 'Familiarize yourself with memory grid games. Practice solving pseudocode outputs.',
      hrQuestions: 'Tell me about yourself. Do you have any plans for higher education?',
      techTopics: 'Data structures, basic sorting and searching, OOPs, SQL queries.',
      guidelines: 'Speed and memory are key for game-based tests. Solve mock tests beforehand.'
    },
    HCL: {
      eligibility: '60% throughout in 10th, 12th, and Graduation. No active backlogs.',
      rounds: '1. Online Assessment (Aptitude, Tech Subjects, Coding), 2. Technical Interview, 3. HR Interview',
      pattern: 'Cognitive Ability (35 Qs), CS Fundamentals (25 Qs on OS, DBMS, Networks), Coding (1 Q).',
      interviewTips: 'Strong conceptual clarity in OS (semaphores, virtual memory) and Networking (TCP/IP) is required.',
      hrQuestions: 'Why HCL? Are you willing to relocate to HCL campuses?',
      techTopics: 'C/C++/Java, DBMS, OS concepts, Networking, SDLC models.',
      guidelines: 'HCL tests focus heavily on core computer science subjects. Read textbooks for CS fundamentals.'
    },
    Other: {
      eligibility: 'Varies by company, generally 60% CGPA.',
      rounds: 'Aptitude, Coding, Technical, HR.',
      pattern: 'Standard pattern containing numerical, logical, and coding challenges.',
      interviewTips: 'Keep a strong portfolio on GitHub, solve standard DSA problems (top 150 LeetCode).',
      hrQuestions: 'Standard behavioral and general interview questions.',
      techTopics: 'Data Structures and Algorithms (DSA), System Design, web/mobile development frameworks.',
      guidelines: 'Consistently practice standard coding questions (binary search, trees, dynamic programming).'
    }
  };
  setCompanyPrep(companyP);

  // Seed generic system logs
  const now = Date.now();
  const activities = sampleStudents.slice(0, 5).map((s, i) => ({
    id: uid(),
    type: 'create',
    text: `New student <strong>${s.fullName}</strong> registered with Placement & Training records`,
    timestamp: new Date(now - (i + 1) * 3600000).toISOString(),
  }));
  set(KEYS.ACTIVITY, activities);
};
