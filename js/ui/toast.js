/**
 * toast.js – Toast notification system
 */

const Toast = (() => {
  const DURATION = 4000;
  const icons = {
    success: 'fas fa-check-circle',
    error: 'fas fa-times-circle',
    warning: 'fas fa-exclamation-triangle',
    info: 'fas fa-info-circle',
  };

  const show = (title, message = '', type = 'info', duration = DURATION) => {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
      <div class="toast-icon"><i class="${icons[type] || icons.info}"></i></div>
      <div class="toast-content">
        <div class="toast-title">${Utils.escapeHtml(title)}</div>
        ${message ? `<div class="toast-message">${Utils.escapeHtml(message)}</div>` : ''}
      </div>
      <button class="toast-close" aria-label="Dismiss notification"><i class="fas fa-times"></i></button>
      <div class="toast-progress" style="animation-duration:${duration}ms"></div>
    `;

    container.appendChild(toast);

    // Close button
    toast.querySelector('.toast-close').addEventListener('click', () => dismiss(toast));

    // Auto-dismiss
    const timer = setTimeout(() => dismiss(toast), duration);
    toast._timer = timer;

    // Pause on hover
    toast.addEventListener('mouseenter', () => clearTimeout(toast._timer));
    toast.addEventListener('mouseleave', () => {
      toast._timer = setTimeout(() => dismiss(toast), 1500);
    });

    return toast;
  };

  const dismiss = (toast) => {
    if (!toast || !toast.parentNode) return;
    clearTimeout(toast._timer);
    toast.classList.add('leaving');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 400);
  };

  const success = (title, msg, dur) => show(title, msg, 'success', dur);
  const error = (title, msg, dur) => show(title, msg, 'error', dur);
  const warning = (title, msg, dur) => show(title, msg, 'warning', dur);
  const info = (title, msg, dur) => show(title, msg, 'info', dur);

  return { show, dismiss, success, error, warning, info };
})();
