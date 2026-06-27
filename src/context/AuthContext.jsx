/**
 * AuthContext.jsx – Global Auth, Theme & Session state via React Context
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as Storage from '../utils/storage.js';
import {
  getTheme, setTheme as saveTheme, getLoggedInEmail, getUser,
  clearSession, clearRemember, addActivity, syncFromRemote,
} from '../utils/storage.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [theme, setThemeState] = useState(() => getTheme());
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);
  const [modal, setModal] = useState(null); // { title, content, type, onConfirm, confirmText }

  // Apply theme to document root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    saveTheme(theme);
  }, [theme]);

  // On mount: seed data, restore session, sync from remote
  useEffect(() => {
    const init = async () => {
      Storage.seedIfEmpty();

      // Pull latest data from Supabase (no-op if not configured)
      await syncFromRemote({
        getLocalUsers: Storage.getUsers,
        setLocalUsers: Storage.setUsers,
        getLocalActivity: Storage.getActivity,
        setLocalActivity: (data) => Storage.set('srms_activity', data),
        setAptitudeQuestions: Storage.setAptitudeQuestions,
        setCodingQuestions: Storage.setCodingQuestions,
        setCompanyPrep: Storage.setCompanyPrep,
        setCollegeProfile: Storage.setCollegeProfile,
      });

      // Restore session after potential remote merge
      const email = getLoggedInEmail();
      if (email) {
        const user = getUser(email);
        if (user) setCurrentUser(user);
      }
      setTimeout(() => setLoading(false), 600);
    };
    init();
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);

  const applyTheme = useCallback((t) => {
    setThemeState(t);
  }, []);

  // Toast API
  const showToast = useCallback((title, message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Modal API
  const showModal = useCallback((config) => setModal(config), []);
  const closeModal = useCallback(() => setModal(null), []);

  const showConfirm = useCallback((config) => {
    setModal({ ...config, isConfirm: true });
  }, []);

  // Auth operations
  const login = useCallback((user, remember = false) => {
    Storage.setSession(user.email);
    if (remember) Storage.setRemember(user.email);
    addActivity({ type: 'login', text: `<strong>${user.fullName || user.email}</strong> logged in`, userEmail: user.email });
    setCurrentUser(user);
  }, []);

  const logout = useCallback(() => {
    if (currentUser) {
      addActivity({ type: 'logout', text: `<strong>${currentUser.fullName || currentUser.email}</strong> logged out`, userEmail: currentUser.email });
    }
    clearSession();
    clearRemember();
    setCurrentUser(null);
  }, [currentUser]);

  const refreshUser = useCallback(() => {
    if (currentUser?.email) {
      const updated = getUser(currentUser.email);
      if (updated) setCurrentUser(updated);
    }
  }, [currentUser]);

  return (
    <AuthContext.Provider value={{
      currentUser, setCurrentUser, loading,
      theme, toggleTheme, applyTheme,
      toasts, showToast, dismissToast,
      modal, showModal, closeModal, showConfirm,
      login, logout, refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
