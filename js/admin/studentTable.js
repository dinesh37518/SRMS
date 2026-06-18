/**
 * studentTable.js – Data table: search, filter, sort, pagination, bulk actions
 */

const StudentTable = (() => {
  let state = {
    students: [],
    filtered: [],
    search: '',
    filterCourse: '',
    filterYear: '',
    filterStatus: '',
    sortCol: 'fullName',
    sortDir: 'asc',
    page: 1,
    pageSize: 10,
    selectedEmails: new Set(),
  };

  // ============================================================
  // INIT
  // ============================================================
  const init = () => {
    bindSearch();
    bindFilters();
    bindSort();
    bindPagination();
    bindSelectAll();
    bindBulkActions();
    populateCourseFilter();
    refresh();
  };

  // ============================================================
  // REFRESH
  // ============================================================
  const refresh = () => {
    state.students = Storage.getAllStudents();
    applyFilters();
    applySort();
    renderTable();
    renderPagination();
    updateInfo();
    updateBulkActionsBar();
  };

  // ============================================================
  // SEARCH
  // ============================================================
  const bindSearch = () => {
    const input = document.getElementById('student-search');
    if (!input) return;
    input.addEventListener('input', Utils.debounce(() => {
      state.search = input.value.trim().toLowerCase();
      state.page = 1;
      refresh();
    }, 200));
  };

  // ============================================================
  // FILTERS
  // ============================================================
  const bindFilters = () => {
    const course = document.getElementById('filter-course');
    const year = document.getElementById('filter-year');
    const status = document.getElementById('filter-status');
    const reset = document.getElementById('btn-reset-filters');

    course?.addEventListener('change', () => { state.filterCourse = course.value; state.page = 1; refresh(); });
    year?.addEventListener('change', () => { state.filterYear = year.value; state.page = 1; refresh(); });
    status?.addEventListener('change', () => { state.filterStatus = status.value; state.page = 1; refresh(); });

    reset?.addEventListener('click', () => {
      state.filterCourse = '';
      state.filterYear = '';
      state.filterStatus = '';
      state.search = '';
      if (course) course.value = '';
      if (year) year.value = '';
      if (status) status.value = '';
      const searchInput = document.getElementById('student-search');
      if (searchInput) searchInput.value = '';
      state.page = 1;
      refresh();
      Toast.info('Filters reset', 'All filters have been cleared.');
    });
  };

  const populateCourseFilter = () => {
    const sel = document.getElementById('filter-course');
    if (!sel) return;
    const courses = [...new Set(Storage.getAllStudents().map(s => s.course).filter(Boolean))].sort();
    sel.innerHTML = '<option value="">All Courses</option>' + courses.map(c => `<option value="${c}">${c}</option>`).join('');
  };

  const applyFilters = () => {
    state.filtered = state.students.filter(s => {
      if (state.search) {
        const q = state.search;
        const match = (s.fullName || '').toLowerCase().includes(q) ||
          (s.email || '').toLowerCase().includes(q) ||
          (s.studentId || '').toLowerCase().includes(q) ||
          (s.course || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      if (state.filterCourse && s.course !== state.filterCourse) return false;
      if (state.filterYear && s.yearLevel !== state.filterYear) return false;
      if (state.filterStatus && s.status !== state.filterStatus) return false;
      return true;
    });
  };

  // ============================================================
  // SORT
  // ============================================================
  const bindSort = () => {
    Utils.$$('.data-table th.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.dataset.col;
        if (state.sortCol === col) {
          state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          state.sortCol = col;
          state.sortDir = 'asc';
        }
        state.page = 1;
        refresh();
      });
    });
  };

  const applySort = () => {
    const { sortCol, sortDir } = state;
    state.filtered.sort((a, b) => {
      let va = (a[sortCol] || '').toString().toLowerCase();
      let vb = (b[sortCol] || '').toString().toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // ============================================================
  // RENDER TABLE
  // ============================================================
  const renderTable = () => {
    const tbody = document.getElementById('student-tbody');
    const emptyState = document.getElementById('student-empty-state');
    if (!tbody) return;

    const start = (state.page - 1) * state.pageSize;
    const pageData = state.filtered.slice(start, start + state.pageSize);

    // Update sort icons
    Utils.$$('.data-table th.sortable .sort-icon').forEach(icon => {
      const th = icon.closest('th');
      icon.className = 'fas fa-sort sort-icon';
      if (th.dataset.col === state.sortCol) {
        icon.className = `fas fa-sort-${state.sortDir === 'asc' ? 'up' : 'down'} sort-icon ${state.sortDir}`;
      }
    });

    if (state.filtered.length === 0) {
      tbody.innerHTML = '';
      Utils.show(emptyState);
      return;
    }
    Utils.hide(emptyState);

    tbody.innerHTML = pageData.map(s => {
      const checked = state.selectedEmails.has(s.email) ? 'checked' : '';
      const selectedClass = state.selectedEmails.has(s.email) ? 'selected' : '';
      return `<tr class="${selectedClass}" data-email="${Utils.escapeHtml(s.email)}">
        <td class="col-check"><input type="checkbox" class="row-check" data-email="${Utils.escapeHtml(s.email)}" ${checked} aria-label="Select ${Utils.escapeHtml(s.fullName)}" /></td>
        <td><span style="font-weight:600;font-size:0.8rem;color:var(--text-secondary);">${Utils.escapeHtml(s.studentId)}</span></td>
        <td><div class="student-name-cell">${Utils.avatarHtml(s)}<span>${Utils.escapeHtml(s.fullName)}</span></div></td>
        <td><span style="font-size:0.82rem;">${Utils.escapeHtml(s.email)}</span></td>
        <td><span style="font-size:0.82rem;">${Utils.escapeHtml(s.course || '—')}</span></td>
        <td>${Utils.yearDisplay(s.yearLevel)}</td>
        <td>${Utils.statusBadge(s.status)}</td>
        <td>
          <div class="table-actions">
            <button class="action-btn view" title="View" data-action="view" data-email="${s.email}"><i class="fas fa-eye"></i></button>
            <button class="action-btn edit" title="Edit" data-action="edit" data-email="${s.email}"><i class="fas fa-edit"></i></button>
            <button class="action-btn reset" title="Reset Password" data-action="reset" data-email="${s.email}"><i class="fas fa-key"></i></button>
            <button class="action-btn delete" title="Delete" data-action="delete" data-email="${s.email}"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      </tr>`;
    }).join('');

    // Bind row action buttons
    tbody.querySelectorAll('.action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        const email = btn.dataset.email;
        if (action === 'view') StudentForm.openViewModal(email);
        else if (action === 'edit') StudentForm.openEditModal(email);
        else if (action === 'reset') StudentForm.openResetPasswordModal(email);
        else if (action === 'delete') confirmDelete(email);
      });
    });

    // Bind row checkboxes
    tbody.querySelectorAll('.row-check').forEach(cb => {
      cb.addEventListener('change', () => {
        const email = cb.dataset.email;
        if (cb.checked) state.selectedEmails.add(email);
        else state.selectedEmails.delete(email);
        cb.closest('tr').classList.toggle('selected', cb.checked);
        updateBulkActionsBar();
        updateSelectAll();
      });
    });
  };

  // ============================================================
  // PAGINATION
  // ============================================================
  const bindPagination = () => {
    document.getElementById('btn-prev-page')?.addEventListener('click', () => {
      if (state.page > 1) { state.page--; renderTable(); renderPagination(); updateInfo(); }
    });
    document.getElementById('btn-next-page')?.addEventListener('click', () => {
      const totalPages = Math.ceil(state.filtered.length / state.pageSize);
      if (state.page < totalPages) { state.page++; renderTable(); renderPagination(); updateInfo(); }
    });
    document.getElementById('page-size-select')?.addEventListener('change', (e) => {
      state.pageSize = parseInt(e.target.value) || 10;
      state.page = 1;
      refresh();
    });
  };

  const renderPagination = () => {
    const container = document.getElementById('page-numbers');
    const prevBtn = document.getElementById('btn-prev-page');
    const nextBtn = document.getElementById('btn-next-page');
    if (!container) return;

    const total = state.filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / state.pageSize));

    prevBtn.disabled = state.page <= 1;
    nextBtn.disabled = state.page >= totalPages;

    let pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (state.page > 3) pages.push('...');
      for (let i = Math.max(2, state.page - 1); i <= Math.min(totalPages - 1, state.page + 1); i++) pages.push(i);
      if (state.page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }

    container.innerHTML = pages.map(p =>
      p === '...'
        ? '<span class="page-btn ellipsis">…</span>'
        : `<button class="page-btn ${p === state.page ? 'active' : ''}" data-page="${p}">${p}</button>`
    ).join('');

    container.querySelectorAll('.page-btn:not(.ellipsis)').forEach(btn => {
      btn.addEventListener('click', () => {
        state.page = parseInt(btn.dataset.page);
        renderTable();
        renderPagination();
        updateInfo();
      });
    });
  };

  const updateInfo = () => {
    const el = document.getElementById('table-info');
    if (!el) return;
    const start = (state.page - 1) * state.pageSize + 1;
    const end = Math.min(state.page * state.pageSize, state.filtered.length);
    const total = state.filtered.length;
    const allTotal = state.students.length;
    if (total === 0) { el.textContent = `No records found (${allTotal} total)`; }
    else { el.textContent = `Showing ${start}–${end} of ${total}${total < allTotal ? ` (filtered from ${allTotal})` : ''}`; }
  };

  // ============================================================
  // SELECT ALL / BULK
  // ============================================================
  const bindSelectAll = () => {
    document.getElementById('select-all')?.addEventListener('change', (e) => {
      const checked = e.target.checked;
      const start = (state.page - 1) * state.pageSize;
      const pageData = state.filtered.slice(start, start + state.pageSize);
      pageData.forEach(s => {
        if (checked) state.selectedEmails.add(s.email);
        else state.selectedEmails.delete(s.email);
      });
      renderTable();
      updateBulkActionsBar();
    });
  };
  const updateSelectAll = () => {
    const sa = document.getElementById('select-all');
    if (!sa) return;
    const start = (state.page - 1) * state.pageSize;
    const pageData = state.filtered.slice(start, start + state.pageSize);
    sa.checked = pageData.length > 0 && pageData.every(s => state.selectedEmails.has(s.email));
  };

  const bindBulkActions = () => {
    document.getElementById('btn-bulk-delete')?.addEventListener('click', () => {
      const count = state.selectedEmails.size;
      if (!count) return;
      Modal.confirm({
        title: 'Bulk Delete',
        message: `Are you sure you want to delete <strong>${count}</strong> selected student${count > 1 ? 's' : ''}? This action cannot be undone.`,
        confirmText: `Delete ${count}`,
        type: 'danger',
        onConfirm: () => {
          state.selectedEmails.forEach(email => {
            const student = Storage.getUser(email);
            Storage.deleteUser(email);
            Storage.addActivity({ type: 'delete', text: `Admin deleted <strong>${student?.fullName || email}</strong>`, userEmail: email });
          });
          Toast.success('Students deleted', `${count} student${count > 1 ? 's' : ''} removed.`);
          state.selectedEmails.clear();
          state.page = 1;
          refresh();
          AdminDashboard.refresh();
        }
      });
    });
    document.getElementById('btn-clear-selection')?.addEventListener('click', () => {
      state.selectedEmails.clear();
      renderTable();
      updateBulkActionsBar();
    });
  };

  const updateBulkActionsBar = () => {
    const bar = document.getElementById('bulk-actions');
    const count = state.selectedEmails.size;
    if (count > 0) {
      Utils.show(bar);
      document.getElementById('selected-count').textContent = count;
    } else {
      Utils.hide(bar);
    }
  };

  // ============================================================
  // DELETE SINGLE
  // ============================================================
  const confirmDelete = (email) => {
    const student = Storage.getUser(email);
    if (!student) return;
    Modal.confirm({
      title: 'Delete Student',
      message: `Are you sure you want to delete <strong>${Utils.escapeHtml(student.fullName)}</strong> (${Utils.escapeHtml(email)})? This action cannot be undone.`,
      confirmText: 'Delete',
      type: 'danger',
      onConfirm: () => {
        Storage.deleteUser(email);
        Storage.addActivity({ type: 'delete', text: `Admin deleted <strong>${student.fullName}</strong>`, userEmail: email });
        state.selectedEmails.delete(email);
        Toast.success('Student deleted', `${student.fullName} has been removed.`);
        refresh();
        AdminDashboard.refresh();
      }
    });
  };

  // ============================================================
  // GLOBAL SEARCH (from header)
  // ============================================================
  const setSearch = (q) => {
    state.search = q.toLowerCase();
    state.page = 1;
    const input = document.getElementById('student-search');
    if (input) input.value = q;
    refresh();
  };

  return { init, refresh, setSearch, populateCourseFilter };
})();
