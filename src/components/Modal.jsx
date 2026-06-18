/**
 * Modal.jsx – Generic modal and confirm dialog
 */
import React, { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Modal() {
  const { modal, closeModal } = useAuth();
  const okRef = useRef(null);

  useEffect(() => {
    if (modal) okRef.current?.focus();
  }, [modal]);

  if (!modal) return null;

  const handleConfirm = () => {
    modal.onConfirm?.();
    closeModal();
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) closeModal();
  };

  return (
    <div
      className={`modal-overlay ${modal ? '' : 'hidden'}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={handleOverlayClick}
    >
      <div className="modal-container glass-card" style={{ maxWidth: modal.maxWidth || '540px' }}>
        <div className="modal-header">
          <h2 id="modal-title" className="modal-title">{modal.title}</h2>
          <button className="modal-close" onClick={closeModal} aria-label="Close modal">
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="modal-body">
          {modal.isConfirm ? (
            <div>
              <div className={`confirm-icon ${modal.type || 'danger'}`} style={{ marginBottom: 16, textAlign: 'center', fontSize: '2.5rem', color: modal.type === 'danger' ? 'var(--danger)' : 'var(--brand-primary)' }}>
                <i className="fas fa-exclamation-triangle"></i>
              </div>
              <p className="confirm-message" dangerouslySetInnerHTML={{ __html: modal.message }}></p>
              <div className="confirm-actions" style={{ marginTop: 24 }}>
                <button className="btn btn-ghost" onClick={closeModal}>Cancel</button>
                <button
                  ref={okRef}
                  className={`btn btn-${modal.type || 'danger'}`}
                  onClick={handleConfirm}
                >
                  {modal.confirmText || 'Confirm'}
                </button>
              </div>
            </div>
          ) : (
            modal.content
          )}
        </div>
      </div>
    </div>
  );
}
