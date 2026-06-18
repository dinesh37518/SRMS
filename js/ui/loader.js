/**
 * loader.js – Loading indicator helpers
 */

const Loader = (() => {
  const showInline = (containerId) => {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;padding:40px;"><div class="spinner-lg"></div></div>`;
  };

  const showSkeleton = (containerId, rows = 5) => {
    const el = document.getElementById(containerId);
    if (!el) return;
    let html = '';
    for (let i = 0; i < rows; i++) {
      html += `<div class="skeleton-row"><div class="skeleton skeleton-avatar"></div><div style="flex:1"><div class="skeleton skeleton-text wide"></div><div class="skeleton skeleton-text medium"></div></div></div>`;
    }
    el.innerHTML = html;
  };

  return { showInline, showSkeleton };
})();
