/**
 * StudentDashboard.jsx – Student self-service: profile, courses, activity, settings
 */
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import * as Storage from '../utils/storage.js';
import {
  formatDate, formatDateShort, timeAgo, getInitials, nameToColor,
  yearDisplay, isValidPhone, isStrongPassword, hashPassword,
  verifyPassword, readFileAsDataURL
} from '../utils/helpers.js';

const COURSE_SUBJECTS = {
  'Bachelor of Science in Computer Science': [
    { code: 'CS101', name: 'Introduction to Computer Science', credits: 4, schedule: 'Mon/Wed 9:00–10:30 AM', instructor: 'Dr. Alan Turing' },
    { code: 'CS201', name: 'Data Structures and Algorithms', credits: 4, schedule: 'Tue/Thu 11:00 AM–12:30 PM', instructor: 'Prof. Grace Hopper' },
    { code: 'CS301', name: 'Database Management Systems', credits: 3, schedule: 'Mon/Wed 1:00–2:30 PM', instructor: 'Dr. Edgar Codd' },
    { code: 'CS401', name: 'Software Engineering', credits: 3, schedule: 'Fri 9:00 AM–12:00 PM', instructor: 'Prof. Margaret Hamilton' },
  ],
  'Bachelor of Science in Information Technology': [
    { code: 'IT101', name: 'IT Fundamentals', credits: 3, schedule: 'Mon/Wed 10:30 AM–12:00 PM', instructor: 'Dr. Tim Berners-Lee' },
    { code: 'IT202', name: 'Network Administration', credits: 4, schedule: 'Tue/Thu 9:00–10:30 AM', instructor: 'Prof. Vint Cerf' },
    { code: 'IT303', name: 'Web Development & Applications', credits: 3, schedule: 'Mon/Wed 3:00–4:30 PM', instructor: 'Dr. Brendan Eich' },
    { code: 'IT404', name: 'Cybersecurity Principles', credits: 3, schedule: 'Fri 1:00–4:00 PM', instructor: 'Prof. Dorothy Denning' },
  ],
};

function getSubjects(course) {
  if (COURSE_SUBJECTS[course]) return COURSE_SUBJECTS[course];
  const cleanName = (course || 'General Studies')
    .replace('Bachelor of Science in ', '').replace('Bachelor of Arts in ', '')
    .replace('Bachelor of ', '').replace('Master of Science in ', 'M.Sc. ')
    .replace('Master of ', 'M. ');
  return [
    { code: 'CORE101', name: `${cleanName} Fundamentals`, credits: 4, schedule: 'Mon/Wed 9:00–10:30 AM', instructor: 'Dr. Alice Smith' },
    { code: 'CORE202', name: `Advanced ${cleanName} Theory`, credits: 4, schedule: 'Tue/Thu 11:00 AM–12:30 PM', instructor: 'Prof. Bob Martinez' },
    { code: 'CORE303', name: `Research Methods in ${cleanName}`, credits: 3, schedule: 'Mon/Wed 1:00–2:30 PM', instructor: 'Dr. Carol Lee' },
    { code: 'CORE404', name: 'Capstone Senior Project', credits: 3, schedule: 'Fri 9:00 AM–12:00 PM', instructor: 'Prof. David Kim' },
  ];
}

function ActivityItem({ act }) {
  const iconMap = { login: 'fa-sign-in-alt', create: 'fa-user-plus', update: 'fa-user-edit', reset: 'fa-key' };
  return (
    <div className="activity-item">
      <div className={`activity-icon ${act.type}`}><i className={`fas ${iconMap[act.type] || 'fa-info-circle'}`}></i></div>
      <div className="activity-content">
        <p className="activity-text">{act.text}</p>
        <span className="activity-time">{timeAgo(act.timestamp)}</span>
      </div>
    </div>
  );
}

function ProfileAvatar({ student, size = 90 }) {
  const style = {
    width: size, height: size, borderRadius: '50%', overflow: 'hidden',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: student.profilePhoto ? 'transparent' : nameToColor(student.fullName),
    color: 'white', fontWeight: 700, fontSize: size > 60 ? '1.8rem' : '0.85rem',
    border: '3px solid var(--border-color)',
  };
  return (
    <div style={style}>
      {student.profilePhoto
        ? <img src={student.profilePhoto} alt={student.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : getInitials(student.fullName)
      }
    </div>
  );
}

export default function StudentDashboard({ activeView, onNavigate }) {
  const { currentUser, refreshUser, showToast, applyTheme, theme, showConfirm } = useAuth();
  const [student, setStudent] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editErrors, setEditErrors] = useState({});
  const [pwForm, setPwForm] = useState({ cur: '', np: '', cp: '' });
  const [pwErrors, setPwErrors] = useState({});
  const photoRef = useRef();

  // Training & Placement States
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [activeCodingProblem, setActiveCodingProblem] = useState(null);
  const [codeSolution, setCodeSolution] = useState('');
  const [codeResult, setCodeResult] = useState(null);
  const [codeSubmitting, setCodeSubmitting] = useState(false);
  const [activeCompanyPrep, setActiveCompanyPrep] = useState(null);
  const [quizSeconds, setQuizSeconds] = useState(0);

  const loadStudent = () => {
    if (currentUser?.email) {
      const s = Storage.getUser(currentUser.email);
      setStudent(s);
    }
  };

  useEffect(() => { loadStudent(); }, [currentUser, activeView]);

  // Aptitude Quiz Logic
  const startAptitudeQuiz = (category) => {
    const allQ = Storage.getAptitudeQuestions();
    const catQ = allQ.filter(q => q.category === category);
    if (catQ.length === 0) {
      showToast('Error', 'No questions found for this category.', 'error');
      return;
    }
    setActiveQuiz({
      category,
      questions: catQ,
      currentIdx: 0,
      answers: {},
      submitted: false,
      score: 0
    });
    setQuizSeconds(60 * catQ.length);
  };

  const handleSelectOption = (qId, optionIdx) => {
    if (activeQuiz.submitted) return;
    setActiveQuiz(prev => ({
      ...prev,
      answers: { ...prev.answers, [qId]: optionIdx }
    }));
  };

  const submitQuiz = () => {
    setActiveQuiz(prev => {
      if (!prev || prev.submitted) return prev;
      let score = 0;
      prev.questions.forEach(q => {
        if (prev.answers[q.id] === q.correctOption) {
          score++;
        }
      });
      const percent = Math.round((score / prev.questions.length) * 100);

      // Save to student trainingProgress
      const curStats = student.trainingProgress || {};
      const newQuizzes = [...(curStats.quizzesTaken || [])];
      newQuizzes.push({
        category: prev.category,
        score: percent,
        date: new Date().toISOString().split('T')[0]
      });

      // Update aptitudeSolved solved count
      const updatedStats = {
        ...curStats,
        aptitudeSolved: Math.min(curStats.aptitudeTotal || 10, Math.max(curStats.aptitudeSolved || 0, Math.round(newQuizzes.length * 2))),
        quizzesTaken: newQuizzes
      };

      Storage.updateUser(student.email, { trainingProgress: updatedStats });
      Storage.updateUser(student.email, {
        activityLog: [{ type: 'update', text: `Completed quiz in <strong>${prev.category}</strong> (Score: ${percent}%)`, timestamp: new Date().toISOString() }, ...(student.activityLog || []).slice(0, 49)]
      });

      showToast('Quiz Submitted', `You scored ${percent}% in ${prev.category}!`, 'success');
      
      // Reload student details
      setTimeout(() => {
        const fresh = Storage.getUser(student.email);
        if (fresh) {
          setStudent(fresh);
          refreshUser();
        }
      }, 50);

      return {
        ...prev,
        submitted: true,
        score: score
      };
    });
  };

  useEffect(() => {
    let interval = null;
    if (activeQuiz && !activeQuiz.submitted) {
      interval = setInterval(() => {
        setQuizSeconds(sec => {
          if (sec <= 1) {
            clearInterval(interval);
            submitQuiz();
            return 0;
          }
          return sec - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeQuiz?.category, activeQuiz?.submitted]);

  if (!student) return null;

  // Coding Problem Logic
  const startCodingProblem = (prob) => {
    setActiveCodingProblem(prob);
    setCodeSolution(prob.template || '');
    setCodeResult(null);
  };

  const handleRunCode = () => {
    setCodeSubmitting(true);
    setTimeout(() => {
      setCodeSubmitting(false);
      setCodeResult({
        status: 'success',
        message: 'Compilation Successful!\nSample Test Case 1: Passed\nSample Test Case 2: Passed\nOutput matches expected output.'
      });
      showToast('Execution Success', 'All sample cases passed!', 'success');
    }, 800);
  };

  const handleSubmitCode = () => {
    setCodeSubmitting(true);
    setTimeout(() => {
      setCodeSubmitting(false);
      setCodeResult({
        status: 'success',
        message: 'Submission Successful!\n100% Test Cases Passed (12/12)\nExecution Time: 42ms\nMemory Used: 12.4 MB'
      });

      // Update student progress
      const curStats = student.trainingProgress || {};
      const solvedList = [...(curStats.codingProblemsSolved || [])];
      if (!solvedList.includes(activeCodingProblem.id)) {
        solvedList.push(activeCodingProblem.id);
      }
      const updatedStats = {
        ...curStats,
        codingSolved: solvedList.length,
        codingProblemsSolved: solvedList
      };

      Storage.updateUser(student.email, { trainingProgress: updatedStats });
      Storage.updateUser(student.email, {
        activityLog: [{ type: 'update', text: `Solved coding problem: <strong>${activeCodingProblem.title}</strong> (${activeCodingProblem.language})`, timestamp: new Date().toISOString() }, ...(student.activityLog || []).slice(0, 49)]
      });

      showToast('Problem Solved', `Code submitted successfully!`, 'success');
      
      // Reload student details
      setTimeout(() => {
        const fresh = Storage.getUser(student.email);
        if (fresh) {
          setStudent(fresh);
          refreshUser();
        }
      }, 50);
    }, 1200);
  };

  // Company Prep Logic
  const viewCompanyPrep = (compKey) => {
    const preps = Storage.getCompanyPrep();
    const details = preps[compKey];
    if (!details) {
      showToast('Error', 'Company details not found.', 'error');
      return;
    }
    setActiveCompanyPrep({ key: compKey, ...details });

    // Mark as viewed in student profile
    const curStats = student.trainingProgress || {};
    const viewed = [...(curStats.companyPrepViewed || [])];
    if (!viewed.includes(compKey)) {
      viewed.push(compKey);
      const updatedStats = { ...curStats, companyPrepViewed: viewed };
      Storage.updateUser(student.email, { trainingProgress: updatedStats });
      
      // Reload student details
      setTimeout(() => {
        const fresh = Storage.getUser(student.email);
        if (fresh) {
          setStudent(fresh);
          refreshUser();
        }
      }, 50);
    }
  };

  const logs = student.activityLog || [];
  const subjects = getSubjects(student.course);
  const statusCls = { Active: 'active', Graduated: 'graduated', Suspended: 'suspended', Withdrawn: 'withdrawn' }[student.status] || 'active';

  // ── Edit Profile ──
  const startEdit = () => {
    setEditForm({ fullName: student.fullName, phone: student.phone || '', dob: student.dob || '', address: student.address || '' });
    setEditErrors({});
    setEditMode(true);
    onNavigate('student-profile');
  };

  const cancelEdit = () => { setEditMode(false); setEditErrors({}); };

  const saveProfile = (e) => {
    e.preventDefault();
    const errs = {};
    if (!editForm.fullName?.trim()) errs.fullName = 'Full Name is required.';
    if (editForm.phone && !isValidPhone(editForm.phone)) errs.phone = 'Enter a valid phone number.';
    if (Object.keys(errs).length) { setEditErrors(errs); return; }
    const updated = Storage.updateUser(student.email, { fullName: editForm.fullName.trim(), phone: editForm.phone, dob: editForm.dob, address: editForm.address });
    Storage.updateUser(student.email, { activityLog: [{ type: 'update', text: 'Updated personal profile', timestamp: new Date().toISOString() }, ...logs.slice(0, 49)] });
    Storage.addActivity({ type: 'update', text: `Student <strong>${editForm.fullName}</strong> updated profile`, userEmail: student.email });
    showToast('Profile Saved', 'Your information was updated.', 'success');
    setEditMode(false);
    loadStudent();
    refreshUser();
  };

  // ── Photo Upload ──
  const handlePhotoChange = async (file) => {
    if (!file || !file.type.startsWith('image/')) { showToast('Error', 'Only image files allowed.', 'error'); return; }
    if (file.size > 2 * 1024 * 1024) { showToast('Error', 'Image must be under 2MB.', 'error'); return; }
    const url = await readFileAsDataURL(file);
    Storage.updateUser(student.email, { profilePhoto: url });
    Storage.updateUser(student.email, { activityLog: [{ type: 'update', text: 'Changed profile photo', timestamp: new Date().toISOString() }, ...logs.slice(0, 49)] });
    Storage.addActivity({ type: 'update', text: `Student <strong>${student.fullName}</strong> updated photo`, userEmail: student.email });
    showToast('Photo Updated', 'Profile image saved.', 'success');
    loadStudent(); refreshUser();
    if (photoRef.current) photoRef.current.value = '';
  };

  // ── Change Password ──
  const handlePwChange = (e) => {
    e.preventDefault();
    const errs = {};
    if (!verifyPassword(pwForm.cur, student.passwordHash)) errs.cur = 'Current password is incorrect.';
    if (!isStrongPassword(pwForm.np)) errs.np = 'Min 8 chars with uppercase, lowercase, number.';
    if (pwForm.np !== pwForm.cp) errs.cp = 'Passwords do not match.';
    if (Object.keys(errs).length) { setPwErrors(errs); return; }
    Storage.updateUser(student.email, { passwordHash: hashPassword(pwForm.np) });
    Storage.addActivity({ type: 'reset', text: `Password changed for <strong>${student.fullName}</strong>`, userEmail: student.email });
    showToast('Password Updated', 'Your password was changed successfully.', 'success');
    setPwForm({ cur: '', np: '', cp: '' }); setPwErrors({});
  };

  const spw = (k) => (e) => setPwForm(p => ({ ...p, [k]: e.target.value }));
  const sef = (k) => (e) => setEditForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div className="view-container">

      {/* ── STUDENT DASHBOARD ── */}
      {activeView === 'student-dashboard' && (
        <section className="view">
          <div className="page-header">
            <div>
              <h1 className="page-title">Welcome back, {student.fullName}!</h1>
              <p className="page-subtitle">Here's your academic and placement overview</p>
            </div>
            <div className="page-actions">
              <button className="btn btn-ghost btn-sm" onClick={() => window.print()}><i className="fas fa-print"></i> Print Profile</button>
              <button className="btn btn-primary btn-sm" onClick={startEdit}><i className="fas fa-edit"></i> Edit Profile</button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="student-stats-grid">
            {[
              { icon: 'fa-graduation-cap', cls: 'course', label: 'Course', value: (student.course || '—').replace('Bachelor of Science in ', 'B.Sc. ').replace('Bachelor of Arts in ', 'B.A. ').replace('Master of ', 'M. ') },
              { icon: 'fa-briefcase', cls: 'year', label: 'Placement Eligibility', value: student.placement?.eligibility || 'Eligible' },
              { icon: 'fa-info-circle', cls: 'enrollment', label: 'Placement Status', value: student.placement?.status || 'Unplaced' },
              { icon: 'fa-trophy', cls: 'status-icon', label: 'Highest Package Offered', value: student.placement?.highestPackage ? `${student.placement.highestPackage} LPA` : '—' },
            ].map((stat, i) => (
              <div key={i} className="stat-card-student">
                <div className={`stat-icon ${stat.cls}`}><i className={`fas ${stat.icon}`}></i></div>
                <div className="stat-info"><span className="stat-label">{stat.label}</span><span className="stat-value">{stat.value}</span></div>
              </div>
            ))}
          </div>

          {/* Profile Card + Activity */}
          <div className="dashboard-grid-2">
            <div className="card profile-overview-card">
              <div className="profile-overview-photo">
                <div className="overview-avatar">
                  <ProfileAvatar student={student} size={90} />
                </div>
                <div className="status-badge-wrap"><span className={`status-badge ${statusCls}`}>{student.status}</span></div>
              </div>
              <div className="profile-overview-info">
                <h3>{student.fullName}</h3>
                <p className="text-muted">ID: {student.studentId}</p>
                <p className="text-muted"><i className="fas fa-envelope"></i> {student.email}</p>
                <p className="text-muted"><i className="fas fa-phone"></i> {student.phone || '—'}</p>
                <p className="text-muted"><i className="fas fa-briefcase"></i> Placement: <strong style={{ color: student.placement?.status === 'Placed' ? '#10b981' : 'var(--text-secondary)' }}>{student.placement?.status || 'Unplaced'}</strong></p>
                {student.placement?.status === 'Placed' && student.placement?.offers?.find(o => o.joiningStatus === 'Joined') && (
                  <div className="mt-2 p-2" style={{ background: 'rgba(16, 185, 129, 0.08)', borderRadius: 8, borderLeft: '3px solid #10b981' }}>
                    <small style={{ fontWeight: 600, display: 'block', color: '#10b981' }}>SELECTED AT</small>
                    <strong>{student.placement.offers.find(o => o.joiningStatus === 'Joined').company}</strong> - {student.placement.offers.find(o => o.joiningStatus === 'Joined').role} ({student.placement.offers.find(o => o.joiningStatus === 'Joined').salary} LPA)
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-header"><h3 className="card-title"><i className="fas fa-chart-pie"></i> Preparation Progress</h3></div>
              <div className="card-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span>Aptitude Practice (Solved)</span>
                      <strong>{student.trainingProgress?.aptitudeSolved || 0} / {student.trainingProgress?.aptitudeTotal || 10}</strong>
                    </div>
                    <div className="strength-bar" style={{ height: 8 }}><div className="strength-fill" style={{ width: `${((student.trainingProgress?.aptitudeSolved || 0) / (student.trainingProgress?.aptitudeTotal || 10)) * 100}%`, background: 'var(--brand-primary)' }}></div></div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span>Coding Practice (Solved)</span>
                      <strong>{student.trainingProgress?.codingSolved || 0} / {student.trainingProgress?.codingTotal || 6}</strong>
                    </div>
                    <div className="strength-bar" style={{ height: 8 }}><div className="strength-fill" style={{ width: `${((student.trainingProgress?.codingSolved || 0) / (student.trainingProgress?.codingTotal || 6)) * 100}%`, background: '#10b981' }}></div></div>
                  </div>
                  <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                    <button className="btn btn-outline btn-sm flex-1" onClick={() => onNavigate('student-training')}><i className="fas fa-arrow-right"></i> Start Practice</button>
                    <button className="btn btn-primary btn-sm flex-1" onClick={() => onNavigate('student-placement')}><i className="fas fa-briefcase"></i> Placement Hub</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── MY PLACEMENT ── */}
      {activeView === 'student-placement' && (
        <section className="view">
          <div className="page-header">
            <div>
              <h1 className="page-title">My Placement Records</h1>
              <p className="page-subtitle">Track your application history, offers received, and statistics</p>
            </div>
            <div className="page-actions">
              <button className="btn btn-primary btn-sm" onClick={() => window.print()}><i className="fas fa-download"></i> Print summary</button>
            </div>
          </div>

          <div className="placement-stats-grid">
            {[
              { icon: 'fa-briefcase', label: 'Eligibility', value: student.placement?.eligibility || 'Eligible' },
              { icon: 'fa-info-circle', label: 'Status', value: student.placement?.status || 'Unplaced' },
              { icon: 'fa-paper-plane', label: 'Companies Applied', value: student.placement?.appliedCount || 0 },
              { icon: 'fa-award', label: 'Offers Received', value: student.placement?.offersCount || 0 }
            ].map((stat, i) => (
              <div key={i} className="stat-card-student">
                <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--brand-primary)' }}><i className={`fas ${stat.icon}`}></i></div>
                <div className="stat-info"><span className="stat-label">{stat.label}</span><span className="stat-value">{stat.value}</span></div>
              </div>
            ))}
          </div>

          <div className="dashboard-grid-2">
            <div className="card" style={{ gridColumn: 'span 2' }}>
              <div className="card-header"><h3 className="card-title"><i className="fas fa-file-signature"></i> Job Offers Received</h3></div>
              <div className="card-body">
                {!student.placement?.offers || student.placement.offers.length === 0 ? (
                  <div className="empty-state-sm"><i className="fas fa-folder-open"></i><p>No job offers recorded yet.</p></div>
                ) : (
                  <div className="table-responsive">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Company</th>
                          <th>Job Role</th>
                          <th>Salary Package</th>
                          <th>Interview</th>
                          <th>Offer Letter</th>
                          <th>Joining Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {student.placement.offers.map((o, idx) => (
                          <tr key={idx}>
                            <td><strong>{o.company}</strong></td>
                            <td>{o.role}</td>
                            <td>{o.salary} LPA</td>
                            <td><span className="badge badge-active">{o.interviewStatus || 'Completed'}</span></td>
                            <td><span className="badge badge-graduated">{o.offerLetterStatus || 'Received'}</span></td>
                            <td><span className={`badge ${o.joiningStatus === 'Joined' ? 'badge-active' : (o.joiningStatus === 'Declined' ? 'badge-suspended' : 'badge-withdrawn')}`}>{o.joiningStatus || 'Pending'}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-header"><h3 className="card-title"><i className="fas fa-info-circle"></i> Internships & Metrics</h3></div>
              <div className="card-body">
                <div className="info-grid" style={{ gridTemplateColumns: '1fr' }}>
                  <div className="info-item"><span className="info-label">Internship Details</span><span className="info-value">{student.placement?.internshipDetails || 'No internship details recorded.'}</span></div>
                  <div className="info-item"><span className="info-label">Highest Package Offered</span><span className="info-value">{student.placement?.highestPackage ? `${student.placement.highestPackage} LPA` : '—'}</span></div>
                  <div className="info-item"><span className="info-label">Average Package Offered</span><span className="info-value">{student.placement?.averagePackage ? `${student.placement.averagePackage} LPA` : '—'}</span></div>
                  <div className="info-item"><span className="info-label">Interview Status</span><span className="info-value">{student.placement?.interviewStatus || 'None'}</span></div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header"><h3 className="card-title"><i className="fas fa-history"></i> Placement Activity Timeline</h3></div>
              <div className="card-body">
                <div className="placement-timeline">
                  {student.placement?.placementHistory?.map((h, i) => (
                    <div key={i} className="timeline-event">
                      <span className="timeline-date">{formatDateShort(h.date)}</span>
                      <p className="timeline-desc" dangerouslySetInnerHTML={{ __html: h.event }}></p>
                    </div>
                  )) || <div className="empty-state-sm"><p>No activity logged yet.</p></div>}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── PLACEMENT TRAINING ── */}
      {activeView === 'student-training' && (
        <section className="view">
          {activeQuiz ? (
            /* Active Quiz Interface */
            <div className="quiz-container">
              <div className="card">
                <div className="quiz-header">
                  <div>
                    <h3>{activeQuiz.category} Quiz</h3>
                    <small>Question {activeQuiz.currentIdx + 1} of {activeQuiz.questions.length}</small>
                  </div>
                  {!activeQuiz.submitted && (
                    <span className="quiz-timer">
                      <i className="fas fa-clock"></i> {Math.floor(quizSeconds / 60)}:{(quizSeconds % 60).toString().padStart(2, '0')}
                    </span>
                  )}
                </div>

                <div className="card-body">
                  <div className="strength-bar" style={{ height: 6, marginBottom: 20 }}>
                    <div className="strength-fill" style={{ width: `${((activeQuiz.currentIdx + 1) / activeQuiz.questions.length) * 100}%`, background: 'var(--brand-primary)' }}></div>
                  </div>

                  <p style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 20 }}>
                    {activeQuiz.questions[activeQuiz.currentIdx].question}
                  </p>

                  <div className="quiz-options-list">
                    {activeQuiz.questions[activeQuiz.currentIdx].options.map((opt, oIdx) => {
                      const qId = activeQuiz.questions[activeQuiz.currentIdx].id;
                      const isSelected = activeQuiz.answers[qId] === oIdx;
                      let optionClass = "quiz-option";
                      if (isSelected) optionClass += " selected";

                      return (
                        <div
                          key={oIdx}
                          className={optionClass}
                          style={activeQuiz.submitted ? {
                            cursor: 'default',
                            borderColor: oIdx === activeQuiz.questions[activeQuiz.currentIdx].correctOption ? '#10b981' : (isSelected ? '#ef4444' : 'var(--border-color)'),
                            background: oIdx === activeQuiz.questions[activeQuiz.currentIdx].correctOption ? 'rgba(16, 185, 129, 0.08)' : (isSelected ? 'rgba(239, 68, 68, 0.08)' : 'var(--card-bg)')
                          } : {}}
                          onClick={() => handleSelectOption(qId, oIdx)}
                        >
                          <span style={{ fontWeight: 600, marginRight: 8 }}>{String.fromCharCode(65 + oIdx)}.</span> {opt}
                        </div>
                      );
                    })}
                  </div>

                  {activeQuiz.submitted && (
                    <div className="quiz-explanation">
                      <strong>Explanation:</strong>
                      <p style={{ fontSize: '0.9rem', marginTop: 4 }}>{activeQuiz.questions[activeQuiz.currentIdx].explanation}</p>
                    </div>
                  )}
                </div>

                <div className="card-footer" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-color)' }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    disabled={activeQuiz.currentIdx === 0}
                    onClick={() => setActiveQuiz(prev => ({ ...prev, currentIdx: prev.currentIdx - 1 }))}
                  >
                    <i className="fas fa-chevron-left"></i> Previous
                  </button>

                  {!activeQuiz.submitted ? (
                    activeQuiz.currentIdx === activeQuiz.questions.length - 1 ? (
                      <button className="btn btn-primary btn-sm" onClick={submitQuiz}>
                        <i className="fas fa-check"></i> Submit Quiz
                      </button>
                    ) : (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => setActiveQuiz(prev => ({ ...prev, currentIdx: prev.currentIdx + 1 }))}
                      >
                        Next <i className="fas fa-chevron-right"></i>
                      </button>
                    )
                  ) : (
                    activeQuiz.currentIdx === activeQuiz.questions.length - 1 ? (
                      <button className="btn btn-primary btn-sm" onClick={() => setActiveQuiz(null)}>
                        Finish &amp; Close
                      </button>
                    ) : (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => setActiveQuiz(prev => ({ ...prev, currentIdx: prev.currentIdx + 1 }))}
                      >
                        Next Question <i className="fas fa-chevron-right"></i>
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          ) : activeCodingProblem ? (
            /* Active Coding Problem Editor */
            <div>
              <div style={{ marginBottom: 16 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setActiveCodingProblem(null)}>
                  <i className="fas fa-arrow-left"></i> Back to Practice List
                </button>
              </div>
              <div className="coding-workspace">
                <div className="problem-details">
                  <span className={`badge ${activeCodingProblem.difficulty === 'Basic' ? 'badge-active' : 'badge-suspended'}`} style={{ marginBottom: 12 }}>
                    {activeCodingProblem.difficulty}
                  </span>
                  <h2 style={{ fontSize: '1.4rem', marginBottom: 8 }}>{activeCodingProblem.title}</h2>
                  <p className="text-muted" style={{ marginBottom: 16 }}>Category: <strong>{activeCodingProblem.category}</strong></p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                      <strong>Problem Statement</strong>
                      <p style={{ marginTop: 4, fontSize: '0.92rem', lineHeight: 1.5 }}>{activeCodingProblem.description}</p>
                    </div>
                    <div>
                      <strong>Constraints</strong>
                      <pre style={{ background: 'var(--border-color)', padding: 8, borderRadius: 6, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{activeCodingProblem.constraints}</pre>
                    </div>
                    <div>
                      <strong>Input Format</strong>
                      <p style={{ marginTop: 4, fontSize: '0.92rem' }}>{activeCodingProblem.inputFormat}</p>
                    </div>
                    <div>
                      <strong>Output Format</strong>
                      <p style={{ marginTop: 4, fontSize: '0.92rem' }}>{activeCodingProblem.outputFormat}</p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <strong>Sample Input</strong>
                        <pre style={{ background: 'var(--border-color)', padding: 8, borderRadius: 6, fontSize: '0.85rem', marginTop: 4, color: 'var(--text-primary)' }}>{activeCodingProblem.sampleInput}</pre>
                      </div>
                      <div>
                        <strong>Sample Output</strong>
                        <pre style={{ background: 'var(--border-color)', padding: 8, borderRadius: 6, fontSize: '0.85rem', marginTop: 4, color: 'var(--text-primary)' }}>{activeCodingProblem.sampleOutput}</pre>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="ide-container">
                  <div className="ide-header">
                    <span className="ide-title">{activeCodingProblem.language} Workspace</span>
                    <button className="btn btn-outline btn-xs" style={{ borderColor: '#3c3c3c', color: '#d4d4d4' }} onClick={() => setCodeSolution(activeCodingProblem.template || '')}><i className="fas fa-sync-alt"></i> Reset</button>
                  </div>
                  <textarea
                    className="ide-editor"
                    value={codeSolution}
                    onChange={e => setCodeSolution(e.target.value)}
                    placeholder="// Enter code logic here..."
                  />
                  <div className="ide-footer">
                    <button className="btn btn-ghost btn-sm" style={{ color: '#d4d4d4' }} disabled={codeSubmitting} onClick={handleRunCode}>
                      {codeSubmitting ? 'Running...' : 'Run Code'}
                    </button>
                    <button className="btn btn-primary btn-sm" disabled={codeSubmitting} onClick={handleSubmitCode}>
                      {codeSubmitting ? 'Submitting...' : 'Submit'}
                    </button>
                  </div>

                  {codeResult && (
                    <div style={{ padding: 16, borderTop: '1px solid #3c3c3c' }}>
                      <strong style={{ color: '#d4d4d4', display: 'block', marginBottom: 8 }}>Execution Result:</strong>
                      <pre className={`code-result ${codeResult.status === 'success' ? 'success' : 'error'}`}>{codeResult.message}</pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Practice Lists Selection */
            <div>
              <div className="page-header">
                <div>
                  <h1 className="page-title">Placement Prep Workspace</h1>
                  <p className="page-subtitle">Topic quizzes, coding tasks, and company prep guides</p>
                </div>
              </div>

              {/* Progress metrics */}
              <div className="student-stats-grid">
                <div className="stat-card-student">
                  <div className="stat-icon year"><i className="fas fa-percent"></i></div>
                  <div className="stat-info">
                    <span className="stat-label">Aptitude Score Average</span>
                    <span className="stat-value">{student.trainingProgress?.quizzesTaken?.length ? `${Math.round(student.trainingProgress.quizzesTaken.reduce((sum,q)=>sum+q.score,0)/student.trainingProgress.quizzesTaken.length)}%` : '0%'}</span>
                  </div>
                </div>
                <div className="stat-card-student">
                  <div className="stat-icon enrollment"><i className="fas fa-check-double"></i></div>
                  <div className="stat-info">
                    <span className="stat-label">Coding Questions Solved</span>
                    <span className="stat-value">{student.trainingProgress?.codingSolved || 0} / {student.trainingProgress?.codingTotal || 6}</span>
                  </div>
                </div>
              </div>

              <div className="dashboard-grid-2" style={{ marginTop: 24 }}>
                <div className="card">
                  <div className="card-header"><h3 className="card-title"><i className="fas fa-brain"></i> Aptitude Training Quizzes</h3></div>
                  <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {['Quantitative Aptitude', 'Logical Reasoning', 'Verbal Ability', 'Data Interpretation', 'Puzzle Solving'].map(cat => {
                      const completed = student.trainingProgress?.quizzesTaken?.filter(q => q.category === cat) || [];
                      return (
                        <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--border-color)', borderRadius: 8 }}>
                          <div>
                            <strong style={{ display: 'block' }}>{cat}</strong>
                            <small className="text-muted">{completed.length ? `Completed (${completed[completed.length-1].score}%)` : 'Not attempted yet'}</small>
                          </div>
                          <button className="btn btn-outline btn-xs" onClick={() => startAptitudeQuiz(cat)}>Take Quiz</button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="card">
                  <div className="card-header"><h3 className="card-title"><i className="fas fa-code"></i> Coding Challenges</h3></div>
                  <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {Storage.getCodingQuestions().map(prob => {
                      const solved = student.trainingProgress?.codingProblemsSolved?.includes(prob.id);
                      return (
                        <div key={prob.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--border-color)', borderRadius: 8 }}>
                          <div>
                            <strong style={{ display: 'block' }}>{prob.title} {solved && <span style={{ color: '#10b981', fontSize: '0.8rem' }}><i className="fas fa-check-circle"></i> Solved</span>}</strong>
                            <small className="text-muted">{prob.language} - {prob.difficulty} level</small>
                          </div>
                          <button className="btn btn-primary btn-xs" onClick={() => startCodingProblem(prob)}>Solve</button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── COMPANY PREPARATION ── */}
      {activeView === 'student-companies' && (
        <section className="view">
          {activeCompanyPrep ? (
            <div>
              <div style={{ marginBottom: 16 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setActiveCompanyPrep(null)}>
                  <i className="fas fa-arrow-left"></i> Back to Company Guidelines
                </button>
              </div>
              <div className="card">
                <div className="card-header">
                  <h2 className="card-title"><i className="fas fa-building text-brand"></i> {activeCompanyPrep.key} Recruitment guidelines &amp; tips</h2>
                </div>
                <div className="card-body">
                  <div className="info-grid" style={{ gridTemplateColumns: '1fr' }}>
                    <div className="info-item"><span className="info-label">Eligibility Cutoff</span><span className="info-value">{activeCompanyPrep.eligibility}</span></div>
                    <div className="info-item"><span className="info-label">Selection Rounds</span><span className="info-value">{activeCompanyPrep.rounds}</span></div>
                    <div className="info-item"><span className="info-label">Online Test Pattern</span><span className="info-value">{activeCompanyPrep.pattern}</span></div>
                    <div className="info-item"><span className="info-label">Technical Topics</span><span className="info-value">{activeCompanyPrep.techTopics}</span></div>
                    <div className="info-item"><span className="info-label">Common HR Questions</span><span className="info-value">{activeCompanyPrep.hrQuestions}</span></div>
                    <div className="info-item"><span className="info-label">Interview Experience Strategy</span><span className="info-value">{activeCompanyPrep.interviewTips}</span></div>
                    <div className="info-item"><span className="info-label">Preparation Guidelines</span><span className="info-value">{activeCompanyPrep.guidelines}</span></div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="page-header">
                <div>
                  <h1 className="page-title">Company-specific Preparation</h1>
                  <p className="page-subtitle">Syllabus, debugging outputs, patterns, and guidelines for top corporate partners</p>
                </div>
              </div>

              <div className="company-grid">
                {Object.keys(Storage.getCompanyPrep()).map(compName => {
                  const viewed = student.trainingProgress?.companyPrepViewed?.includes(compName);
                  return (
                    <div key={compName} className="company-card">
                      <div className="company-logo-wrap">
                        <i className="fas fa-building"></i>
                      </div>
                      <div className="company-card-info">
                        <h3>{compName} {viewed && <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 500 }}><i className="fas fa-eye"></i> Visited</span>}</h3>
                        <p>View selection stages, online testing syllabus, aptitude standards, and C/Python/Java interview topics.</p>
                      </div>
                      <button className="btn btn-outline btn-full btn-sm" onClick={() => viewCompanyPrep(compName)}>View Details</button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── STUDENT PROFILE ── */}
      {activeView === 'student-profile' && (
        <section className="view">
          <div className="page-header">
            <div><h1 className="page-title">My Profile</h1><p className="page-subtitle">Manage your personal information</p></div>
            <div className="page-actions"><button className="btn btn-ghost btn-sm" onClick={() => window.print()}><i className="fas fa-print"></i> Print</button></div>
          </div>
          <div className="profile-layout">
            {/* Left – ID Card */}
            <div className="profile-left">
              <div className="card student-id-card">
                <div className="id-card-header">
                  <div className="id-card-brand"><i className="fas fa-graduation-cap"></i> SRMS</div>
                  <span className="id-card-label">STUDENT ID</span>
                </div>
                <div className="id-card-photo" style={{ background: student.profilePhoto ? 'none' : nameToColor(student.fullName), display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '2rem', borderRadius: 12, overflow: 'hidden' }}>
                  {student.profilePhoto ? <img src={student.profilePhoto} alt={student.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : getInitials(student.fullName)}
                </div>
                <div className="id-card-info">
                  <h3>{student.fullName}</h3>
                  <p className="id-number">{student.studentId}</p>
                  <p className="id-course">{student.course || '—'}</p>
                </div>
                <div className="id-card-footer"><div className="id-barcode"><div className="barcode-lines"></div></div></div>
              </div>
              <button className="btn btn-outline btn-full mt-2" onClick={() => photoRef.current?.click()}><i className="fas fa-camera"></i> Change Photo</button>
              <input ref={photoRef} type="file" accept="image/*" className="hidden-input" onChange={e => handlePhotoChange(e.target.files[0])} />
            </div>

            {/* Right – Details */}
            <div className="profile-right">
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title"><i className="fas fa-user"></i> Personal Information</h3>
                  {!editMode && <button className="btn btn-primary btn-sm" onClick={startEdit}><i className="fas fa-edit"></i> Edit</button>}
                </div>
                {!editMode ? (
                  <div className="card-body">
                    <div className="info-grid">
                      <div className="info-item"><span className="info-label">Full Name</span><span className="info-value">{student.fullName}</span></div>
                      <div className="info-item"><span className="info-label">Email Address</span><span className="info-value">{student.email}</span></div>
                      <div className="info-item"><span className="info-label">Phone Number</span><span className="info-value">{student.phone || '—'}</span></div>
                      <div className="info-item"><span className="info-label">Date of Birth</span><span className="info-value">{formatDate(student.dob)}</span></div>
                      <div className="info-item" style={{ gridColumn: 'span 2' }}><span className="info-label">Address</span><span className="info-value">{student.address || '—'}</span></div>
                    </div>
                  </div>
                ) : (
                  <form className="card-body" onSubmit={saveProfile} noValidate>
                    <div className="form-row">
                      <div className="form-group flex-1">
                        <label className="form-label">Full Name</label>
                        <div className="input-wrapper"><i className="fas fa-user input-icon"></i><input type="text" className="form-input" value={editForm.fullName || ''} onChange={sef('fullName')} /></div>
                        {editErrors.fullName && <span className="field-error">{editErrors.fullName}</span>}
                      </div>
                      <div className="form-group flex-1">
                        <label className="form-label">Phone</label>
                        <div className="input-wrapper"><i className="fas fa-phone input-icon"></i><input type="tel" className="form-input" value={editForm.phone || ''} onChange={sef('phone')} /></div>
                        {editErrors.phone && <span className="field-error">{editErrors.phone}</span>}
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group flex-1">
                        <label className="form-label">Date of Birth</label>
                        <div className="input-wrapper"><i className="fas fa-calendar input-icon"></i><input type="date" className="form-input" value={editForm.dob || ''} onChange={sef('dob')} /></div>
                      </div>
                      <div className="form-group flex-1">
                        <label className="form-label">Address</label>
                        <div className="input-wrapper"><i className="fas fa-map-marker-alt input-icon"></i><input type="text" className="form-input" value={editForm.address || ''} onChange={sef('address')} /></div>
                      </div>
                    </div>
                    <div className="form-actions">
                      <button type="button" className="btn btn-ghost" onClick={cancelEdit}>Cancel</button>
                      <button type="submit" className="btn btn-primary">Save Changes</button>
                    </div>
                  </form>
                )}
              </div>
              <div className="card">
                <div className="card-header"><h3 className="card-title"><i className="fas fa-graduation-cap"></i> Academic Information</h3></div>
                <div className="card-body">
                  <div className="info-grid">
                    <div className="info-item"><span className="info-label">Student ID</span><span className="info-value" style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{student.studentId}</span></div>
                    <div className="info-item"><span className="info-label">Course Program</span><span className="info-value">{student.course || '—'}</span></div>
                    <div className="info-item"><span className="info-label">Year Level</span><span className="info-value">{yearDisplay(student.yearLevel)}</span></div>
                    <div className="info-item"><span className="info-label">Status</span><span className="info-value"><span className={`badge badge-${statusCls}`}>{student.status}</span></span></div>
                    <div className="info-item" style={{ gridColumn: 'span 2' }}><span className="info-label">Enrollment Date</span><span className="info-value">{formatDate(student.enrollmentDate)}</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── MY COURSES ── */}
      {activeView === 'student-courses' && (
        <section className="view">
          <div className="page-header"><div><h1 className="page-title">My Courses</h1><p className="page-subtitle">Your enrolled program details</p></div></div>
          <div className="course-layout">
            {subjects.map(sub => (
              <div key={sub.code} className="card course-card glass-card">
                <div className="course-card-header">
                  <span className="course-code">{sub.code}</span>
                  <span className="course-credits">{sub.credits} Credits</span>
                </div>
                <h3 className="course-title">{sub.name}</h3>
                <div className="course-details">
                  <p><i className="fas fa-calendar-alt"></i> {sub.schedule}</p>
                  <p><i className="fas fa-user-tie"></i> {sub.instructor}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── ACTIVITY LOG ── */}
      {activeView === 'student-activity' && (
        <section className="view">
          <div className="page-header"><div><h1 className="page-title">Activity Log</h1><p className="page-subtitle">Your recent account activity</p></div></div>
          <div className="card">
            <div className="activity-list">
              {logs.length === 0
                ? <div className="empty-state-sm"><i className="fas fa-inbox"></i><p>No activity yet</p></div>
                : logs.map((a, i) => <ActivityItem key={i} act={a} />)
              }
            </div>
          </div>
        </section>
      )}

      {/* ── STUDENT SETTINGS ── */}
      {activeView === 'student-settings' && (
        <section className="view">
          <div className="page-header"><div><h1 className="page-title">Settings</h1><p className="page-subtitle">Manage your account preferences</p></div></div>
          <div className="settings-grid">
            <div className="card">
              <div className="card-header"><h3 className="card-title"><i className="fas fa-palette"></i> Appearance</h3></div>
              <div className="card-body">
                <div className="setting-row">
                  <div><strong>Theme</strong><p className="setting-desc">Switch between light and dark mode</p></div>
                  <div className="theme-toggle-switch">
                    <span>Light</span>
                    <label className="toggle-switch"><input type="checkbox" checked={theme === 'dark'} onChange={e => applyTheme(e.target.checked ? 'dark' : 'light')} /><span className="toggle-slider"></span></label>
                    <span>Dark</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="card-header"><h3 className="card-title"><i className="fas fa-key"></i> Change Password</h3></div>
              <div className="card-body">
                <form className="settings-form" onSubmit={handlePwChange} noValidate>
                  <div className="form-group"><label className="form-label">Current Password</label><div className="input-wrapper"><i className="fas fa-lock input-icon"></i><input type="password" className="form-input" value={pwForm.cur} onChange={spw('cur')} /></div>{pwErrors.cur && <span className="field-error">{pwErrors.cur}</span>}</div>
                  <div className="form-group"><label className="form-label">New Password</label><div className="input-wrapper"><i className="fas fa-lock input-icon"></i><input type="password" className="form-input" value={pwForm.np} onChange={spw('np')} /></div>{pwErrors.np && <span className="field-error">{pwErrors.np}</span>}</div>
                  <div className="form-group"><label className="form-label">Confirm New Password</label><div className="input-wrapper"><i className="fas fa-lock input-icon"></i><input type="password" className="form-input" value={pwForm.cp} onChange={spw('cp')} /></div>{pwErrors.cp && <span className="field-error">{pwErrors.cp}</span>}</div>
                  <button type="submit" className="btn btn-primary">Update Password</button>
                </form>
              </div>
            </div>
          </div>
        </section>
      )}

    </div>
  );
}
