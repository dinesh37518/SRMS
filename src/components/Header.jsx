/**
 * Header.jsx – Top navigation bar with search, theme toggle, profile dropdown
 */
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { getInitials, nameToColor } from '../utils/helpers.js';

const BREADCRUMB_MAP = {
  'admin-dashboard': 'Dashboard',
  'admin-students': 'Student Management',
  'admin-placement': 'Placement Records',
  'admin-training': 'Manage Training Content',
  'admin-activity': 'System Activity Log',
  'admin-settings': 'System Settings',
  'student-dashboard': 'Dashboard',
  'student-profile': 'My Profile',
  'student-placement': 'My Placement Status & History',
  'student-training': 'Placement Prep Training',
  'student-companies': 'Company Prep Guidelines',
  'student-courses': 'My Courses',
  'student-activity': 'Personal Activity Log',
  'student-settings': 'Preferences & Settings',
};

export default function Header({ activeView, onNavigate, onMobileMenuOpen, onSearch }) {
  const { currentUser, theme, toggleTheme, logout, showConfirm } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!currentUser) return null;

  const isPhoto = !!currentUser.profilePhoto;
  const displayName = currentUser.role === 'admin' ? 'Administrator' : currentUser.fullName;
  const displayRole = currentUser.role === 'admin' ? 'System Admin' : 'Student';

  const handleLogout = () => {
    setDropdownOpen(false);
    showConfirm({
      title: 'Sign Out',
      message: 'Are you sure you want to sign out of SRMS?',
      confirmText: 'Sign Out',
      type: 'danger',
      onConfirm: logout,
    });
  };

  const handleProfileClick = (e) => {
    e.preventDefault();
    setDropdownOpen(false);
    if (currentUser.role === 'student') onNavigate('student-profile');
  };

  const handleSettingsClick = (e) => {
    e.preventDefault();
    setDropdownOpen(false);
    onNavigate(currentUser.role === 'admin' ? 'admin-settings' : 'student-settings');
  };

  const AvatarEl = () => isPhoto
    ? <img src={currentUser.profilePhoto} alt={currentUser.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
    : <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'white' }}>{getInitials(currentUser.fullName)}</span>;

  return (
    <header className="top-header" id="top-header">
      <div className="header-left">
        <button id="mobile-menu-btn" className="btn-icon" aria-label="Open menu" onClick={onMobileMenuOpen}>
          <i className="fas fa-bars"></i>
        </button>
        <div className="header-breadcrumb" id="header-breadcrumb">
          <span id="breadcrumb-title">{BREADCRUMB_MAP[activeView] || 'Dashboard'}</span>
        </div>
      </div>

      <div className="header-right">
        {/* Global search — admin only */}
        {currentUser.role === 'admin' && (
          <div className="header-search" id="header-search-wrap">
            <div className="search-box">
              <i className="fas fa-search search-icon"></i>
              <input
                type="text"
                id="global-search"
                className="search-input"
                placeholder="Search students..."
                aria-label="Search students"
                onChange={(e) => {
                  onNavigate('admin-students');
                  onSearch(e.target.value);
                }}
              />
            </div>
          </div>
        )}

        {/* Theme toggle */}
        <button className="btn-icon theme-toggle" id="theme-toggle" aria-label="Toggle dark/light mode" onClick={toggleTheme}>
          <i className={`fas ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`} id="theme-icon"></i>
        </button>

        {/* Profile Dropdown */}
        <div className="header-profile" id="header-profile" ref={dropdownRef}>
          <div
            className="profile-trigger"
            id="profile-trigger"
            role="button"
            tabIndex={0}
            aria-haspopup="true"
            aria-expanded={dropdownOpen}
            onClick={() => setDropdownOpen(prev => !prev)}
            onKeyDown={(e) => e.key === 'Enter' && setDropdownOpen(prev => !prev)}
          >
            <div
              className="header-avatar"
              id="header-avatar"
              style={isPhoto ? {} : { background: nameToColor(currentUser.fullName), display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <AvatarEl />
            </div>
            <div className="profile-info">
              <p className="profile-name" id="header-user-name">{displayName}</p>
              <p className="profile-role" id="header-user-role">{displayRole}</p>
            </div>
            <i className={`fas fa-chevron-down profile-arrow${dropdownOpen ? ' open' : ''}`}></i>
          </div>

          {dropdownOpen && (
            <div className="profile-dropdown" id="profile-dropdown">
              <div className="dropdown-header">
                <div
                  className="dropdown-avatar"
                  id="dropdown-avatar"
                  style={isPhoto ? {} : { background: nameToColor(currentUser.fullName), display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <AvatarEl />
                </div>
                <div>
                  <p className="dropdown-name" id="dropdown-user-name">{displayName}</p>
                  <p className="dropdown-email" id="dropdown-user-email">{currentUser.email}</p>
                </div>
              </div>
              <div className="dropdown-divider"></div>
              <a href="#" className="dropdown-item" id="dd-profile" onClick={handleProfileClick}>
                <i className="fas fa-user-circle"></i> My Profile
              </a>
              <a href="#" className="dropdown-item" id="dd-settings" onClick={handleSettingsClick}>
                <i className="fas fa-cog"></i> Settings
              </a>
              <div className="dropdown-divider"></div>
              <a href="#" className="dropdown-item danger" id="dd-logout" onClick={handleLogout}>
                <i className="fas fa-sign-out-alt"></i> Logout
              </a>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
