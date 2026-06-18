/**
 * modal.js – Reusable modal system + confirm dialog
 */

const Modal = (() => {
  let onConfirmCallback = null;

  // ============================================================
  // MAIN MODAL
  // ============================================================
  const open = ({ title = '', content = '', maxWidth = '580px', onClose = null } = {}) => {
    const overlay = document.getElementById('modal-overlay');
    const container = document.getElementById('modal-container');
    const titleEl = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');

    if (!overlay) return;
    titleEl.textContent = title;
    body.innerHTML = content;
    container.style.maxWidth = maxWidth;
    overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    overlay._onClose = onClose;

    // Focus first input
    setTimeout(() => {
      const first = body.querySelector('input:not([type="hidden"]), select, textarea');
      first?.focus();
    }, 100);
  };

  const close = () => {
    const overlay = document.getElementById('modal-overlay');
    if (!overlay) return;
    overlay.classList.add('hidden');
    document.body.style.overflow = '';
    if (overlay._onClose) { overlay._onClose(); overlay._onClose = null; }
  };

  const getBody = () => document.getElementById('modal-body');

  // ============================================================
  // CONFIRM DIALOG
  // ============================================================
  const confirm = ({ title = 'Confirm Action', message = 'Are you sure?', confirmText = 'Confirm', type = 'warning', onConfirm = null } = {}) => {
    const overlay = document.getElementById('confirm-overlay');
    const icon = document.getElementById('confirm-icon');
    const titleEl = document.getElementById('confirm-title');
    const msgEl = document.getElementById('confirm-message');
    const okBtn = document.getElementById('confirm-ok');

    if (!overlay) return;

    icon.className = `confirm-icon ${type === 'danger' ? 'danger' : ''}`;
    icon.querySelector('i').className = type === 'danger'
      ? 'fas fa-exclamation-circle'
      : 'fas fa-exclamation-triangle';

    titleEl.textContent = title;
    msgEl.innerHTML = message;
    okBtn.textContent = confirmText;
    okBtn.className = `btn ${type === 'danger' ? 'btn-danger' : 'btn-primary'}`;

    onConfirmCallback = onConfirm;
    overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    okBtn.focus();
  };

  const closeConfirm = () => {
    const overlay = document.getElementById('confirm-overlay');
    if (overlay) overlay.classList.add('hidden');
    document.body.style.overflow = '';
    onConfirmCallback = null;
  };

  // ============================================================
  // INIT EVENT BINDINGS
  // ============================================================
  const init = () => {
    // Main modal close
    document.getElementById('modal-close')?.addEventListener('click', close);
    document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
      if (e.target === document.getElementById('modal-overlay')) close();
    });

    // Confirm dialog
    document.getElementById('confirm-cancel')?.addEventListener('click', closeConfirm);
    document.getElementById('confirm-overlay')?.addEventListener('click', (e) => {
      if (e.target === document.getElementById('confirm-overlay')) closeConfirm();
    });
    document.getElementById('confirm-ok')?.addEventListener('click', () => {
      if (onConfirmCallback) onConfirmCallback();
      closeConfirm();
    });

    // ESC key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const confirmOverlay = document.getElementById('confirm-overlay');
        const modalOverlay = document.getElementById('modal-overlay');
        if (!confirmOverlay.classList.contains('hidden')) { closeConfirm(); }
        else if (!modalOverlay.classList.contains('hidden')) { close(); }
      }
    });
  };

  return { open, close, getBody, confirm, init };
})();
