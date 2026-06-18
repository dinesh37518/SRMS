/**
 * Toast.jsx – Toast notification component
 */
import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';

const ICONS = {
  success: 'fa-check-circle',
  error: 'fa-times-circle',
  warning: 'fa-exclamation-triangle',
  info: 'fa-info-circle',
};

export default function Toast() {
  const { toasts, dismissToast } = useAuth();

  return (
    <div className="toast-container" aria-live="polite" aria-atomic="true">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type} slide-in`}>
          <div className="toast-icon">
            <i className={`fas ${ICONS[t.type] || ICONS.info}`}></i>
          </div>
          <div className="toast-content">
            <p className="toast-title">{t.title}</p>
            <p className="toast-message">{t.message}</p>
          </div>
          <button className="toast-close" onClick={() => dismissToast(t.id)} aria-label="Dismiss">
            <i className="fas fa-times"></i>
          </button>
        </div>
      ))}
    </div>
  );
}
