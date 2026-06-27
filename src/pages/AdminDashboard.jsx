/**
 * AdminDashboard.jsx – Full admin interface: stats, student table, activity, settings
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import * as Storage from '../utils/storage.js';
import {
  formatDate, formatDateShort, timeAgo,
  getInitials, nameToColor, yearDisplay, escapeHtml,
  studentsToCSV, csvToStudents, downloadFile, readFileAsText,
  readFileAsDataURL, generateStudentId, isValidEmail,
  isValidPhone, isStrongPassword, hashPassword, verifyPassword
} from '../utils/helpers.js';

// helpers that aren't exported from helpers.js but we need inline
const statusBadgeClass = (s) => ({ Active: 'active', Graduated: 'graduated', Suspended: 'suspended', Withdrawn: 'withdrawn' }[s] || 'active');

const COURSES = [
  'B.E. Computer Science and Engineering - Sec A',
  'B.E. Computer Science and Engineering - Sec B',
  'B.E. Computer Science and Engineering - Sec C',
  'B.E. Electronics and Communication Engineering - Sec A',
  'B.E. Electronics and Communication Engineering - Sec B',
  'B.E. Electronics and Communication Engineering - Sec C',
  'B.E. Electrical and Electronics Engineering - Sec A',
  'B.E. Electrical and Electronics Engineering - Sec B',
  'B.E. Electrical and Electronics Engineering - Sec C',
  'B.Tech Information Technology - Sec A',
  'B.Tech Information Technology - Sec B',
  'B.Tech Information Technology - Sec C',
  'B.E. Mechanical Engineering - Sec A',
  'B.E. Mechanical Engineering - Sec B',
  'B.E. Mechanical Engineering - Sec C',
  'B.E. Civil Engineering - Sec A',
  'B.E. Civil Engineering - Sec B',
  'B.E. Civil Engineering - Sec C',
  'B.Tech Artificial Intelligence and Data Science',
  'B.Tech Cyber Security',
  'B.Tech Robotics and Automation',
  'M.E. Computer Science and Engineering',
  'M.E. Power Electronics and Drives',
  'M.E. Structural Engineering',
];

// Activity item renderer
function ActivityItem({ act }) {
  const iconMap = { login: 'fa-sign-in-alt', create: 'fa-user-plus', update: 'fa-user-edit', delete: 'fa-user-minus', reset: 'fa-key', import: 'fa-file-import', logout: 'fa-sign-out-alt' };
  return (
    <div className="activity-item">
      <div className={`activity-icon ${act.type}`}><i className={`fas ${iconMap[act.type] || 'fa-info-circle'}`}></i></div>
      <div className="activity-content">
        <p className="activity-text" dangerouslySetInnerHTML={{ __html: act.text }}></p>
        <span className="activity-time">{timeAgo(act.timestamp)}</span>
      </div>
    </div>
  );
}

// Student Avatar
function Avatar({ student, size = 36 }) {
  if (student.profilePhoto) return <div className="student-avatar-sm"><img src={student.profilePhoto} alt={student.fullName} /></div>;
  return <div className="student-avatar-sm" style={{ background: nameToColor(student.fullName), display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.75rem' }}>{getInitials(student.fullName)}</div>;
}

// Student Form (Add / Edit)
function StudentFormModal({ student, onSave, onClose }) {
  const { currentUser } = useAuth();
  const isEdit = !!student;
  const [form, setForm] = useState({
    studentId: student?.studentId || '', registerNumber: student?.registerNumber || '',
    fullName: student?.fullName || '',
    email: student?.email || '', phone: student?.phone || '',
    password: '', dob: student?.dob || '', address: student?.address || '',
    course: student?.course || (currentUser?.isMainAdmin ? '' : currentUser?.representedClass || ''), yearLevel: student?.yearLevel || '',
    enrollmentDate: student?.enrollmentDate || '',
    status: student?.status || 'Active',
  });
  const [errors, setErrors] = useState({});
  const [photoData, setPhotoData] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(student?.profilePhoto || null);
  const photoRef = useRef();

  const sf = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.fullName.trim()) e.fullName = 'Name is required.';
    if (!isValidEmail(form.email)) e.email = 'Valid email is required.';
    else if (Storage.emailExists(form.email, isEdit ? student.email : null)) e.email = 'Email already registered.';
    if (form.phone && !isValidPhone(form.phone)) e.phone = 'Invalid phone.';
    if (form.studentId && Storage.studentIdExists(form.studentId, isEdit ? student.email : null)) e.studentId = 'Student ID taken.';
    if (!form.registerNumber.trim()) e.registerNumber = 'Register number is required.';
    else if (Storage.registerNumberExists(form.registerNumber, isEdit ? student.email : null)) e.registerNumber = 'Register number already in use.';
    if (!form.course) e.course = 'Select a course.';
    if (!form.yearLevel) e.yearLevel = 'Select a year.';
    if (!isEdit && !isStrongPassword(form.password)) e.password = 'Min 8 chars with uppercase, lowercase, number.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    const sid = form.studentId || generateStudentId();
    if (isEdit) {
      const updates = { fullName: form.fullName, phone: form.phone, dob: form.dob, address: form.address, course: form.course, yearLevel: form.yearLevel, enrollmentDate: form.enrollmentDate, status: form.status, registerNumber: form.registerNumber };
      if (photoData) updates.profilePhoto = photoData;
      Storage.updateUser(student.email, updates);
      Storage.addActivity({ type: 'update', text: `Admin updated <strong>${form.fullName}</strong>'s record`, userEmail: student.email });
    } else {
      const newUser = {
        role: 'student', studentId: sid, registerNumber: form.registerNumber, fullName: form.fullName, email: form.email.toLowerCase(),
        passwordHash: hashPassword(form.password), phone: form.phone, dob: form.dob,
        address: form.address, course: form.course, yearLevel: form.yearLevel,
        enrollmentDate: form.enrollmentDate || new Date().toISOString().split('T')[0],
        status: form.status, profilePhoto: photoData || null,
        activityLog: [{ type: 'create', text: 'Account created by admin', timestamp: new Date().toISOString() }],
        createdAt: new Date().toISOString(),
      };
      Storage.saveUser(newUser);
      Storage.addActivity({ type: 'create', text: `Admin added student <strong>${form.fullName}</strong>`, userEmail: newUser.email });
    }
    onSave();
    onClose();
  };

  const handlePhoto = async (file) => {
    if (!file || !file.type.startsWith('image/') || file.size > 2 * 1024 * 1024) return;
    const url = await readFileAsDataURL(file);
    setPhotoData(url); setPhotoPreview(url);
  };

  return (
    <form className="modal-form" onSubmit={handleSubmit} noValidate>
      <div className="form-row">
        <div className="form-group flex-1">
          <label className="form-label">Register Number *</label>
          <div className="input-wrapper">
            <i className="fas fa-id-card input-icon"></i>
            <input className="form-input" value={form.registerNumber} onChange={sf('registerNumber')} placeholder="e.g. REG2024001" />
          </div>
          {errors.registerNumber && <span className="field-error">{errors.registerNumber}</span>}
        </div>
        <div className="form-group flex-1">
          <label className="form-label">Student ID</label>
          <div className="input-wrapper">
            <i className="fas fa-id-badge input-icon"></i>
            <input className="form-input" value={form.studentId} onChange={sf('studentId')} placeholder="Auto-generated" readOnly={isEdit} />
            {!isEdit && <button type="button" className="input-action-btn" onClick={() => { let id; do { id = generateStudentId(); } while (Storage.studentIdExists(id)); setForm(p => ({ ...p, studentId: id })); }}><i className="fas fa-magic"></i></button>}
          </div>
          {errors.studentId && <span className="field-error">{errors.studentId}</span>}
        </div>
      </div>
      <div className="form-row">
        <div className="form-group flex-1">
          <label className="form-label">Full Name *</label>
          <div className="input-wrapper"><i className="fas fa-user input-icon"></i><input className="form-input" value={form.fullName} onChange={sf('fullName')} /></div>
          {errors.fullName && <span className="field-error">{errors.fullName}</span>}
        </div>
        <div className="form-group flex-1">
          <label className="form-label">Email *</label>
          <div className="input-wrapper"><i className="fas fa-envelope input-icon"></i><input type="email" className="form-input" value={form.email} onChange={sf('email')} readOnly={isEdit} /></div>
          {errors.email && <span className="field-error">{errors.email}</span>}
        </div>
      </div>
      {!isEdit && (
        <div className="form-group">
          <label className="form-label">Password *</label>
          <div className="input-wrapper"><i className="fas fa-lock input-icon"></i><input type="password" className="form-input" value={form.password} onChange={sf('password')} placeholder="Min 8 chars" /></div>
          {errors.password && <span className="field-error">{errors.password}</span>}
        </div>
      )}
      <div className="form-row">
        <div className="form-group flex-1">
          <label className="form-label">Phone</label>
          <div className="input-wrapper"><i className="fas fa-phone input-icon"></i><input type="tel" className="form-input" value={form.phone} onChange={sf('phone')} /></div>
          {errors.phone && <span className="field-error">{errors.phone}</span>}
        </div>
        <div className="form-group flex-1">
          <label className="form-label">Date of Birth</label>
          <div className="input-wrapper"><i className="fas fa-calendar input-icon"></i><input type="date" className="form-input" value={form.dob} onChange={sf('dob')} /></div>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group flex-1">
          <label className="form-label">Address</label>
          <div className="input-wrapper"><i className="fas fa-map-marker-alt input-icon"></i><input className="form-input" value={form.address} onChange={sf('address')} /></div>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group flex-1">
          <label className="form-label">Course *</label>
          <div className="input-wrapper"><i className="fas fa-book input-icon"></i>
            <select className="form-input form-select" value={form.course} onChange={sf('course')} disabled={currentUser && !currentUser.isMainAdmin}>
              <option value="">Select Course</option>
              {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {errors.course && <span className="field-error">{errors.course}</span>}
        </div>
        <div className="form-group flex-1">
          <label className="form-label">Year Level *</label>
          <div className="input-wrapper"><i className="fas fa-layer-group input-icon"></i>
            <select className="form-input form-select" value={form.yearLevel} onChange={sf('yearLevel')}>
              <option value="">Select Year</option>
              {['1','2','3','4','5','Graduate'].map(y => <option key={y} value={y}>{yearDisplay(y)}</option>)}
            </select>
          </div>
          {errors.yearLevel && <span className="field-error">{errors.yearLevel}</span>}
        </div>
      </div>
      <div className="form-row">
        <div className="form-group flex-1">
          <label className="form-label">Enrollment Date</label>
          <div className="input-wrapper"><i className="fas fa-calendar-check input-icon"></i><input type="date" className="form-input" value={form.enrollmentDate} onChange={sf('enrollmentDate')} /></div>
        </div>
        <div className="form-group flex-1">
          <label className="form-label">Status</label>
          <div className="input-wrapper"><i className="fas fa-toggle-on input-icon"></i>
            <select className="form-input form-select" value={form.status} onChange={sf('status')}>
              {['Active','Graduated','Suspended','Withdrawn'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Profile Photo</label>
        <div className="photo-upload" onClick={() => photoRef.current?.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); handlePhoto(e.dataTransfer.files[0]); }}>
          <div className="photo-preview">{photoPreview ? <img src={photoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : <i className="fas fa-user-circle"></i>}</div>
          <div className="photo-upload-info"><p>Click to upload or drag & drop</p><small>PNG, JPG up to 2MB</small></div>
          <input ref={photoRef} type="file" accept="image/*" className="hidden-input" onChange={e => handlePhoto(e.target.files[0])} />
        </div>
      </div>
      <div className="modal-actions">
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary">{isEdit ? 'Save Changes' : 'Add Student'}</button>
      </div>
    </form>
  );
}

// Reset Password Modal
function ResetPasswordModal({ student, onClose }) {
  const { showToast } = useAuth();
  const [np, setNp] = useState(''); const [cp, setCp] = useState('');
  const [err, setErr] = useState({});
  const handle = (e) => {
    e.preventDefault();
    const errs = {};
    if (!isStrongPassword(np)) errs.np = 'Min 8 chars with uppercase, lowercase, number.';
    if (np !== cp) errs.cp = 'Passwords do not match.';
    if (Object.keys(errs).length) { setErr(errs); return; }
    Storage.updateUser(student.email, { passwordHash: hashPassword(np) });
    Storage.addActivity({ type: 'reset', text: `Password reset for <strong>${student.fullName}</strong> by admin`, userEmail: student.email });
    showToast('Password Reset', `Password updated for ${student.fullName}`, 'success');
    onClose();
  };
  return (
    <form className="modal-form" onSubmit={handle} noValidate>
      <p style={{ marginBottom: 16 }}>Reset password for <strong>{student.fullName}</strong></p>
      <div className="form-group">
        <label className="form-label">New Password</label>
        <div className="input-wrapper"><i className="fas fa-lock input-icon"></i><input type="password" className="form-input" value={np} onChange={e => setNp(e.target.value)} /></div>
        {err.np && <span className="field-error">{err.np}</span>}
      </div>
      <div className="form-group">
        <label className="form-label">Confirm Password</label>
        <div className="input-wrapper"><i className="fas fa-lock input-icon"></i><input type="password" className="form-input" value={cp} onChange={e => setCp(e.target.value)} /></div>
        {err.cp && <span className="field-error">{err.cp}</span>}
      </div>
      <div className="modal-actions">
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary">Reset Password</button>
      </div>
    </form>
  );
}

function ManagePlacementModal({ student, onSave, onClose }) {
  const [eligibility, setEligibility] = useState(student.placement?.eligibility || 'Eligible');
  const [placementStatus, setPlacementStatus] = useState(student.placement?.status || 'Unplaced');
  const [appliedCount, setAppliedCount] = useState(student.placement?.appliedCount || 0);
  const [shortlistedCount, setShortlistedCount] = useState(student.placement?.shortlistedCount || 0);
  const [selectedCount, setSelectedCount] = useState(student.placement?.selectedCount || 0);
  const [offersCount, setOffersCount] = useState(student.placement?.offersCount || 0);
  const [internshipDetails, setInternshipDetails] = useState(student.placement?.internshipDetails || '');
  const [joiningStatus, setJoiningStatus] = useState(student.placement?.joiningStatus || 'Not Placed');
  const [interviewStatus, setInterviewStatus] = useState(student.placement?.interviewStatus || 'None');
  const [offerLetterStatus, setOfferLetterStatus] = useState(student.placement?.offerLetterStatus || 'Not Applicable');
  const [offers, setOffers] = useState(student.placement?.offers || []);

  const [newOffer, setNewOffer] = useState({ company: '', role: '', salary: '', status: 'Selected', interviewStatus: 'Completed', offerLetterStatus: 'Received', joiningStatus: 'Joined' });

  const handleAddOffer = () => {
    if (!newOffer.company.trim() || !newOffer.role.trim() || !newOffer.salary) return;
    const salaryNum = parseFloat(newOffer.salary);
    if (isNaN(salaryNum)) return;

    const updatedOffers = [...offers, {
      company: newOffer.company.trim(),
      role: newOffer.role.trim(),
      salary: salaryNum,
      status: newOffer.status,
      interviewStatus: newOffer.interviewStatus,
      offerLetterStatus: newOffer.offerLetterStatus,
      joiningStatus: newOffer.joiningStatus
    }];
    setOffers(updatedOffers);
    setOffersCount(updatedOffers.length);
    setNewOffer({ company: '', role: '', salary: '', status: 'Selected', interviewStatus: 'Completed', offerLetterStatus: 'Received', joiningStatus: 'Joined' });
  };

  const handleRemoveOffer = (idx) => {
    const updatedOffers = offers.filter((_, i) => i !== idx);
    setOffers(updatedOffers);
    setOffersCount(updatedOffers.length);
  };

  const handleSave = (e) => {
    e.preventDefault();
    const selectedOffers = offers.filter(o => o.status === 'Selected');
    const salaries = selectedOffers.map(o => o.salary);
    const highest = salaries.length ? Math.max(...salaries) : 0;
    const average = salaries.length ? parseFloat((salaries.reduce((sum, v) => sum + v, 0) / salaries.length).toFixed(2)) : 0;

    const newHistory = [...(student.placement?.placementHistory || [])];
    if (placementStatus !== student.placement?.status) {
      newHistory.push({
        date: new Date().toISOString().split('T')[0],
        event: `Placement status updated to <strong>${placementStatus}</strong> by Administrator`
      });
    }

    const updates = {
      placement: {
        eligibility,
        status: placementStatus,
        appliedCount: parseInt(appliedCount) || 0,
        shortlistedCount: parseInt(shortlistedCount) || 0,
        selectedCount: parseInt(selectedCount) || 0,
        offersCount: parseInt(offersCount) || 0,
        highestPackage: highest,
        averagePackage: average,
        internshipDetails,
        joiningStatus,
        interviewStatus,
        offerLetterStatus,
        offers,
        placementHistory: newHistory
      }
    };

    Storage.updateUser(student.email, updates);
    Storage.addActivity({ type: 'update', text: `Admin updated placement record for <strong>${student.fullName}</strong>`, userEmail: student.email });
    onSave();
    onClose();
  };

  return (
    <form className="modal-form" onSubmit={handleSave} noValidate style={{ maxHeight: '80vh', overflowY: 'auto', paddingRight: 8 }}>
      <p style={{ marginBottom: 16 }}>Manage placement file for <strong>{student.fullName}</strong> ({student.studentId})</p>
      
      <div className="form-row">
        <div className="form-group flex-1">
          <label className="form-label">Eligibility</label>
          <select className="form-input form-select" value={eligibility} onChange={e => setEligibility(e.target.value)}>
            <option value="Eligible">Eligible</option>
            <option value="Not Eligible">Not Eligible</option>
          </select>
        </div>
        <div className="form-group flex-1">
          <label className="form-label">Placement Status</label>
          <select className="form-input form-select" value={placementStatus} onChange={e => setPlacementStatus(e.target.value)}>
            <option value="Unplaced">Unplaced</option>
            <option value="In Progress">In Progress</option>
            <option value="Placed">Placed</option>
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group flex-1">
          <label className="form-label">Applied Count</label>
          <input type="number" className="form-input" value={appliedCount} onChange={e => setAppliedCount(e.target.value)} />
        </div>
        <div className="form-group flex-1">
          <label className="form-label">Shortlisted Count</label>
          <input type="number" className="form-input" value={shortlistedCount} onChange={e => setShortlistedCount(e.target.value)} />
        </div>
        <div className="form-group flex-1">
          <label className="form-label">Selected Count</label>
          <input type="number" className="form-input" value={selectedCount} onChange={e => setSelectedCount(e.target.value)} />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group flex-1">
          <label className="form-label">Interview Status</label>
          <select className="form-input form-select" value={interviewStatus} onChange={e => setInterviewStatus(e.target.value)}>
            <option value="None">None</option>
            <option value="Scheduled">Scheduled</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
        <div className="form-group flex-1">
          <label className="form-label">Offer Letter Status</label>
          <select className="form-input form-select" value={offerLetterStatus} onChange={e => setOfferLetterStatus(e.target.value)}>
            <option value="Not Applicable">Not Applicable</option>
            <option value="Pending">Pending</option>
            <option value="Received">Received</option>
          </select>
        </div>
        <div className="form-group flex-1">
          <label className="form-label">Joining Status</label>
          <select className="form-input form-select" value={joiningStatus} onChange={e => setJoiningStatus(e.target.value)}>
            <option value="Not Placed">Not Placed</option>
            <option value="Pending">Pending</option>
            <option value="Joined">Joined</option>
            <option value="Declined">Declined</option>
          </select>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Internship Details</label>
        <textarea className="form-input" style={{ minHeight: 60, padding: 8 }} value={internshipDetails} onChange={e => setInternshipDetails(e.target.value)} placeholder="Enter internship details if any..." />
      </div>

      <hr style={{ margin: '16px 0', borderColor: 'var(--border-color)' }} />
      <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>Hiring / Offers List ({offers.length})</h4>
      
      <div style={{ background: 'var(--border-color)', padding: 12, borderRadius: 8, marginTop: 10, marginBottom: 16 }}>
        <h5 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 8 }}>Add Offer</h5>
        <div className="form-row">
          <div className="form-group flex-1">
            <input type="text" className="form-input" style={{ background: 'var(--card-bg)' }} placeholder="Company" value={newOffer.company} onChange={e => setNewOffer({...newOffer, company: e.target.value})} />
          </div>
          <div className="form-group flex-1">
            <input type="text" className="form-input" style={{ background: 'var(--card-bg)' }} placeholder="Role" value={newOffer.role} onChange={e => setNewOffer({...newOffer, role: e.target.value})} />
          </div>
          <div className="form-group flex-1">
            <input type="number" step="0.1" className="form-input" style={{ background: 'var(--card-bg)' }} placeholder="Package (LPA)" value={newOffer.salary} onChange={e => setNewOffer({...newOffer, salary: e.target.value})} />
          </div>
        </div>
        <div className="form-row" style={{ marginTop: 8 }}>
          <div className="form-group flex-1">
            <select className="form-input form-select" style={{ background: 'var(--card-bg)' }} value={newOffer.joiningStatus} onChange={e => setNewOffer({...newOffer, joiningStatus: e.target.value})}>
              <option value="Joined">Joined</option>
              <option value="Declined">Declined</option>
              <option value="Pending">Pending</option>
            </select>
          </div>
          <button type="button" className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-end', height: 36 }} onClick={handleAddOffer}>Add Offer</button>
        </div>
      </div>

      {offers.length > 0 && (
        <div className="table-responsive" style={{ marginBottom: 16 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Role</th>
                <th>Package</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {offers.map((o, idx) => (
                <tr key={idx}>
                  <td>{o.company}</td>
                  <td>{o.role}</td>
                  <td>{o.salary} LPA</td>
                  <td>
                    <button type="button" className="action-btn delete" onClick={() => handleRemoveOffer(idx)}><i className="fas fa-trash"></i></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="modal-actions">
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary">Save Placement Data</button>
      </div>
    </form>
  );
}

function AddAptitudeQuestionModal({ onSave, onClose, showToast }) {
  const [category, setCategory] = useState('Quantitative Aptitude');
  const [question, setQuestion] = useState('');
  const [opt0, setOpt0] = useState('');
  const [opt1, setOpt1] = useState('');
  const [opt2, setOpt2] = useState('');
  const [opt3, setOpt3] = useState('');
  const [correctOption, setCorrectOption] = useState(0);
  const [explanation, setExplanation] = useState('');

  const handleSave = (e) => {
    e.preventDefault();
    if (!question.trim() || !opt0.trim() || !opt1.trim() || !opt2.trim() || !opt3.trim()) {
      showToast('Error', 'Please fill in all fields.', 'error');
      return;
    }
    const qList = Storage.getAptitudeQuestions();
    const newQ = {
      id: 'apt_' + Date.now(),
      category,
      question: question.trim(),
      options: [opt0.trim(), opt1.trim(), opt2.trim(), opt3.trim()],
      correctOption: parseInt(correctOption),
      explanation: explanation.trim()
    };
    Storage.setAptitudeQuestions([...qList, newQ]);
    showToast('Success', 'Aptitude question added!', 'success');
    onSave();
    onClose();
  };

  return (
    <form className="modal-form" onSubmit={handleSave} noValidate>
      <div className="form-group">
        <label className="form-label">Category</label>
        <select className="form-input form-select" value={category} onChange={e => setCategory(e.target.value)}>
          <option value="Quantitative Aptitude">Quantitative Aptitude</option>
          <option value="Logical Reasoning">Logical Reasoning</option>
          <option value="Verbal Ability">Verbal Ability</option>
          <option value="Data Interpretation">Data Interpretation</option>
          <option value="Puzzle Solving">Puzzle Solving</option>
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Question Text *</label>
        <textarea className="form-input" style={{ minHeight: 60, padding: 8 }} value={question} onChange={e => setQuestion(e.target.value)} />
      </div>
      <div className="form-row">
        <div className="form-group flex-1">
          <label className="form-label">Option A *</label>
          <input className="form-input" value={opt0} onChange={e => setOpt0(e.target.value)} />
        </div>
        <div className="form-group flex-1">
          <label className="form-label">Option B *</label>
          <input className="form-input" value={opt1} onChange={e => setOpt1(e.target.value)} />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group flex-1">
          <label className="form-label">Option C *</label>
          <input className="form-input" value={opt2} onChange={e => setOpt2(e.target.value)} />
        </div>
        <div className="form-group flex-1">
          <label className="form-label">Option D *</label>
          <input className="form-input" value={opt3} onChange={e => setOpt3(e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Correct Option</label>
        <select className="form-input form-select" value={correctOption} onChange={e => setCorrectOption(e.target.value)}>
          <option value={0}>Option A</option>
          <option value={1}>Option B</option>
          <option value={2}>Option C</option>
          <option value={3}>Option D</option>
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Explanation</label>
        <textarea className="form-input" style={{ minHeight: 60, padding: 8 }} value={explanation} onChange={e => setExplanation(e.target.value)} />
      </div>
      <div className="modal-actions">
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary">Save Question</button>
      </div>
    </form>
  );
}

function AddCodingQuestionModal({ onSave, onClose, showToast }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState('Basic');
  const [category, setCategory] = useState('Basic problems');
  const [language, setLanguage] = useState('Python');
  const [constraints, setConstraints] = useState('');
  const [inputFormat, setInputFormat] = useState('');
  const [outputFormat, setOutputFormat] = useState('');
  const [sampleInput, setSampleInput] = useState('');
  const [sampleOutput, setSampleOutput] = useState('');
  const [template, setTemplate] = useState('');

  const handleSave = (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      showToast('Error', 'Please fill in title and description.', 'error');
      return;
    }
    const cList = Storage.getCodingQuestions();
    const newC = {
      id: 'code_' + Date.now(),
      title: title.trim(),
      description: description.trim(),
      difficulty,
      category,
      language,
      constraints: constraints.trim() || 'None',
      inputFormat: inputFormat.trim() || 'Standard Input',
      outputFormat: outputFormat.trim() || 'Standard Output',
      sampleInput: sampleInput.trim(),
      sampleOutput: sampleOutput.trim(),
      template: template.trim()
    };
    Storage.setCodingQuestions([...cList, newC]);
    showToast('Success', 'Coding problem added!', 'success');
    onSave();
    onClose();
  };

  return (
    <form className="modal-form" onSubmit={handleSave} noValidate style={{ maxHeight: '80vh', overflowY: 'auto', paddingRight: 8 }}>
      <div className="form-row">
        <div className="form-group flex-1">
          <label className="form-label">Title *</label>
          <input className="form-input" value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div className="form-group flex-1">
          <label className="form-label">Language</label>
          <select className="form-input form-select" value={language} onChange={e => setLanguage(e.target.value)}>
            <option value="Python">Python</option>
            <option value="C++">C++</option>
            <option value="Java">Java</option>
            <option value="JavaScript">JavaScript</option>
            <option value="C Programming">C Programming</option>
            <option value="SQL">SQL</option>
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group flex-1">
          <label className="form-label">Difficulty</label>
          <select className="form-input form-select" value={difficulty} onChange={e => setDifficulty(e.target.value)}>
            <option value="Basic">Basic</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
          </select>
        </div>
        <div className="form-group flex-1">
          <label className="form-label">Category</label>
          <select className="form-input form-select" value={category} onChange={e => setCategory(e.target.value)}>
            <option value="Basic problems">Basic problems</option>
            <option value="Intermediate problems">Intermediate problems</option>
            <option value="Company-specific coding questions">Company-specific coding questions</option>
            <option value="Previous placement coding questions">Previous placement coding questions</option>
          </select>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Problem Statement *</label>
        <textarea className="form-input" style={{ minHeight: 60, padding: 8 }} value={description} onChange={e => setDescription(e.target.value)} />
      </div>
      <div className="form-row">
        <div className="form-group flex-1">
          <label className="form-label">Constraints</label>
          <input className="form-input" value={constraints} onChange={e => setConstraints(e.target.value)} />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group flex-1">
          <label className="form-label">Input Format</label>
          <input className="form-input" value={inputFormat} onChange={e => setInputFormat(e.target.value)} />
        </div>
        <div className="form-group flex-1">
          <label className="form-label">Output Format</label>
          <input className="form-input" value={outputFormat} onChange={e => setOutputFormat(e.target.value)} />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group flex-1">
          <label className="form-label">Sample Input</label>
          <textarea className="form-input" style={{ minHeight: 50, padding: 8 }} value={sampleInput} onChange={e => setSampleInput(e.target.value)} />
        </div>
        <div className="form-group flex-1">
          <label className="form-label">Sample Output</label>
          <textarea className="form-input" style={{ minHeight: 50, padding: 8 }} value={sampleOutput} onChange={e => setSampleOutput(e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Initial Code Template</label>
        <textarea className="form-input" style={{ minHeight: 80, padding: 8, fontFamily: 'monospace' }} value={template} onChange={e => setTemplate(e.target.value)} />
      </div>
      <div className="modal-actions">
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary">Save Coding Problem</button>
      </div>
    </form>
  );
}

function EditCompanyPrepModal({ companyKey, onSave, onClose, showToast }) {
  const preps = Storage.getCompanyPrep();
  const data = preps[companyKey] || {};
  const [eligibility, setEligibility] = useState(data.eligibility || '');
  const [rounds, setRounds] = useState(data.rounds || '');
  const [pattern, setPattern] = useState(data.pattern || '');
  const [techTopics, setTechTopics] = useState(data.techTopics || '');
  const [hrQuestions, setHrQuestions] = useState(data.hrQuestions || '');
  const [interviewTips, setInterviewTips] = useState(data.interviewTips || '');
  const [guidelines, setGuidelines] = useState(data.guidelines || '');

  const handleSave = (e) => {
    e.preventDefault();
    preps[companyKey] = { eligibility, rounds, pattern, techTopics, hrQuestions, interviewTips, guidelines };
    Storage.setCompanyPrep(preps);
    showToast('Success', `Updated guidelines for ${companyKey}!`, 'success');
    onSave();
    onClose();
  };

  return (
    <form className="modal-form" onSubmit={handleSave} noValidate style={{ maxHeight: '80vh', overflowY: 'auto', paddingRight: 8 }}>
      <p style={{ marginBottom: 16 }}>Edit recruitment syllabus for <strong>{companyKey}</strong></p>
      <div className="form-group">
        <label className="form-label">Eligibility Cutoff</label>
        <input className="form-input" value={eligibility} onChange={e => setEligibility(e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">Rounds</label>
        <textarea className="form-input" style={{ minHeight: 50, padding: 8 }} value={rounds} onChange={e => setRounds(e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">Online Test Pattern</label>
        <textarea className="form-input" style={{ minHeight: 50, padding: 8 }} value={pattern} onChange={e => setPattern(e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">Technical Topics</label>
        <textarea className="form-input" style={{ minHeight: 50, padding: 8 }} value={techTopics} onChange={e => setTechTopics(e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">Common HR Questions</label>
        <textarea className="form-input" style={{ minHeight: 50, padding: 8 }} value={hrQuestions} onChange={e => setHrQuestions(e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">Interview Tips</label>
        <textarea className="form-input" style={{ minHeight: 50, padding: 8 }} value={interviewTips} onChange={e => setInterviewTips(e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">Guidelines</label>
        <textarea className="form-input" style={{ minHeight: 50, padding: 8 }} value={guidelines} onChange={e => setGuidelines(e.target.value)} />
      </div>
      <div className="modal-actions">
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary">Save Guidelines</button>
      </div>
    </form>
  );
}

function BranchAdminFormModal({ admin, onSave, onClose, showToast }) {
  const isEdit = !!admin;
  const [form, setForm] = useState({
    fullName: admin?.fullName || '',
    email: admin?.email || '',
    password: '',
    representedClass: admin?.representedClass || '',
  });
  const [errors, setErrors] = useState({});

  const sf = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.fullName.trim()) e.fullName = 'Name is required.';
    if (!isValidEmail(form.email)) e.email = 'Valid email is required.';
    else if (Storage.emailExists(form.email, isEdit ? admin.email : null)) e.email = 'Email already registered.';
    if (!form.representedClass) e.representedClass = 'Select a represented class.';
    if (!isEdit && !isStrongPassword(form.password)) e.password = 'Min 8 chars with uppercase, lowercase, number.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    if (isEdit) {
      const updates = { fullName: form.fullName, representedClass: form.representedClass };
      Storage.updateUser(admin.email, updates);
      Storage.addActivity({ type: 'update', text: `Main Admin updated class advisor <strong>${form.fullName}</strong> (${form.representedClass})` });
      showToast('Updated', 'Class advisor record updated.', 'success');
    } else {
      const newAdmin = {
        role: 'admin',
        email: form.email.toLowerCase(),
        passwordHash: hashPassword(form.password),
        fullName: form.fullName,
        representedClass: form.representedClass,
        isMainAdmin: false,
        createdAt: new Date().toISOString(),
      };
      Storage.saveUser(newAdmin);
      Storage.addActivity({ type: 'create', text: `Main Admin added class advisor <strong>${form.fullName}</strong> for ${form.representedClass}` });
      showToast('Created', 'Class advisor account created successfully.', 'success');
    }
    onSave();
    onClose();
  };

  return (
    <form className="modal-form" onSubmit={handleSubmit} noValidate>
      <div className="form-group">
        <label className="form-label">Full Name *</label>
        <div className="input-wrapper"><i className="fas fa-user input-icon"></i><input className="form-input" value={form.fullName} onChange={sf('fullName')} placeholder="e.g. Prof. Jane Doe" /></div>
        {errors.fullName && <span className="field-error">{errors.fullName}</span>}
      </div>
      <div className="form-group">
        <label className="form-label">Email Address *</label>
        <div className="input-wrapper"><i className="fas fa-envelope input-icon"></i><input type="email" className="form-input" value={form.email} onChange={sf('email')} readOnly={isEdit} placeholder="e.g. jane.doe@srms.edu" /></div>
        {errors.email && <span className="field-error">{errors.email}</span>}
      </div>
      {!isEdit && (
        <div className="form-group">
          <label className="form-label">Password *</label>
          <div className="input-wrapper"><i className="fas fa-lock input-icon"></i><input type="password" className="form-input" value={form.password} onChange={sf('password')} placeholder="Min 8 chars" /></div>
          {errors.password && <span className="field-error">{errors.password}</span>}
        </div>
      )}
      <div className="form-group">
        <label className="form-label">Represented Class *</label>
        <div className="input-wrapper"><i className="fas fa-university input-icon"></i>
          <select className="form-input form-select" value={form.representedClass} onChange={sf('representedClass')}>
            <option value="">Select Course/Class</option>
            {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {errors.representedClass && <span className="field-error">{errors.representedClass}</span>}
      </div>
      <div className="modal-actions">
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary">{isEdit ? 'Save Changes' : 'Create Advisor'}</button>
      </div>
    </form>
  );
}

function ResetAdminPasswordModal({ admin, onClose, showToast }) {
  const [np, setNp] = useState(''); const [cp, setCp] = useState('');
  const [err, setErr] = useState({});
  const handle = (e) => {
    e.preventDefault();
    const errs = {};
    if (!isStrongPassword(np)) errs.np = 'Min 8 chars with uppercase, lowercase, number.';
    if (np !== cp) errs.cp = 'Passwords do not match.';
    if (Object.keys(errs).length) { setErr(errs); return; }
    Storage.updateUser(admin.email, { passwordHash: hashPassword(np) });
    Storage.addActivity({ type: 'reset', text: `Password reset for class advisor <strong>${admin.fullName}</strong>` });
    showToast('Password Reset', `Password updated for ${admin.fullName}`, 'success');
    onClose();
  };
  return (
    <form className="modal-form" onSubmit={handle} noValidate>
      <p style={{ marginBottom: 16 }}>Reset password for class advisor <strong>{admin.fullName}</strong></p>
      <div className="form-group">
        <label className="form-label">New Password</label>
        <div className="input-wrapper"><i className="fas fa-lock input-icon"></i><input type="password" className="form-input" value={np} onChange={e => setNp(e.target.value)} /></div>
        {err.np && <span className="field-error">{err.np}</span>}
      </div>
      <div className="form-group">
        <label className="form-label">Confirm Password</label>
        <div className="input-wrapper"><i className="fas fa-lock input-icon"></i><input type="password" className="form-input" value={cp} onChange={e => setCp(e.target.value)} /></div>
        {err.cp && <span className="field-error">{err.cp}</span>}
      </div>
      <div className="modal-actions">
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary">Reset Password</button>
      </div>
    </form>
  );
}

export default function AdminDashboard({ activeView, onNavigate }) {
  const { currentUser, showToast, showConfirm, showModal, closeModal, applyTheme, theme, refreshUser } = useAuth();
  const [students, setStudents] = useState([]);
  const [activity, setActivity] = useState([]);
  const [branchAdmins, setBranchAdmins] = useState([]);
  const [search, setSearch] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortCol, setSortCol] = useState('fullName');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState(new Set());
  const csvRef = useRef(); const restoreRef = useRef();

  // Placement Cell States
  const [plPage, setPlPage] = useState(1);
  const [plSearch, setPlSearch] = useState('');
  const [plFilterStatus, setPlFilterStatus] = useState('');
  const [plFilterElig, setPlFilterElig] = useState('');

  // Manage Training States
  const [trTab, setTrTab] = useState('aptitude');

  const handleImportAptitude = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target.result;
        const XLSX = await import('xlsx');
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet);
        
        const parsedQuestions = json.map((row, idx) => {
          const getVal = (keys) => {
            const key = Object.keys(row).find(k => keys.includes(k.toLowerCase().trim()));
            return key ? String(row[key]).trim() : '';
          };
          
          const category = getVal(['category']) || 'Quantitative Aptitude';
          const questionText = getVal(['question', 'question text', 'questiontext']);
          const optA = getVal(['optiona', 'option a', 'a']);
          const optB = getVal(['optionb', 'option b', 'b']);
          const optC = getVal(['optionc', 'option c', 'c']);
          const optD = getVal(['optiond', 'option d', 'd']);
          const correctVal = getVal(['correctoption', 'correct option', 'correct', 'answer']);
          const explanation = getVal(['explanation']);
          
          if (!questionText || !optA || !optB) {
            throw new Error(`Row ${idx + 2} has missing question text or options.`);
          }
          
          let correctOption = 0;
          if (/^[a-d]$/i.test(correctVal)) {
            correctOption = correctVal.toUpperCase().charCodeAt(0) - 65;
          } else {
            const parsedNum = parseInt(correctVal);
            if (!isNaN(parsedNum) && parsedNum >= 0 && parsedNum <= 3) {
              correctOption = parsedNum;
            }
          }
          
          return {
            id: 'apt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            category,
            question: questionText,
            options: [optA, optB, optC || '', optD || ''],
            correctOption,
            explanation
          };
        });
        
        if (!parsedQuestions.length) {
          showToast('Error', 'No valid questions found in sheet.', 'error');
          return;
        }
        
        const existing = Storage.getAptitudeQuestions();
        Storage.setAptitudeQuestions([...existing, ...parsedQuestions]);
        showToast('Success', `Imported ${parsedQuestions.length} aptitude questions!`, 'success');
        load();
      } catch (err) {
        console.error(err);
        showToast('Import Failed', err.message || 'Could not parse Excel file.', 'error');
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImportCoding = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target.result;
        const XLSX = await import('xlsx');
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet);
        
        const parsedCoding = json.map((row, idx) => {
          const getVal = (keys) => {
            const key = Object.keys(row).find(k => keys.includes(k.toLowerCase().trim()));
            return key ? String(row[key]).trim() : '';
          };
          
          const title = getVal(['title']);
          const description = getVal(['description', 'desc', 'problem description']);
          const difficulty = getVal(['difficulty', 'level']) || 'Basic';
          const category = getVal(['category']) || 'Basic problems';
          const language = getVal(['language', 'lang']) || 'Python';
          const constraints = getVal(['constraints']);
          const inputFormat = getVal(['inputformat', 'input format']);
          const outputFormat = getVal(['outputformat', 'output format']);
          const sampleInput = getVal(['sampleinput', 'sample input']);
          const sampleOutput = getVal(['sampleoutput', 'sample output']);
          const template = getVal(['template', 'code template']);
          
          if (!title || !description) {
            throw new Error(`Row ${idx + 2} has missing title or description.`);
          }
          
          return {
            id: 'code_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            title,
            description,
            difficulty,
            category,
            language,
            constraints,
            inputFormat,
            outputFormat,
            sampleInput,
            sampleOutput,
            template
          };
        });
        
        if (!parsedCoding.length) {
          showToast('Error', 'No valid coding problems found in sheet.', 'error');
          return;
        }
        
        const existing = Storage.getCodingQuestions();
        Storage.setCodingQuestions([...existing, ...parsedCoding]);
        showToast('Success', `Imported ${parsedCoding.length} coding challenges!`, 'success');
        load();
      } catch (err) {
        console.error(err);
        showToast('Import Failed', err.message || 'Could not parse Excel file.', 'error');
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const load = useCallback(() => {
    let allSt = Storage.getAllStudents();
    if (currentUser && !currentUser.isMainAdmin) {
      allSt = allSt.filter(s => s.course === currentUser.representedClass);
    }
    setStudents(allSt);

    let allAct = Storage.getActivity();
    if (currentUser && !currentUser.isMainAdmin) {
      allAct = allAct.filter(act => {
        if (!act.userEmail) return true;
        const u = Storage.getUser(act.userEmail);
        return !u || (u.role === 'student' && u.course === currentUser.representedClass);
      });
    }
    setActivity(allAct);
    setBranchAdmins(Storage.getAllBranchAdmins());
  }, [currentUser]);

  useEffect(() => { load(); }, [load, activeView]);

  // Expose setSearch for global header
  useEffect(() => { window._adminSetSearch = setSearch; return () => { delete window._adminSetSearch; }; }, []);

  // Stats
  const eligibleStudents = students.filter(s => s.placement?.eligibility === 'Eligible');
  const placedStudents = eligibleStudents.filter(s => s.placement?.status === 'Placed');
  const inProgressStudents = eligibleStudents.filter(s => s.placement?.status === 'In Progress');
  const trainingStudents = students.filter(s => (s.trainingProgress?.aptitudeSolved || 0) > 0 || (s.trainingProgress?.codingSolved || 0) > 0).length;

  const placementRate = eligibleStudents.length ? Math.round((placedStudents.length / eligibleStudents.length) * 100) : 0;

  // Packages calculations
  const allPlacedOffers = eligibleStudents.flatMap(s => s.placement?.offers || []).filter(o => o.status === 'Selected');
  const packages = allPlacedOffers.map(o => o.salary || 0).filter(val => val > 0);
  const highestPackage = packages.length ? Math.max(...packages) : 0;
  const averagePackage = packages.length ? parseFloat((packages.reduce((sum, v) => sum + v, 0) / packages.length).toFixed(2)) : 0;

  // Company hiring counts
  const companyCounts = {};
  allPlacedOffers.forEach(o => {
    if (o.company) {
      companyCounts[o.company] = (companyCounts[o.company] || 0) + 1;
    }
  });

  const stats = {
    total: students.length,
    active: students.filter(s => s.status === 'Active').length,
    graduated: students.filter(s => s.status === 'Graduated').length,
    suspended: students.filter(s => s.status === 'Suspended').length,
    withdrawn: students.filter(s => s.status === 'Withdrawn').length,
    placed: placedStudents.length,
    inProgress: inProgressStudents.length,
    training: trainingStudents,
    rate: placementRate,
    highestPackage,
    averagePackage,
    companyCounts
  };

  // Filter & Sort
  const filtered = students.filter(s => {
    if (search) {
      const q = search.toLowerCase();
      if (![(s.fullName||''),(s.email||''),(s.studentId||''),(s.course||'')].some(f => f.toLowerCase().includes(q))) return false;
    }
    if (filterCourse && s.course !== filterCourse) return false;
    if (filterYear && s.yearLevel !== filterYear) return false;
    if (filterStatus && s.status !== filterStatus) return false;
    return true;
  }).sort((a, b) => {
    const va = (a[sortCol] || '').toString().toLowerCase();
    const vb = (b[sortCol] || '').toString().toLowerCase();
    return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageData = filtered.slice((page - 1) * pageSize, page * pageSize);
  const allCourses = [...new Set(students.map(s => s.course).filter(Boolean))].sort();

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
    setPage(1);
  };

  const openAddModal = () => showModal({ title: 'Add New Student', maxWidth: '620px', content: <StudentFormModal onSave={load} onClose={closeModal} /> });
  const openEditModal = (email) => {
    const s = Storage.getUser(email);
    if (!s) return;
    if (currentUser && !currentUser.isMainAdmin && s.course !== currentUser.representedClass) {
      showToast('Unauthorized', 'You do not have permission to edit this student.', 'error');
      return;
    }
    showModal({ title: 'Edit Student', maxWidth: '620px', content: <StudentFormModal student={s} onSave={load} onClose={closeModal} /> });
  };
  const openViewModal = (email) => {
    const s = Storage.getUser(email);
    if (!s) return;
    if (currentUser && !currentUser.isMainAdmin && s.course !== currentUser.representedClass) {
      showToast('Unauthorized', 'You do not have permission to view this student.', 'error');
      return;
    }
    showModal({
      title: 'Student Profile', maxWidth: '540px',
      content: (
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, paddingBottom: 12 }}>
            <div style={{ width: 90, height: 90, borderRadius: '50%', background: s.profilePhoto ? 'none' : nameToColor(s.fullName), display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: s.profilePhoto ? 0 : '2rem', fontWeight: 700, overflow: 'hidden', border: '3px solid var(--border-color)' }}>
              {s.profilePhoto ? <img src={s.profilePhoto} alt={s.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : getInitials(s.fullName)}
            </div>
            <div style={{ textAlign: 'center' }}><h3 style={{ marginBottom: 4 }}>{s.fullName}</h3><p className="text-muted">{s.studentId}</p>{s.registerNumber && <p className="text-muted" style={{ fontSize: '0.8rem' }}>Reg: {s.registerNumber}</p>}<span className={`badge badge-${statusBadgeClass(s.status)}`}>{s.status}</span></div>
          </div>
          <div className="info-grid" style={{ paddingTop: 16, borderTop: '1px solid var(--border-color)' }}>
            <div className="info-item"><span className="info-label">Register No.</span><span className="info-value">{s.registerNumber || '—'}</span></div>
            <div className="info-item"><span className="info-label">Email</span><span className="info-value">{s.email}</span></div>
            <div className="info-item"><span className="info-label">Phone</span><span className="info-value">{s.phone || '—'}</span></div>
            <div className="info-item"><span className="info-label">Date of Birth</span><span className="info-value">{formatDate(s.dob)}</span></div>
            <div className="info-item"><span className="info-label">Address</span><span className="info-value">{s.address || '—'}</span></div>
            <div className="info-item"><span className="info-label">Course</span><span className="info-value">{s.course || '—'}</span></div>
            <div className="info-item"><span className="info-label">Year Level</span><span className="info-value">{yearDisplay(s.yearLevel)}</span></div>
            <div className="info-item"><span className="info-label">Enrollment</span><span className="info-value">{formatDate(s.enrollmentDate)}</span></div>
          </div>
          <div style={{ marginTop: 20, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-outline btn-sm" onClick={() => window.print()}><i className="fas fa-print"></i> Print</button>
            <button className="btn btn-primary btn-sm" onClick={() => { closeModal(); openEditModal(s.email); }}><i className="fas fa-edit"></i> Edit</button>
          </div>
        </div>
      )
    });
  };

  const confirmDelete = (email) => {
    const s = Storage.getUser(email);
    if (!s) return;
    if (currentUser && !currentUser.isMainAdmin && s.course !== currentUser.representedClass) {
      showToast('Unauthorized', 'You do not have permission to delete this student.', 'error');
      return;
    }
    showConfirm({ title: 'Delete Student', message: `Delete <strong>${s.fullName}</strong>? This cannot be undone.`, confirmText: 'Delete', type: 'danger', onConfirm: () => { Storage.deleteUser(email); Storage.addActivity({ type: 'delete', text: `Admin deleted <strong>${s.fullName}</strong>`, userEmail: email }); showToast('Deleted', `${s.fullName} removed.`, 'success'); setSelected(p => { p.delete(email); return new Set(p); }); load(); } });
  };

  const bulkDelete = () => {
    if (!selected.size) return;
    showConfirm({ title: 'Bulk Delete', message: `Delete <strong>${selected.size}</strong> student${selected.size > 1 ? 's' : ''}?`, confirmText: `Delete ${selected.size}`, type: 'danger', onConfirm: () => { selected.forEach(email => { const s = Storage.getUser(email); if (currentUser && !currentUser.isMainAdmin && s && s.course !== currentUser.representedClass) return; Storage.deleteUser(email); Storage.addActivity({ type: 'delete', text: `Admin deleted <strong>${s?.fullName || email}</strong>`, userEmail: email }); }); showToast('Deleted', `${selected.size} students removed.`, 'success'); setSelected(new Set()); load(); } });
  };

  // CSV/Backup
  const handleExport = () => { if (!students.length) { showToast('No Records', 'Nothing to export.', 'warning'); return; } downloadFile(studentsToCSV(students), `srms_students_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv'); showToast('Exported', `${students.length} records exported.`, 'success'); };
  const handleImport = async (file) => {
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      const rows = csvToStudents(text);
      let added = 0, updated = 0, duplicates = 0;
      const defaultHash = hashPassword('Student@123');
      rows.forEach(s => {
        if (!s.email) return;
        if (currentUser && !currentUser.isMainAdmin) {
          s.course = currentUser.representedClass;
        }
        if (s.registerNumber && Storage.registerNumberExists(s.registerNumber, s.email)) {
          duplicates++;
          return;
        }
        const ex = Storage.getUser(s.email);
        if (currentUser && !currentUser.isMainAdmin && ex && ex.course !== currentUser.representedClass) {
          duplicates++;
          return;
        }
        let sid = s.studentId;
        if (!sid || Storage.studentIdExists(sid, s.email)) sid = generateStudentId();
        if (ex) {
          Storage.updateUser(s.email, { ...s, studentId: sid });
          updated++;
        } else {
          Storage.saveUser({ ...s, studentId: sid, role: 'student', passwordHash: defaultHash, profilePhoto: null, activityLog: [{ type: 'create', text: 'Imported from CSV', timestamp: new Date().toISOString() }], createdAt: new Date().toISOString() });
          added++;
        }
      });
      Storage.addActivity({ type: 'import', text: `CSV import: added <strong>${added}</strong>, updated <strong>${updated}</strong>${duplicates ? `, skipped <strong>${duplicates}</strong> duplicates` : ''}` });
      if (duplicates > 0) {
        showToast('Import Warning', `Added ${added}, updated ${updated}. Skipped ${duplicates} duplicate register numbers.`, 'warning');
      } else {
        showToast('Import Complete', `Added ${added}, updated ${updated}.`, 'success');
      }
      load();
    } catch (e) {
      showToast('Import Failed', e.message, 'error');
    } finally {
      csvRef.current.value = '';
    }
  };
  const handleBackup = () => { downloadFile(Storage.exportBackup(), `srms_backup_${new Date().toISOString().split('T')[0]}.json`, 'application/json'); showToast('Backup Created', 'JSON backup downloaded.', 'success'); };
  const handleRestore = async (file) => { if (!file) return; try { const text = await readFileAsText(file); Storage.importBackup(text); showToast('Restored', 'Data restored successfully.', 'success'); setTimeout(() => window.location.reload(), 1000); } catch (e) { showToast('Restore Failed', e.message, 'error'); } finally { restoreRef.current.value = ''; } };
  const handleClearData = () => showConfirm({ title: 'Clear All Data', message: 'Clear all student records? Admin account preserved.', confirmText: 'Clear All', type: 'danger', onConfirm: () => { Storage.clearAllData(); showToast('Cleared', 'All data removed.', 'success'); setTimeout(() => window.location.reload(), 1200); } });

  // Admin password change is handled by AdminSettings component below

  // ── RENDER ─────────────────────────────────────────────────
  const SortIcon = ({ col }) => <i className={`fas ${sortCol === col ? (sortDir === 'asc' ? 'fa-sort-up' : 'fa-sort-down') : 'fa-sort'} sort-icon${sortCol === col ? (' ' + sortDir) : ''}`}></i>;

  return (
    <div className="view-container">
      {/* Hidden file inputs */}
      <input ref={csvRef} type="file" accept=".csv" className="hidden-input" onChange={e => handleImport(e.target.files[0])} />
      <input ref={restoreRef} type="file" accept=".json" className="hidden-input" onChange={e => handleRestore(e.target.files[0])} />

      {/* ── MANAGE CLASS ADVISORS ── */}
      {activeView === 'admin-admins' && (
        <section id="view-admin-admins" className="view">
          <div className="page-header">
            <div>
              <h1 className="page-title">Class Advisor Management</h1>
              <p className="page-subtitle">Create and manage accounts for class advisors representing each department section</p>
            </div>
            <div className="page-actions">
              <button className="btn btn-ghost btn-sm" onClick={load}><i className="fas fa-sync-alt"></i> Refresh</button>
              <button className="btn btn-primary btn-sm" onClick={() => showModal({
                title: 'Create Class Advisor Account',
                content: <BranchAdminFormModal onSave={load} onClose={closeModal} showToast={showToast} />
              })}><i className="fas fa-plus"></i> Add Class Advisor</button>
            </div>
          </div>

          {/* ── CREDENTIALS QUICK-REFERENCE CARD ── */}
          <div className="card" style={{ marginBottom: 24, padding: 24, background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <i className="fas fa-id-card" style={{ fontSize: '1.1rem', color: 'var(--brand-primary)' }}></i>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Class Advisor Login Credentials</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
              {branchAdmins.map(adv => (
                <div key={adv.email} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: 'var(--hover-bg)', borderRadius: 10, padding: '10px 14px',
                  border: '1px solid var(--border)'
                }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                    background: nameToColor(adv.fullName),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 700, fontSize: '0.78rem'
                  }}>{getInitials(adv.fullName)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{adv.fullName}</p>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--brand-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{adv.email}</p>
                    <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{adv.representedClass}</p>
                  </div>
                  <button
                    title="Copy email"
                    onClick={() => { navigator.clipboard.writeText(adv.email); showToast('Copied', adv.email, 'success'); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, fontSize: '0.85rem' }}
                  ><i className="fas fa-copy"></i></button>
                </div>
              ))}
            </div>
          </div>

          <div className="card table-card">
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Full Name</th>
                    <th>Email Address</th>
                    <th>Represented Class</th>
                    <th>Created Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {branchAdmins.length === 0 ? (
                    <tr>
                      <td colSpan={5}>
                        <div className="empty-state">
                          <div className="empty-icon"><i className="fas fa-users-cog"></i></div>
                          <h3>No class advisors found</h3>
                          <p>Add advisor accounts to delegate student management to class representatives.</p>
                          <button className="btn btn-primary" onClick={() => showModal({
                            title: 'Create Class Advisor Account',
                            content: <BranchAdminFormModal onSave={load} onClose={closeModal} showToast={showToast} />
                          })}><i className="fas fa-plus"></i> Add Class Advisor</button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    branchAdmins.map(admin => (
                      <tr key={admin.email}>
                        <td>
                          <div className="student-name-cell">
                            <div className="student-avatar-sm" style={{ background: nameToColor(admin.fullName), display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.75rem' }}>{getInitials(admin.fullName)}</div>
                            <span>{admin.fullName}</span>
                          </div>
                        </td>
                        <td>{admin.email}</td>
                        <td><span style={{ fontWeight: 600, color: 'var(--brand-primary)' }}>{admin.representedClass}</span></td>
                        <td>{formatDate(admin.createdAt)}</td>
                        <td>
                          <div className="table-actions">
                            <button className="action-btn edit" title="Edit" onClick={() => showModal({
                              title: 'Edit Class Advisor',
                              content: <BranchAdminFormModal admin={admin} onSave={load} onClose={closeModal} showToast={showToast} />
                            })}><i className="fas fa-edit"></i></button>
                            <button className="action-btn reset" title="Reset Password" onClick={() => showModal({
                              title: 'Reset Password',
                              content: <ResetAdminPasswordModal admin={admin} onClose={closeModal} showToast={showToast} />
                            })}><i className="fas fa-key"></i></button>
                            <button className="action-btn delete" title="Delete" onClick={() => {
                              showConfirm({
                                title: 'Delete Class Advisor',
                                message: `Delete class advisor account for <strong>${admin.fullName}</strong>? This will revoke their access completely.`,
                                confirmText: 'Delete',
                                type: 'danger',
                                onConfirm: () => {
                                  Storage.deleteUser(admin.email);
                                  Storage.addActivity({ type: 'delete', text: `Main Admin deleted class advisor account for <strong>${admin.fullName}</strong>` });
                                  showToast('Deleted', 'Class advisor removed.', 'success');
                                  load();
                                }
                              });
                            }}><i className="fas fa-trash"></i></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ── ADMIN DASHBOARD ── */}
      {activeView === 'admin-dashboard' && (
        <section id="view-admin-dashboard" className="view">
          <div className="page-header">
            <div><h1 className="page-title">Admin Dashboard</h1><p className="page-subtitle">Overview of all student registration &amp; placement records</p></div>
            <div className="page-actions">
              <button className="btn btn-ghost btn-sm" onClick={load}><i className="fas fa-sync-alt"></i> Refresh</button>
              <button className="btn btn-primary btn-sm" onClick={openAddModal}><i className="fas fa-plus"></i> Add Student</button>
            </div>
          </div>
          {/* Academic Stats */}
          <div className="stats-grid">
            {[{ key: 'total', label: 'Total Students', icon: 'fa-users', cls: 'total', status: 'all' },
              { key: 'active', label: 'Active', icon: 'fa-user-check', cls: 'active', status: 'Active' },
              { key: 'graduated', label: 'Graduated', icon: 'fa-user-graduate', cls: 'graduated', status: 'Graduated' },
              { key: 'suspended', label: 'Suspended', icon: 'fa-user-slash', cls: 'suspended', status: 'Suspended' },
              { key: 'withdrawn', label: 'Withdrawn', icon: 'fa-user-minus', cls: 'withdrawn', status: 'Withdrawn' },
            ].map(({ key, label, icon, cls, status }) => (
              <div key={key} className="stat-card" style={{ cursor: 'pointer' }} onClick={() => { if (status !== 'all') setFilterStatus(status); else setFilterStatus(''); setPage(1); onNavigate('admin-students'); }}>
                <div className={`stat-icon ${cls}`}><i className={`fas ${icon}`}></i></div>
                <div className="stat-info"><span className="stat-number">{stats[key]}</span><span className="stat-label">{label}</span></div>
              </div>
            ))}
          </div>

          {/* Placement Stats */}
          <div style={{ marginTop: 24, marginBottom: 12 }}><h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Placement &amp; Training Overview</h3></div>
          <div className="stats-grid">
            {[{ key: 'placed', label: 'Placed Students', icon: 'fa-user-tie', cls: 'active', status: 'Placed' },
              { key: 'inProgress', label: 'In Progress', icon: 'fa-spinner', cls: 'total', status: 'In Progress' },
              { key: 'training', label: 'Students Under Training', icon: 'fa-laptop-code', cls: 'graduated', status: 'all' },
              { key: 'rate', label: 'Placement Rate', icon: 'fa-percentage', cls: 'total', status: 'all', customVal: `${stats.rate}%` },
              { key: 'highestPackage', label: 'Highest Package Offered', icon: 'fa-trophy', cls: 'suspended', status: 'all', customVal: `${stats.highestPackage} LPA` },
              { key: 'averagePackage', label: 'Average Package Offered', icon: 'fa-calculator', cls: 'withdrawn', status: 'all', customVal: `${stats.averagePackage} LPA` },
            ].map(({ key, label, icon, cls, status, customVal }) => (
              <div key={key} className="stat-card" style={{ cursor: 'pointer' }} onClick={() => { if (key === 'placed' || key === 'inProgress') { setPlFilterStatus(status); onNavigate('admin-placement'); } else if (key === 'training') { onNavigate('admin-training'); } }}>
                <div className={`stat-icon ${cls}`}><i className={`fas ${icon}`}></i></div>
                <div className="stat-info"><span className="stat-number">{customVal !== undefined ? customVal : stats[key]}</span><span className="stat-label">{label}</span></div>
              </div>
            ))}
          </div>

          {/* Companywise Placed Students list */}
          <div style={{ marginTop: 24, marginBottom: 12 }}><h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Hiring Partner Selections</h3></div>
          <div className="company-grid" style={{ marginBottom: 24 }}>
            {Object.keys(stats.companyCounts).length === 0 ? (
              <div className="card" style={{ gridColumn: 'span 3', padding: 20, textAlign: 'center' }}><p className="text-muted">No student selections recorded yet.</p></div>
            ) : (
              Object.keys(stats.companyCounts).map(comp => (
                <div key={comp} className="stat-card-student" style={{ background: 'var(--card-bg)' }}>
                  <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.08)', color: 'var(--brand-primary)' }}><i className="fas fa-building"></i></div>
                  <div className="stat-info"><span className="stat-label">{comp} Recruitment</span><span className="stat-value">{stats.companyCounts[comp]} Placed</span></div>
                </div>
              ))
            )}
          </div>

          {/* Activity + Quick Actions */}
          <div className="dashboard-grid-2">
            <div className="card">
              <div className="card-header"><h3 className="card-title"><i className="fas fa-history"></i> Recent Activity</h3><button className="btn btn-ghost btn-xs" onClick={() => onNavigate('admin-activity')}>View All</button></div>
              <div className="card-body">{activity.length === 0 ? <div className="empty-state-sm"><i className="fas fa-inbox"></i><p>No activity yet</p></div> : activity.slice(0, 5).map(a => <ActivityItem key={a.id} act={a} />)}</div>
            </div>
            <div className="card">
              <div className="card-header"><h3 className="card-title"><i className="fas fa-bolt"></i> Quick Actions</h3></div>
              <div className="card-body">
                <div className="quick-actions-grid">
                  {[{ id: 'qa-add', icon: 'fa-user-plus', cls: 'add', label: 'Add Student', fn: openAddModal },
                    { id: 'qa-placement', icon: 'fa-briefcase', cls: 'add', label: 'Placement Cell', fn: () => onNavigate('admin-placement') },
                    { id: 'qa-training', icon: 'fa-laptop-code', cls: 'print', label: 'Training Materials', fn: () => onNavigate('admin-training') },
                    { id: 'qa-import', icon: 'fa-file-import', cls: 'import', label: 'Import CSV', fn: () => csvRef.current?.click() },
                    { id: 'qa-export', icon: 'fa-file-export', cls: 'export', label: 'Export CSV', fn: handleExport },
                    { id: 'qa-backup', icon: 'fa-database', cls: 'backup', label: 'Backup JSON', fn: handleBackup },
                    { id: 'qa-restore', icon: 'fa-upload', cls: 'restore', label: 'Restore JSON', fn: () => restoreRef.current?.click() },
                  ].map(q => (
                    <button key={q.id} className="quick-action-btn" onClick={q.fn}>
                      <div className={`qa-icon ${q.cls}`}><i className={`fas ${q.icon}`}></i></div>
                      <span>{q.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── ADMIN PLACEMENT CELL ── */}
      {activeView === 'admin-placement' && (
        <section id="view-admin-placement" className="view">
          <div className="page-header">
            <div><h1 className="page-title">Placement Management</h1><p className="page-subtitle">Track and configure placement metrics for all students</p></div>
          </div>

          <div className="placement-stats-grid">
            {[
              { label: 'Placement Rate', value: `${stats.rate}%`, icon: 'fa-percentage', bg: 'rgba(59, 130, 246, 0.1)', color: 'var(--brand-primary)' },
              { label: 'Highest Package', value: `${stats.highestPackage} LPA`, icon: 'fa-trophy', bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' },
              { label: 'Average Package', value: `${stats.averagePackage} LPA`, icon: 'fa-calculator', bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981' },
              { label: 'Total Placed', value: stats.placed, icon: 'fa-user-check', bg: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }
            ].map((st, i) => (
              <div key={i} className="stat-card-student">
                <div className="stat-icon" style={{ background: st.bg, color: st.color }}><i className={`fas ${st.icon}`}></i></div>
                <div className="stat-info"><span className="stat-label">{st.label}</span><span className="stat-value">{st.value}</span></div>
              </div>
            ))}
          </div>

          <div className="card filter-card">
            <div className="filter-row">
              <div className="search-box flex-1"><i className="fas fa-search search-icon"></i><input type="text" className="search-input" placeholder="Search student by name or ID..." value={plSearch} onChange={e => { setPlSearch(e.target.value); setPlPage(1); }} /></div>
              <select className="form-input form-select filter-select" value={plFilterStatus} onChange={e => { setPlFilterStatus(e.target.value); setPlPage(1); }}>
                <option value="">All Placement Statuses</option>
                <option value="Unplaced">Unplaced</option>
                <option value="In Progress">In Progress</option>
                <option value="Placed">Placed</option>
              </select>
              <select className="form-input form-select filter-select" value={plFilterElig} onChange={e => { setPlFilterElig(e.target.value); setPlPage(1); }}>
                <option value="">All Eligibilities</option>
                <option value="Eligible">Eligible</option>
                <option value="Not Eligible">Not Eligible</option>
              </select>
              <button className="btn btn-ghost btn-sm" onClick={() => { setPlSearch(''); setPlFilterStatus(''); setPlFilterElig(''); setPlPage(1); }}><i className="fas fa-times"></i> Reset</button>
            </div>
          </div>

          <div className="card table-card">
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student ID</th>
                    <th>Name</th>
                    <th>Course</th>
                    <th>Eligibility</th>
                    <th>Placement Status</th>
                    <th>Offers</th>
                    <th>Highest Package</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.filter(s => {
                    if (plSearch) {
                      const q = plSearch.toLowerCase();
                      if (!s.fullName.toLowerCase().includes(q) && !s.studentId.toLowerCase().includes(q)) return false;
                    }
                    if (plFilterStatus && s.placement?.status !== plFilterStatus) return false;
                    if (plFilterElig && s.placement?.eligibility !== plFilterElig) return false;
                    return true;
                  }).slice((plPage - 1) * pageSize, plPage * pageSize).map(s => {
                    const p = s.placement || {};
                    return (
                      <tr key={s.email}>
                        <td><span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{s.studentId}</span></td>
                        <td><div className="student-name-cell"><Avatar student={s} /><span>{s.fullName}</span></div></td>
                        <td>{s.course}</td>
                        <td>
                          <span className={`badge ${p.eligibility === 'Eligible' ? 'badge-active' : 'badge-suspended'}`}>
                            {p.eligibility || 'Eligible'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${p.status === 'Placed' ? 'badge-graduated' : (p.status === 'In Progress' ? 'badge-active' : 'badge-suspended')}`}>
                            {p.status || 'Unplaced'}
                          </span>
                        </td>
                        <td>{p.offersCount || 0} offers</td>
                        <td>{p.highestPackage ? `${p.highestPackage} LPA` : '—'}</td>
                        <td>
                          <button
                            className="btn btn-outline btn-xs"
                            onClick={() => showModal({
                              title: 'Manage Student Placement Details',
                              maxWidth: '620px',
                              content: <ManagePlacementModal student={s} onSave={load} onClose={closeModal} />
                            })}
                          >
                            <i className="fas fa-edit"></i> Manage
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ── ADMIN TRAINING ── */}
      {activeView === 'admin-training' && (
        <section id="view-admin-training" className="view">
          <div className="page-header">
            <div><h1 className="page-title">Manage Training Materials</h1><p className="page-subtitle">Configure practice test questions, coding logic challenges, and recruiter patterns</p></div>
          </div>

          <div className="role-tabs" style={{ marginBottom: 20 }}>
            {[['aptitude', 'Aptitude Tests', 'fa-brain'], ['coding', 'Coding Challenges', 'fa-code'], ['company', 'Company Prep Guidelines', 'fa-building']].map(([tabKey, label, icon]) => (
              <button key={tabKey} className={`role-tab${trTab === tabKey ? ' active' : ''}`} onClick={() => setTrTab(tabKey)}>
                <i className={`fas ${icon}`}></i> {label}
              </button>
            ))}
          </div>

          {trTab === 'aptitude' && (
            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <h3 className="card-title">Aptitude Question Bank ({Storage.getAptitudeQuestions().length})</h3>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="file" accept=".xlsx, .xls, .csv" id="import-apt-file" style={{ display: 'none' }} onChange={handleImportAptitude} />
                  <button className="btn btn-ghost btn-sm" onClick={() => document.getElementById('import-apt-file').click()}>
                    <i className="fas fa-file-excel" style={{ color: 'var(--brand-primary)' }}></i> Import Excel/CSV
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={() => showModal({
                    title: 'Add Aptitude Question',
                    content: <AddAptitudeQuestionModal onSave={load} onClose={closeModal} showToast={showToast} />
                  })}><i className="fas fa-plus"></i> Add Question</button>
                </div>
              </div>
              <div className="card-body">
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th>Question</th>
                        <th>Correct Option</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Storage.getAptitudeQuestions().map((q, i) => (
                        <tr key={q.id || i}>
                          <td><strong>{q.category}</strong></td>
                          <td><div style={{ maxWidth: 380, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.question}</div></td>
                          <td>Option {String.fromCharCode(65 + q.correctOption)} ({q.options[q.correctOption]})</td>
                          <td>
                            <button className="action-btn delete" onClick={() => {
                              showConfirm({
                                title: 'Delete Question',
                                message: 'Are you sure you want to delete this question?',
                                confirmText: 'Delete',
                                type: 'danger',
                                onConfirm: () => {
                                  const list = Storage.getAptitudeQuestions().filter(item => item.id !== q.id);
                                  Storage.setAptitudeQuestions(list);
                                  showToast('Deleted', 'Aptitude question removed.', 'success');
                                  load();
                                }
                              });
                            }}><i className="fas fa-trash"></i></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {trTab === 'coding' && (
            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <h3 className="card-title">Coding Challenges Directory ({Storage.getCodingQuestions().length})</h3>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="file" accept=".xlsx, .xls, .csv" id="import-coding-file" style={{ display: 'none' }} onChange={handleImportCoding} />
                  <button className="btn btn-ghost btn-sm" onClick={() => document.getElementById('import-coding-file').click()}>
                    <i className="fas fa-file-excel" style={{ color: 'var(--brand-primary)' }}></i> Import Excel/CSV
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={() => showModal({
                    title: 'Add Coding Challenge',
                    maxWidth: '620px',
                    content: <AddCodingQuestionModal onSave={load} onClose={closeModal} showToast={showToast} />
                  })}><i className="fas fa-plus"></i> Add Challenge</button>
                </div>
              </div>
              <div className="card-body">
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Language</th>
                        <th>Difficulty</th>
                        <th>Category</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Storage.getCodingQuestions().map((c, i) => (
                        <tr key={c.id || i}>
                          <td><strong>{c.title}</strong></td>
                          <td>{c.language}</td>
                          <td><span className={`badge ${c.difficulty === 'Basic' ? 'badge-active' : 'badge-suspended'}`}>{c.difficulty}</span></td>
                          <td>{c.category}</td>
                          <td>
                            <button className="action-btn delete" onClick={() => {
                              showConfirm({
                                title: 'Delete Problem',
                                message: 'Are you sure you want to delete this coding problem?',
                                confirmText: 'Delete',
                                type: 'danger',
                                onConfirm: () => {
                                  const list = Storage.getCodingQuestions().filter(item => item.id !== c.id);
                                  Storage.setCodingQuestions(list);
                                  showToast('Deleted', 'Coding problem removed.', 'success');
                                  load();
                                }
                              });
                            }}><i className="fas fa-trash"></i></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {trTab === 'company' && (
            <div className="card">
              <div className="card-header"><h3 className="card-title">Company Placement Syllabus Directory</h3></div>
              <div className="card-body">
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Company</th>
                        <th>Academic Cutoff</th>
                        <th>Pattern Summary</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(Storage.getCompanyPrep()).map(compName => {
                        const compData = Storage.getCompanyPrep()[compName] || {};
                        return (
                          <tr key={compName}>
                            <td><strong>{compName}</strong></td>
                            <td>{compData.eligibility}</td>
                            <td><div style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{compData.pattern}</div></td>
                            <td>
                              <button className="btn btn-outline btn-xs" onClick={() => showModal({
                                title: `Edit ${compName} Prep Guide`,
                                maxWidth: '620px',
                                content: <EditCompanyPrepModal companyKey={compName} onSave={load} onClose={closeModal} showToast={showToast} />
                              })}><i className="fas fa-edit"></i> Edit Guide</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── STUDENT TABLE ── */}
      {activeView === 'admin-students' && (
        <section id="view-admin-students" className="view">
          <div className="page-header">
            <div><h1 className="page-title">Student Management</h1><p className="page-subtitle">Manage all student records</p></div>
            <div className="page-actions">
              <button className="btn btn-ghost btn-sm" onClick={() => csvRef.current?.click()}><i className="fas fa-file-import"></i> Import</button>
              <button className="btn btn-ghost btn-sm" onClick={handleExport}><i className="fas fa-file-export"></i> Export</button>
              <button className="btn btn-primary btn-sm" onClick={openAddModal}><i className="fas fa-plus"></i> Add Student</button>
            </div>
          </div>
          {/* Filters */}
          <div className="card filter-card">
            <div className="filter-row">
              <div className="search-box flex-1"><i className="fas fa-search search-icon"></i><input type="text" className="search-input" placeholder="Search by name, email, ID, course..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></div>
              <select className="form-input form-select filter-select" value={filterCourse} onChange={e => { setFilterCourse(e.target.value); setPage(1); }}>
                <option value="">All Courses</option>{allCourses.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select className="form-input form-select filter-select" value={filterYear} onChange={e => { setFilterYear(e.target.value); setPage(1); }}>
                <option value="">All Years</option>{['1','2','3','4','5','Graduate'].map(y => <option key={y} value={y}>{yearDisplay(y)}</option>)}
              </select>
              <select className="form-input form-select filter-select" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
                <option value="">All Status</option>{['Active','Graduated','Suspended','Withdrawn'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setFilterCourse(''); setFilterYear(''); setFilterStatus(''); setPage(1); }}><i className="fas fa-times"></i> Reset</button>
            </div>
          </div>
          {/* Bulk Actions */}
          {selected.size > 0 && (
            <div className="bulk-actions"><span>{selected.size}</span> selected
              <button className="btn btn-danger btn-sm" onClick={bulkDelete}><i className="fas fa-trash"></i> Delete Selected</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelected(new Set())}><i className="fas fa-times"></i> Clear</button>
            </div>
          )}
          {/* Table */}
          <div className="card table-card">
            <div className="table-header">
              <div className="table-info">{filtered.length === 0 ? `No records (${students.length} total)` : `Showing ${(page-1)*pageSize+1}–${Math.min(page*pageSize,filtered.length)} of ${filtered.length}${filtered.length < students.length ? ` (filtered from ${students.length})` : ''}`}</div>
              <div className="table-controls">
                <label className="form-label">Per page:</label>
                <select className="form-input form-select page-size-select" value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}>
                  {[10,25,50,100].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead><tr>
                  <th className="col-check"><input type="checkbox" checked={pageData.length > 0 && pageData.every(s => selected.has(s.email))} onChange={e => { const ns = new Set(selected); pageData.forEach(s => e.target.checked ? ns.add(s.email) : ns.delete(s.email)); setSelected(ns); }} /></th>
                  {[['studentId','Student ID'],['registerNumber','Reg. No.'],['fullName','Name'],['email','Email'],['course','Course'],['yearLevel','Year'],['status','Status']].map(([col,lbl]) => (
                    <th key={col} className="sortable" onClick={() => handleSort(col)}>{lbl} <SortIcon col={col} /></th>
                  ))}
                  <th>Actions</th>
                </tr></thead>
                <tbody>
                  {pageData.length === 0 ? (
                    <tr><td colSpan={8}>
                      <div className="empty-state"><div className="empty-icon"><i className="fas fa-users"></i></div><h3>No students found</h3><p>Try adjusting filters or add a new student.</p><button className="btn btn-primary" onClick={openAddModal}><i className="fas fa-plus"></i> Add First Student</button></div>
                    </td></tr>
                  ) : pageData.map(s => (
                    <tr key={s.email} className={selected.has(s.email) ? 'selected' : ''}>
                      <td className="col-check"><input type="checkbox" checked={selected.has(s.email)} onChange={e => { const ns = new Set(selected); e.target.checked ? ns.add(s.email) : ns.delete(s.email); setSelected(ns); }} /></td>
                      <td><span style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{s.studentId}</span></td>
                      <td><span style={{ fontSize: '0.82rem', color: 'var(--brand-primary)' }}>{s.registerNumber || '—'}</span></td>
                      <td><div className="student-name-cell"><Avatar student={s} /><span>{s.fullName}</span></div></td>
                      <td><span style={{ fontSize: '0.82rem' }}>{s.email}</span></td>
                      <td><span style={{ fontSize: '0.82rem' }}>{s.course || '—'}</span></td>
                      <td>{yearDisplay(s.yearLevel)}</td>
                      <td><span className={`badge badge-${statusBadgeClass(s.status)}`}>{s.status}</span></td>
                      <td><div className="table-actions">
                        <button className="action-btn view" title="View" onClick={() => openViewModal(s.email)}><i className="fas fa-eye"></i></button>
                        <button className="action-btn edit" title="Edit" onClick={() => openEditModal(s.email)}><i className="fas fa-edit"></i></button>
                        <button className="action-btn reset" title="Reset Password" onClick={() => showModal({ title: 'Reset Password', maxWidth: '440px', content: <ResetPasswordModal student={s} onClose={closeModal} /> })}><i className="fas fa-key"></i></button>
                        <button className="action-btn delete" title="Delete" onClick={() => confirmDelete(s.email)}><i className="fas fa-trash"></i></button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><i className="fas fa-chevron-left"></i></button>
                <div className="page-numbers">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1).reduce((acc, p, i, arr) => {
                    if (i > 0 && p - arr[i-1] > 1) acc.push('...');
                    acc.push(p);
                    return acc;
                  }, []).map((p, i) => p === '...' ? <span key={`e${i}`} className="page-btn ellipsis">…</span> : <button key={p} className={`page-btn${p === page ? ' active' : ''}`} onClick={() => setPage(p)}>{p}</button>)}
                </div>
                <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><i className="fas fa-chevron-right"></i></button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── ACTIVITY LOG ── */}
      {activeView === 'admin-activity' && (
        <section id="view-admin-activity" className="view">
          <div className="page-header">
            <div><h1 className="page-title">Activity Log</h1><p className="page-subtitle">All system activity</p></div>
            <button className="btn btn-ghost btn-sm" onClick={() => showConfirm({ title: 'Clear Activity Logs', message: 'Clear all activity records?', confirmText: 'Clear Logs', type: 'danger', onConfirm: () => { Storage.clearActivity(); load(); showToast('Cleared', 'Activity logs wiped.', 'success'); } })}><i className="fas fa-trash"></i> Clear Log</button>
          </div>
          <div className="card"><div className="activity-list">{activity.length === 0 ? <div className="empty-state-sm"><i className="fas fa-inbox"></i><p>No activity logged yet</p></div> : activity.map(a => <ActivityItem key={a.id} act={a} />)}</div></div>
        </section>
      )}

      {/* ── ADMIN SETTINGS ── */}
      {activeView === 'admin-settings' && (
        <AdminSettings theme={theme} applyTheme={applyTheme} onExport={handleExport} onImport={() => csvRef.current?.click()} onBackup={handleBackup} onRestore={() => restoreRef.current?.click()} onClear={handleClearData} showToast={showToast} />
      )}
    </div>
  );
}

function AdminSettings({ theme, applyTheme, onExport, onImport, onBackup, onRestore, onClear, showToast }) {
  const { currentUser } = useAuth();
  const [pw, setPw] = useState({ cur: '', np: '', cp: '' });
  const [pwErr, setPwErr] = useState({});
  const [college, setCollege] = useState(() => Storage.getCollegeProfile());
  const [collegeMsg, setCollegeMsg] = useState('');
  const spw = (k) => (e) => setPw(p => ({ ...p, [k]: e.target.value }));
  const handlePwSubmit = (e) => {
    e.preventDefault();
    const errs = {};
    const user = Storage.getUser(currentUser.email);
    if (!verifyPassword(pw.cur, user.passwordHash)) errs.cur = 'Current password incorrect.';
    if (!isStrongPassword(pw.np)) errs.np = 'Min 8 chars with uppercase, lowercase, number.';
    if (pw.np !== pw.cp) errs.cp = 'Passwords do not match.';
    if (Object.keys(errs).length) { setPwErr(errs); return; }
    Storage.updateUser(currentUser.email, { passwordHash: hashPassword(pw.np) });
    Storage.addActivity({ type: 'update', text: `Admin password changed`, userEmail: currentUser.email });
    showToast('Password Updated', 'Your password has been changed.', 'success');
    setPw({ cur: '', np: '', cp: '' }); setPwErr({});
  };
  const handleCollegeSave = (e) => {
    e.preventDefault();
    if (!college.name.trim()) { setCollegeMsg('College name is required.'); return; }
    Storage.setCollegeProfile(college);
    showToast('Saved', 'College profile updated successfully.', 'success');
    setCollegeMsg('');
  };
  return (
    <section id="view-admin-settings" className="view">
      <div className="page-header"><div><h1 className="page-title">Settings</h1><p className="page-subtitle">System preferences and account settings</p></div></div>
      <div className="settings-grid">
        {/* College Profile */}
        {currentUser && currentUser.isMainAdmin && (
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <div className="card-header"><h3 className="card-title"><i className="fas fa-university"></i> College Profile</h3></div>
            <div className="card-body">
              <form className="settings-form" onSubmit={handleCollegeSave} noValidate>
                <div className="form-row">
                  <div className="form-group flex-2">
                    <label className="form-label">College Name *</label>
                    <div className="input-wrapper">
                      <i className="fas fa-university input-icon"></i>
                      <input className="form-input" value={college.name} onChange={e => setCollege(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Sri Ramakrishna Engineering College" />
                    </div>
                    {collegeMsg && <span className="field-error">{collegeMsg}</span>}
                  </div>
                  <div className="form-group flex-1">
                    <label className="form-label">College Register No. / Code</label>
                    <div className="input-wrapper">
                      <i className="fas fa-barcode input-icon"></i>
                      <input className="form-input" value={college.registerNumber || ''} onChange={e => setCollege(p => ({ ...p, registerNumber: e.target.value }))} placeholder="e.g. SREC-6112" />
                    </div>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">College Address</label>
                  <div className="input-wrapper">
                    <i className="fas fa-map-marker-alt input-icon"></i>
                    <textarea className="form-input" style={{ minHeight: 70, padding: '10px 10px 10px 38px', resize: 'vertical' }} value={college.address} onChange={e => setCollege(p => ({ ...p, address: e.target.value }))} placeholder="e.g. Vattamalaipalayam, Coimbatore - 641022, Tamil Nadu" />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary"><i className="fas fa-save"></i> Save College Profile</button>
              </form>
            </div>
          </div>
        )}
        <div className="card"><div className="card-header"><h3 className="card-title"><i className="fas fa-palette"></i> Appearance</h3></div>
          <div className="card-body"><div className="setting-row"><div><strong>Theme</strong><p className="setting-desc">Switch between light and dark mode</p></div>
            <div className="theme-toggle-switch"><span>Light</span><label className="toggle-switch"><input type="checkbox" checked={theme === 'dark'} onChange={e => applyTheme(e.target.checked ? 'dark' : 'light')} /><span className="toggle-slider"></span></label><span>Dark</span></div>
          </div></div>
        </div>
        {currentUser && currentUser.isMainAdmin && (
          <div className="card"><div className="card-header"><h3 className="card-title"><i className="fas fa-database"></i> Data Management</h3></div>
            <div className="card-body"><div className="setting-actions">
              <button className="btn btn-outline" onClick={onExport}><i className="fas fa-file-export"></i> Export CSV</button>
              <button className="btn btn-outline" onClick={onImport}><i className="fas fa-file-import"></i> Import CSV</button>
              <button className="btn btn-outline" onClick={onBackup}><i className="fas fa-download"></i> Backup JSON</button>
              <button className="btn btn-outline" onClick={onRestore}><i className="fas fa-upload"></i> Restore JSON</button>
              <button className="btn btn-danger" onClick={onClear}><i className="fas fa-exclamation-triangle"></i> Clear All Data</button>
            </div></div>
          </div>
        )}
        <div className="card"><div className="card-header"><h3 className="card-title"><i className="fas fa-key"></i> Change Admin Password</h3></div>
          <div className="card-body"><form className="settings-form" onSubmit={handlePwSubmit} noValidate>
            <div className="form-group"><label className="form-label">Current Password</label><div className="input-wrapper"><i className="fas fa-lock input-icon"></i><input type="password" className="form-input" value={pw.cur} onChange={spw('cur')} /></div>{pwErr.cur && <span className="field-error">{pwErr.cur}</span>}</div>
            <div className="form-group"><label className="form-label">New Password</label><div className="input-wrapper"><i className="fas fa-lock input-icon"></i><input type="password" className="form-input" value={pw.np} onChange={spw('np')} /></div>{pwErr.np && <span className="field-error">{pwErr.np}</span>}</div>
            <div className="form-group"><label className="form-label">Confirm New Password</label><div className="input-wrapper"><i className="fas fa-lock input-icon"></i><input type="password" className="form-input" value={pw.cp} onChange={spw('cp')} /></div>{pwErr.cp && <span className="field-error">{pwErr.cp}</span>}</div>
            <button type="submit" className="btn btn-primary">Update Password</button>
          </form></div>
        </div>
      </div>
    </section>
  );
}
