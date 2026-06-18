/**
 * Login.jsx – Auth views: Login, Register (multi-step), Forgot Password
 */
import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import * as Storage from '../utils/storage.js';
import {
  isValidEmail, isValidPhone, isStrongPassword, getPasswordStrength,
  hashPassword, generateStudentId, readFileAsDataURL, yearDisplay
} from '../utils/helpers.js';

const COURSES = [
  'B.E. Computer Science and Engineering',
  'B.E. Electronics and Communication Engineering',
  'B.E. Electrical and Electronics Engineering',
  'B.E. Mechanical Engineering',
  'B.E. Civil Engineering',
  'B.Tech Information Technology',
  'B.Tech Artificial Intelligence and Data Science',
  'B.Tech Cyber Security',
  'B.Tech Robotics and Automation',
  'M.E. Computer Science and Engineering',
  'M.E. Power Electronics and Drives',
  'M.E. Structural Engineering',
];

export default function Login() {
  const { login, showToast } = useAuth();
  const [authView, setAuthView] = useState('login'); // 'login' | 'register' | 'forgot'
  const [role, setRole] = useState('student');

  // ── Login Form ──────────────────────────────────────────────
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loginErrors, setLoginErrors] = useState({});
  const [loginLoading, setLoginLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!loginEmail) errs.email = 'Email is required.';
    else if (!isValidEmail(loginEmail)) errs.email = 'Enter a valid email address.';
    if (!loginPass) errs.pass = 'Password is required.';
    if (Object.keys(errs).length) { setLoginErrors(errs); return; }
    setLoginErrors({});
    setLoginLoading(true);
    await new Promise(r => setTimeout(r, 600));
    const user = Storage.getUser(loginEmail.toLowerCase());
    setLoginLoading(false);
    if (!user) { setLoginErrors({ email: 'No account found with this email.' }); showToast('Login Failed', 'Account not found.', 'error'); return; }
    const { verifyPassword } = await import('../utils/helpers.js');
    if (!verifyPassword(loginPass, user.passwordHash)) { setLoginErrors({ pass: 'Incorrect password.' }); showToast('Login Failed', 'Incorrect password.', 'error'); return; }
    if (role === 'admin' && user.role !== 'admin') { setLoginErrors({ email: 'This account does not have admin privileges.' }); return; }
    if (role === 'student' && user.role !== 'student') { setLoginErrors({ email: 'Please use the Admin tab.' }); return; }
    if (user.role === 'student') {
      Storage.updateUser(user.email, {
        activityLog: [{ type: 'login', text: 'Logged in', timestamp: new Date().toISOString() }, ...(user.activityLog || []).slice(0, 49)]
      });
    }
    showToast('Welcome back!', `Signed in as ${user.fullName || loginEmail}`, 'success');
    login(Storage.getUser(user.email), rememberMe);
  };

  // ── Register Form ───────────────────────────────────────────
  const [step, setStep] = useState(1);
  const [reg, setReg] = useState({ studentId: '', registerNumber: '', fullName: '', phone: '', dob: '', address: '', course: '', yearLevel: '', status: 'Active', enrollmentDate: '', email: '', password: '', confirm: '' });
  const [regErrors, setRegErrors] = useState({});
  const [regPhoto, setRegPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [strength, setStrength] = useState({ score: 0, label: '', color: '#999' });
  const photoRef = useRef();

  const setRf = (k) => (e) => setReg(p => ({ ...p, [k]: e.target.value }));

  const validateStep1 = () => {
    const errs = {};
    if (!reg.fullName.trim()) errs.fullName = 'Full name is required.';
    if (!reg.phone.trim()) errs.phone = 'Phone is required.';
    else if (!isValidPhone(reg.phone)) errs.phone = 'Enter a valid phone number.';
    if (!reg.dob) errs.dob = 'Date of birth is required.';
    if (!reg.registerNumber.trim()) errs.registerNumber = 'Register number is required.';
    else if (Storage.registerNumberExists(reg.registerNumber)) errs.registerNumber = 'This register number is already in use.';
    if (reg.studentId && Storage.studentIdExists(reg.studentId)) errs.studentId = 'Student ID already taken.';
    setRegErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = () => {
    const errs = {};
    if (!reg.course) errs.course = 'Please select a course.';
    if (!reg.yearLevel) errs.yearLevel = 'Please select a year level.';
    setRegErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!reg.email || !isValidEmail(reg.email)) errs.email = 'Enter a valid email.';
    else if (Storage.emailExists(reg.email)) errs.email = 'Email already registered.';
    if (!isStrongPassword(reg.password)) errs.password = 'Min 8 chars with uppercase, lowercase, and number.';
    if (reg.password !== reg.confirm) errs.confirm = 'Passwords do not match.';
    if (Object.keys(errs).length) { setRegErrors(errs); return; }

    await new Promise(r => setTimeout(r, 800));
    const sid = reg.studentId || generateStudentId();
    const user = {
      role: 'student', studentId: sid, registerNumber: reg.registerNumber, fullName: reg.fullName, email: reg.email.toLowerCase(),
      passwordHash: hashPassword(reg.password), phone: reg.phone, dob: reg.dob,
      address: reg.address, course: reg.course, yearLevel: reg.yearLevel,
      status: reg.status || 'Active', enrollmentDate: reg.enrollmentDate || new Date().toISOString().split('T')[0],
      profilePhoto: regPhoto || null,
      activityLog: [{ type: 'create', text: 'Account created', timestamp: new Date().toISOString() }],
      createdAt: new Date().toISOString(),
    };
    Storage.saveUser(user);
    Storage.addActivity({ type: 'create', text: `New student <strong>${user.fullName}</strong> registered`, userEmail: user.email });
    showToast('Account Created!', 'You can now sign in.', 'success');
    setAuthView('login');
    setStep(1);
    setReg({ studentId: '', registerNumber: '', fullName: '', phone: '', dob: '', address: '', course: '', yearLevel: '', status: 'Active', enrollmentDate: '', email: '', password: '', confirm: '' });
    setRegPhoto(null); setPhotoPreview(null);
  };

  const handlePhotoSelect = async (file) => {
    if (!file || !file.type.startsWith('image/')) { showToast('Error', 'Only image files are allowed.', 'error'); return; }
    if (file.size > 2 * 1024 * 1024) { showToast('Error', 'Image must be under 2MB.', 'error'); return; }
    const url = await readFileAsDataURL(file);
    setRegPhoto(url); setPhotoPreview(url);
  };

  // ── Forgot Password ─────────────────────────────────────────
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotVerified, setForgotVerified] = useState(false);
  const [forgotPass, setForgotPass] = useState('');
  const [forgotConfirm, setForgotConfirm] = useState('');
  const [forgotErrors, setForgotErrors] = useState({});

  const handleForgotSubmit = (e) => {
    e.preventDefault();
    if (!forgotVerified) {
      if (!forgotEmail || !isValidEmail(forgotEmail)) { setForgotErrors({ email: 'Enter a valid email.' }); return; }
      const user = Storage.getUser(forgotEmail.toLowerCase());
      if (!user || user.role === 'admin') { setForgotErrors({ email: 'No student account found.' }); return; }
      setForgotVerified(true); setForgotErrors({});
      showToast('Account Found!', 'Enter your new password.', 'info');
    } else {
      const errs = {};
      if (!isStrongPassword(forgotPass)) errs.pass = 'Min 8 chars with uppercase, lowercase, and number.';
      if (forgotPass !== forgotConfirm) errs.confirm = 'Passwords do not match.';
      if (Object.keys(errs).length) { setForgotErrors(errs); return; }
      Storage.updateUser(forgotEmail.toLowerCase(), { passwordHash: hashPassword(forgotPass) });
      showToast('Password Reset!', 'Sign in with your new password.', 'success');
      setForgotVerified(false); setForgotEmail(''); setForgotPass(''); setForgotConfirm('');
      setAuthView('login');
    }
  };

  // ── Toggle password visibility ──────────────────────────────
  const [showPw, setShowPw] = useState({});
  const togglePw = (k) => setShowPw(p => ({ ...p, [k]: !p[k] }));

  // ── Shared Auth Left Panel ──────────────────────────────────
  const AuthLeft = ({ headline, tagline, features }) => (
    <div className="auth-left">
      <div className="auth-left-content">
        <div className="auth-brand">
          <div className="brand-icon"><i className="fas fa-graduation-cap"></i></div>
          <h1 className="brand-name">SRMS</h1>
        </div>
        <h2 className="auth-headline">{headline}</h2>
        <p className="auth-tagline">{tagline}</p>
        <div className="auth-features">
          {features.map((f, i) => (
            <div key={i} className="feature-item"><i className={`fas ${f.icon}`}></i><span>{f.text}</span></div>
          ))}
        </div>
      </div>
      <div className="auth-bg-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>
    </div>
  );

  // ── LOGIN VIEW ──────────────────────────────────────────────
  if (authView === 'login') return (
    <div id="page-auth" className="page page-auth">
      <section id="view-login" className="auth-view">
        <AuthLeft
          headline="Welcome Back!"
          tagline="Sign in to access your student portal and manage your academic journey."
          features={[{ icon: 'fa-shield-alt', text: 'Secure Access' }, { icon: 'fa-chart-line', text: 'Track Progress' }, { icon: 'fa-bell', text: 'Stay Updated' }]}
        />
        <div className="auth-right">
          <div className="auth-card glass-card">
            <div className="auth-card-header"><h2>Sign In</h2><p>Enter your credentials to continue</p></div>
            <div className="role-tabs">
              {['student', 'admin'].map(r => (
                <button key={r} className={`role-tab${role === r ? ' active' : ''}`} onClick={() => setRole(r)}>
                  <i className={`fas ${r === 'student' ? 'fa-user-graduate' : 'fa-user-shield'}`}></i> {r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
            <form className="auth-form" onSubmit={handleLogin} noValidate>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div className="input-wrapper">
                  <i className="fas fa-envelope input-icon"></i>
                  <input type="email" className="form-input" placeholder="your@email.com" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} autoComplete="email" />
                </div>
                {loginErrors.email && <span className="field-error">{loginErrors.email}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="input-wrapper">
                  <i className="fas fa-lock input-icon"></i>
                  <input type={showPw.login ? 'text' : 'password'} className="form-input" placeholder="••••••••" value={loginPass} onChange={e => setLoginPass(e.target.value)} autoComplete="current-password" />
                  <button type="button" className="toggle-password" onClick={() => togglePw('login')}><i className={`fas ${showPw.login ? 'fa-eye-slash' : 'fa-eye'}`}></i></button>
                </div>
                {loginErrors.pass && <span className="field-error">{loginErrors.pass}</span>}
              </div>
              <div className="form-row space-between">
                <label className="checkbox-label">
                  <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} />
                  <span className="checkmark"></span> Remember me
                </label>
                <button type="button" className="link-btn" onClick={() => setAuthView('forgot')}>Forgot Password?</button>
              </div>
              <button type="submit" className={`btn btn-primary btn-full btn-lg${loginLoading ? ' loading' : ''}`} disabled={loginLoading}>
                <span className="btn-text">Sign In</span><i className="fas fa-arrow-right"></i>
              </button>
            </form>
            <div className="auth-divider"><span>New student?</span></div>
            <button className="btn btn-outline btn-full" onClick={() => { setAuthView('register'); setStep(1); }}>Create Account</button>
            <p style={{ textAlign: 'center', marginTop: 10, fontSize: '0.8rem', color: 'var(--text-muted, #888)' }}>
              <i className="fas fa-info-circle" style={{ marginRight: 4 }}></i>
              Account created by admin? Sign in with your assigned credentials — no registration needed.
            </p>
          </div>
        </div>
      </section>
    </div>
  );

  // ── FORGOT PASSWORD VIEW ────────────────────────────────────
  if (authView === 'forgot') return (
    <div id="page-auth" className="page page-auth">
      <section id="view-forgot" className="auth-view">
        <AuthLeft
          headline="Password Recovery"
          tagline="Don't worry! We'll help you reset your password securely."
          features={[]}
        />
        <div className="auth-right">
          <div className="auth-card glass-card">
            <div className="auth-card-header">
              <div className="auth-icon-header"><i className="fas fa-key"></i></div>
              <h2>Reset Password</h2>
              <p>Enter your registered email to proceed</p>
            </div>
            <form className="auth-form" onSubmit={handleForgotSubmit} noValidate>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div className="input-wrapper">
                  <i className="fas fa-envelope input-icon"></i>
                  <input type="email" className="form-input" placeholder="your@email.com" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} readOnly={forgotVerified} />
                </div>
                {forgotErrors.email && <span className="field-error">{forgotErrors.email}</span>}
              </div>
              {forgotVerified && (
                <>
                  <div className="form-group">
                    <label className="form-label">New Password</label>
                    <div className="input-wrapper">
                      <i className="fas fa-lock input-icon"></i>
                      <input type={showPw.fp ? 'text' : 'password'} className="form-input" placeholder="New password" value={forgotPass} onChange={e => setForgotPass(e.target.value)} />
                      <button type="button" className="toggle-password" onClick={() => togglePw('fp')}><i className={`fas ${showPw.fp ? 'fa-eye-slash' : 'fa-eye'}`}></i></button>
                    </div>
                    {forgotErrors.pass && <span className="field-error">{forgotErrors.pass}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Confirm New Password</label>
                    <div className="input-wrapper">
                      <i className="fas fa-lock input-icon"></i>
                      <input type="password" className="form-input" placeholder="Confirm password" value={forgotConfirm} onChange={e => setForgotConfirm(e.target.value)} />
                    </div>
                    {forgotErrors.confirm && <span className="field-error">{forgotErrors.confirm}</span>}
                  </div>
                </>
              )}
              <button type="submit" className="btn btn-primary btn-full btn-lg">
                <i className="fas fa-paper-plane"></i> {forgotVerified ? 'Reset Password' : 'Find Account'}
              </button>
            </form>
            <div className="auth-divider"><span>Remembered it?</span></div>
            <button className="btn btn-outline btn-full" onClick={() => { setAuthView('login'); setForgotVerified(false); }}>Back to Sign In</button>
          </div>
        </div>
      </section>
    </div>
  );

  // ── REGISTER VIEW ───────────────────────────────────────────
  return (
    <div id="page-auth" className="page page-auth">
      <section id="view-register" className="auth-view">
        <AuthLeft
          headline="Join Our Campus!"
          tagline="Create your student account and start managing your academic profile today."
          features={[{ icon: 'fa-id-card', text: 'Digital Student ID' }, { icon: 'fa-book-open', text: 'Course Management' }, { icon: 'fa-history', text: 'Activity Tracking' }]}
        />
        <div className="auth-right">
          <div className="auth-card glass-card" style={{ maxWidth: 520 }}>
            <div className="auth-card-header"><h2>Create Account</h2><p>Fill in your details to register</p></div>
            <div className="step-indicator">
              {[1, 2, 3].map((s, i) => (
                <React.Fragment key={s}>
                  <div className={`step${step === s ? ' active' : ''}${step > s ? ' done' : ''}`} data-step={s}>
                    <span>{s}</span>
                    <label>{['Personal', 'Academic', 'Security'][i]}</label>
                  </div>
                  {i < 2 && <div className={`step-line${step > s ? ' done' : ''}`}></div>}
                </React.Fragment>
              ))}
            </div>
            <form className="auth-form" onSubmit={handleRegisterSubmit} noValidate>
              {/* STEP 1 */}
              {step === 1 && (
                <div className="form-step active">
                  <div className="form-group">
                    <label className="form-label">Register Number *</label>
                    <div className="input-wrapper">
                      <i className="fas fa-id-card input-icon"></i>
                      <input type="text" className="form-input" placeholder="e.g. REG2024001" value={reg.registerNumber} onChange={setRf('registerNumber')} />
                    </div>
                    {regErrors.registerNumber && <span className="field-error">{regErrors.registerNumber}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Student ID</label>
                    <div className="input-wrapper">
                      <i className="fas fa-id-badge input-icon"></i>
                      <input type="text" className="form-input" placeholder="e.g. S2024001 (optional)" value={reg.studentId} onChange={setRf('studentId')} />
                      <button type="button" className="input-action-btn" onClick={() => { let id; do { id = generateStudentId(); } while (Storage.studentIdExists(id)); setReg(p => ({ ...p, studentId: id })); }} title="Auto-generate ID"><i className="fas fa-magic"></i></button>
                    </div>
                    {regErrors.studentId && <span className="field-error">{regErrors.studentId}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <div className="input-wrapper"><i className="fas fa-user input-icon"></i><input type="text" className="form-input" placeholder="John Doe" value={reg.fullName} onChange={setRf('fullName')} /></div>
                    {regErrors.fullName && <span className="field-error">{regErrors.fullName}</span>}
                  </div>
                  <div className="form-row">
                    <div className="form-group flex-1">
                      <label className="form-label">Phone *</label>
                      <div className="input-wrapper"><i className="fas fa-phone input-icon"></i><input type="tel" className="form-input" placeholder="+91 9876543210" value={reg.phone} onChange={setRf('phone')} /></div>
                      {regErrors.phone && <span className="field-error">{regErrors.phone}</span>}
                    </div>
                    <div className="form-group flex-1">
                      <label className="form-label">Date of Birth *</label>
                      <div className="input-wrapper"><i className="fas fa-calendar input-icon"></i><input type="date" className="form-input" value={reg.dob} onChange={setRf('dob')} /></div>
                      {regErrors.dob && <span className="field-error">{regErrors.dob}</span>}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Address</label>
                    <div className="input-wrapper"><i className="fas fa-map-marker-alt input-icon"></i><input type="text" className="form-input" placeholder="123 Main St, City" value={reg.address} onChange={setRf('address')} /></div>
                  </div>
                  <button type="button" className="btn btn-primary btn-full" onClick={() => validateStep1() && setStep(2)}>Next: Academic Info <i className="fas fa-arrow-right"></i></button>
                </div>
              )}
              {/* STEP 2 */}
              {step === 2 && (
                <div className="form-step active">
                  <div className="form-group">
                    <label className="form-label">Course / Program *</label>
                    <div className="input-wrapper"><i className="fas fa-book input-icon"></i>
                      <select className="form-input form-select" value={reg.course} onChange={setRf('course')}>
                        <option value="">Select Course</option>
                        {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    {regErrors.course && <span className="field-error">{regErrors.course}</span>}
                  </div>
                  <div className="form-row">
                    <div className="form-group flex-1">
                      <label className="form-label">Year Level *</label>
                      <div className="input-wrapper"><i className="fas fa-layer-group input-icon"></i>
                        <select className="form-input form-select" value={reg.yearLevel} onChange={setRf('yearLevel')}>
                          <option value="">Select Year</option>
                          {['1', '2', '3', '4', '5', 'Graduate'].map(y => <option key={y} value={y}>{yearDisplay(y)}</option>)}
                        </select>
                      </div>
                      {regErrors.yearLevel && <span className="field-error">{regErrors.yearLevel}</span>}
                    </div>
                    <div className="form-group flex-1">
                      <label className="form-label">Enrollment Date</label>
                      <div className="input-wrapper"><i className="fas fa-calendar-check input-icon"></i><input type="date" className="form-input" value={reg.enrollmentDate} onChange={setRf('enrollmentDate')} /></div>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Profile Photo</label>
                    <div className="photo-upload" onClick={() => photoRef.current?.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); handlePhotoSelect(e.dataTransfer.files[0]); }}>
                      <div className="photo-preview">
                        {photoPreview ? <img src={photoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : <i className="fas fa-user-circle"></i>}
                      </div>
                      <div className="photo-upload-info"><p>Click to upload or drag & drop</p><small>PNG, JPG up to 2MB</small></div>
                      <input ref={photoRef} type="file" accept="image/*" className="hidden-input" onChange={e => handlePhotoSelect(e.target.files[0])} />
                    </div>
                  </div>
                  <div className="form-row" style={{ gap: 8 }}>
                    <button type="button" className="btn btn-ghost" onClick={() => setStep(1)}><i className="fas fa-arrow-left"></i> Back</button>
                    <button type="button" className="btn btn-primary flex-1" onClick={() => validateStep2() && setStep(3)}>Next: Security <i className="fas fa-arrow-right"></i></button>
                  </div>
                </div>
              )}
              {/* STEP 3 */}
              {step === 3 && (
                <div className="form-step active">
                  <div className="form-group">
                    <label className="form-label">Email Address *</label>
                    <div className="input-wrapper"><i className="fas fa-envelope input-icon"></i><input type="email" className="form-input" placeholder="student@university.edu" value={reg.email} onChange={setRf('email')} /></div>
                    {regErrors.email && <span className="field-error">{regErrors.email}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Password *</label>
                    <div className="input-wrapper">
                      <i className="fas fa-lock input-icon"></i>
                      <input type={showPw.rp ? 'text' : 'password'} className="form-input" placeholder="Min 8 chars" value={reg.password} onChange={e => { setRf('password')(e); setStrength(getPasswordStrength(e.target.value)); }} />
                      <button type="button" className="toggle-password" onClick={() => togglePw('rp')}><i className={`fas ${showPw.rp ? 'fa-eye-slash' : 'fa-eye'}`}></i></button>
                    </div>
                    {reg.password && (
                      <div className="password-strength">
                        <div className="strength-bar"><div className="strength-fill" style={{ width: strength.score + '%', background: strength.color }}></div></div>
                        <span className="strength-label" style={{ color: strength.color }}>{strength.label}</span>
                      </div>
                    )}
                    {regErrors.password && <span className="field-error">{regErrors.password}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Confirm Password *</label>
                    <div className="input-wrapper"><i className="fas fa-lock input-icon"></i><input type="password" className="form-input" placeholder="Re-enter password" value={reg.confirm} onChange={setRf('confirm')} /></div>
                    {regErrors.confirm && <span className="field-error">{regErrors.confirm}</span>}
                  </div>
                  <div className="form-row" style={{ gap: 8 }}>
                    <button type="button" className="btn btn-ghost" onClick={() => setStep(2)}><i className="fas fa-arrow-left"></i> Back</button>
                    <button type="submit" className="btn btn-primary flex-1"><i className="fas fa-user-plus"></i> Create Account</button>
                  </div>
                </div>
              )}
            </form>
            <div className="auth-divider"><span>Already have an account?</span></div>
            <button className="btn btn-outline btn-full" onClick={() => setAuthView('login')}>Sign In</button>
          </div>
        </div>
      </section>
    </div>
  );
}
