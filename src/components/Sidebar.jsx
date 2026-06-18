/**
 * Sidebar.jsx – Responsive navigation sidebar
 */
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { getInitials, nameToColor } from '../utils/helpers.js';

const ADMIN_NAV = [
  { view: 'admin-dashboard', icon: 'fa-th-large', label: 'Dashboard' },
  { view: 'admin-students', icon: 'fa-users', label: 'Students' },
  { view: 'admin-placement', icon: 'fa-briefcase', label: 'Placement Cell' },
  { view: 'admin-training', icon: 'fa-laptop-code', label: 'Training Materials' },
  { view: 'admin-activity', icon: 'fa-history', label: 'Activity' },
  { view: 'admin-settings', icon: 'fa-sliders-h', label: 'Settings' },
];

const STUDENT_NAV = [
  { view: 'student-dashboard', icon: 'fa-th-large', label: 'Dashboard' },
  { view: 'student-profile', icon: 'fa-user-circle', label: 'My Profile' },
  { view: 'student-placement', icon: 'fa-briefcase', label: 'My Placement' },
  { view: 'student-training', icon: 'fa-laptop-code', label: 'Placement Training' },
  { view: 'student-companies', icon: 'fa-building', label: 'Company Prep' },
  { view: 'student-courses', icon: 'fa-book-open', label: 'My Courses' },
  { view: 'student-activity', icon: 'fa-history', label: 'Activity Log' },
  { view: 'student-settings', icon: 'fa-cog', label: 'Settings' },
];

export default function Sidebar({ activeView, onNavigate, collapsed, onToggleCollapse, mobileOpen, onCloseMobile }) {
  const { currentUser, logout, showConfirm } = useAuth();
  if (!currentUser) return null;

  const navItems = currentUser.role === 'admin' ? ADMIN_NAV : STUDENT_NAV;
  const sectionLabel = currentUser.role === 'admin' ? 'Admin Panel' : 'Student Portal';

  const handleLogout = () => {
    showConfirm({
      title: 'Sign Out',
      message: 'Are you sure you want to sign out of SRMS?',
      confirmText: 'Sign Out',
      type: 'danger',
      onConfirm: logout,
    });
  };

  const isPhoto = !!currentUser.profilePhoto;

  return (
    <>
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div className="sidebar-overlay" onClick={onCloseMobile} />
      )}

      <aside
        id="sidebar"
        className={`sidebar${collapsed ? ' collapsed' : ''}${mobileOpen ? ' mobile-open' : ''}`}
        aria-label="Sidebar navigation"
      >
        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="brand-icon-sm"><i className="fas fa-graduation-cap"></i></div>
            <span className="brand-text">SRMS</span>
          </div>
          <button id="sidebar-toggle" className="sidebar-toggle" aria-label="Toggle sidebar" onClick={onToggleCollapse}>
            <i className="fas fa-bars"></i>
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav" aria-label={`${sectionLabel} navigation`}>
          <div className="nav-section-label">{sectionLabel}</div>
          {navItems.map(item => (
            <a
              key={item.view}
              href="#"
              className={`nav-item${activeView === item.view ? ' active' : ''}`}
              data-view={item.view}
              onClick={(e) => { e.preventDefault(); onNavigate(item.view); onCloseMobile(); }}
            >
              <i className={`fas ${item.icon}`}></i>
              <span>{item.label}</span>
            </a>
          ))}
        </nav>

        {/* Footer User Area */}
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div
              className="sidebar-avatar"
              id="sidebar-avatar"
              style={isPhoto ? {} : { background: nameToColor(currentUser.fullName), display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {isPhoto
                ? <img src={currentUser.profilePhoto} alt={currentUser.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                : <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'white' }}>{getInitials(currentUser.fullName)}</span>
              }
            </div>
            <div className="sidebar-user-info">
              <p className="sidebar-user-name">{currentUser.role === 'admin' ? 'Administrator' : currentUser.fullName}</p>
              <p className="sidebar-user-role">{currentUser.role === 'admin' ? 'System Admin' : 'Student'}</p>
            </div>
          </div>
          <button className="btn-icon logout-btn" id="sidebar-logout" title="Logout" aria-label="Logout" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i>
          </button>
        </div>
      </aside>
    </>
  );
}
