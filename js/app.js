/**
 * app.js – Main SPA Router, controller, and global event orchestrator
 */

const App = (() => {
  let currentUser = null;
  let adminInitialized = false;

  const BREADCRUMB_MAP = {
    'admin-dashboard': 'Dashboard',
    'admin-students': 'Student Management',
    'admin-activity': 'System Activity Log',
    'admin-settings': 'System Settings',
    'student-dashboard': 'Dashboard',
    'student-profile': 'My Profile',
    'student-courses': 'My Courses',
    'student-activity': 'Personal Activity Log',
    'student-settings': 'Preferences & Settings',
  };

  // ============================================================
  // INIT
  // ============================================================
  const init = () => {
    // 1. Seed database with defaults if empty
    Storage.seedIfEmpty();

    // 2. Load theme preference
    const savedTheme = Storage.getTheme();
    applyTheme(savedTheme);

    // 3. Initialize modal overlay click bindings & forms
    Modal.init();
    Auth.init();

    // 4. Check for active remember / session credentials
    const activeEmail = Storage.getLoggedInEmail();
    if (activeEmail) {
      const user = Storage.getUser(activeEmail);
      if (user) {
        onLoginSuccess(user);
      } else {
        showAuthView('login');
      }
    } else {
      showAuthView('login');
    }

    // 5. Global Navigation & Sidebar Events
    bindSidebarControls();
    bindHeaderControls();
    bindGlobalListeners();

    // 6. Hide Initial Boot Screen
    setTimeout(() => {
      const loader = document.getElementById('loading-screen');
      if (loader) {
        loader.classList.add('fade-out');
        setTimeout(() => Utils.hide(loader), 400);
      }
    }, 1200);
  };

  // ============================================================
  // SPA ROUTING / VIEW NAVIGATION
  // ============================================================
  const navigateTo = (viewName) => {
    // Hide all view screens
    Utils.$$('.view').forEach(view => Utils.hide(view));

    // Show target view
    const targetView = document.getElementById(`view-${viewName}`);
    if (targetView) {
      Utils.show(targetView);
    }

    // Update sidebar nav active styling states
    Utils.$$('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.view === viewName);
    });

    // Update page breadcrumbs
    const breadcrumbTitle = document.getElementById('breadcrumb-title');
    if (breadcrumbTitle) {
      breadcrumbTitle.textContent = BREADCRUMB_MAP[viewName] || 'Dashboard';
    }

    // Sync theme settings checkbox value if visiting configuration page
    if (viewName === 'admin-settings' || viewName === 'student-settings') {
      const isDark = Storage.getTheme() === 'dark';
      const adminToggle = document.getElementById('settings-theme-toggle');
      const studentToggle = document.getElementById('stu-settings-theme-toggle');
      if (adminToggle) adminToggle.checked = isDark;
      if (studentToggle) studentToggle.checked = isDark;
    }

    // Clean up focus state on mobile
    document.getElementById('sidebar')?.classList.remove('mobile-open');
  };

  // ============================================================
  // SHOW AUTH VIEWS
  // ============================================================
  const showAuthView = (viewName) => {
    Utils.hide('page-app');
    Utils.show('page-auth');

    Utils.toggle('view-login', viewName === 'login');
    Utils.toggle('view-register', viewName === 'register');
    Utils.toggle('view-forgot', viewName === 'forgot');
  };

  // ============================================================
  // ON LOGIN SUCCESS
  // ============================================================
  const onLoginSuccess = (user) => {
    currentUser = user;

    Utils.hide('page-auth');
    Utils.show('page-app');

    // Display appropriate sidebar panel
    if (user.role === 'admin') {
      Utils.show('admin-nav');
      Utils.hide('student-nav');
    } else {
      Utils.show('student-nav');
      Utils.hide('admin-nav');
    }

    // Bind correct password forms under Auth module
    Auth.initChangePasswordForms(user.email, user.role);

    // Sync sidebar name details and status
    const labelName = user.role === 'admin' ? 'Administrator' : user.fullName;
    const labelRole = user.role === 'admin' ? 'System Admin' : 'Student';

    Utils.setText('sidebar-user-name', labelName);
    Utils.setText('sidebar-user-role', labelRole);
    Utils.setText('header-user-name', labelName);
    Utils.setText('header-user-role', labelRole);
    Utils.setText('dropdown-user-name', labelName);
    Utils.setText('dropdown-user-email', user.email);

    // Update navigation user profile photo avatars
    updateUserHeaderAvatars(user);

    // Handle global search visibility
    const searchWrap = document.getElementById('header-search-wrap');
    if (searchWrap) {
      if (user.role === 'admin') {
        Utils.show(searchWrap);
        const searchInput = document.getElementById('global-search');
        if (searchInput) searchInput.value = '';
      } else {
        Utils.hide(searchWrap);
      }
    }

    // Direct user to landing page and run modules lifecycle
    if (user.role === 'admin') {
      if (!adminInitialized) {
        AdminDashboard.init();
        StudentTable.init();
        adminInitialized = true;
      } else {
        AdminDashboard.refresh();
        StudentTable.refresh();
      }
      navigateTo('admin-dashboard');
    } else {
      // Student Dashboard
      StudentDashboard.init(user.email);
      navigateTo('student-dashboard');
    }
  };

  // ============================================================
  // UPDATE AVATARS
  // ============================================================
  const updateUserHeaderAvatars = (user) => {
    const isPhoto = !!user.profilePhoto;
    const avatarSelectors = ['#sidebar-avatar', '#header-avatar', '#dropdown-avatar'];
    
    avatarSelectors.forEach(selector => {
      const container = document.querySelector(selector);
      if (!container) return;

      if (isPhoto) {
        container.innerHTML = `<img src="${user.profilePhoto}" alt="${user.fullName}" style="width:100%;height:100%;object-fit:cover;border-radius:50%" />`;
        container.style.background = 'none';
      } else {
        container.innerHTML = `<span style="font-weight:600;font-size:0.85rem;color:white;">${Utils.getInitials(user.fullName)}</span>`;
        container.style.background = Utils.nameToColor(user.fullName);
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center';
      }
    });
  };

  // ============================================================
  // SIDEBAR CONTROL TOGGLES
  // ============================================================
  const bindSidebarControls = () => {
    const sidebar = document.getElementById('sidebar');
    const mainWrapper = document.getElementById('main-wrapper');

    // Sidebar collapse desktop
    document.getElementById('sidebar-toggle')?.addEventListener('click', (e) => {
      e.preventDefault();
      if (sidebar && mainWrapper) {
        sidebar.classList.toggle('collapsed');
        mainWrapper.classList.toggle('sidebar-collapsed');
      }
    });

    // Mobile slide-out trigger
    document.getElementById('mobile-menu-btn')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      sidebar?.classList.add('mobile-open');
    });

    // Navigation links routing
    document.addEventListener('click', (e) => {
      const link = e.target.closest('.nav-item[data-view]');
      if (link) {
        e.preventDefault();
        navigateTo(link.dataset.view);
      }
    });
  };

  // ============================================================
  // HEADER PROFILE DROPDOWN
  // ============================================================
  const bindHeaderControls = () => {
    const trigger = document.getElementById('profile-trigger');
    const dropdown = document.getElementById('profile-dropdown');

    trigger?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (dropdown) {
        const isHidden = dropdown.classList.contains('hidden');
        if (isHidden) {
          dropdown.classList.remove('hidden');
          trigger.setAttribute('aria-expanded', 'true');
        } else {
          dropdown.classList.add('hidden');
          trigger.setAttribute('aria-expanded', 'false');
        }
      }
    });

    // Profile Dropdown items click redirects
    document.getElementById('dd-profile')?.addEventListener('click', (e) => {
      e.preventDefault();
      dropdown?.classList.add('hidden');
      if (currentUser?.role === 'student') {
        navigateTo('student-profile');
      } else {
        Toast.info('System Profile', 'Administrator accounts do not have standard student profile fields.');
      }
    });

    document.getElementById('dd-settings')?.addEventListener('click', (e) => {
      e.preventDefault();
      dropdown?.classList.add('hidden');
      if (currentUser?.role === 'student') {
        navigateTo('student-settings');
      } else {
        navigateTo('admin-settings');
      }
    });

    // Global Search redirect to studentTable list
    const searchInput = document.getElementById('global-search');
    searchInput?.addEventListener('input', (e) => {
      const q = e.target.value;
      if (currentUser?.role === 'admin') {
        navigateTo('admin-students');
        StudentTable.setSearch(q);
      }
    });
  };

  // ============================================================
  // GLOBAL LIFE LISTENERS (Clicks outside dropdowns, Theme switches, Logout)
  // ============================================================
  const bindGlobalListeners = () => {
    const dropdown = document.getElementById('profile-dropdown');
    const trigger = document.getElementById('profile-trigger');
    const sidebar = document.getElementById('sidebar');

    // Close overlays clicking outside
    document.addEventListener('click', (e) => {
      // 1. Profile Dropdown closing
      if (dropdown && !dropdown.classList.contains('hidden')) {
        if (!trigger?.contains(e.target) && !dropdown.contains(e.target)) {
          dropdown.classList.add('hidden');
          trigger?.setAttribute('aria-expanded', 'false');
        }
      }
      
      // 2. Mobile sidebar closing
      if (sidebar && sidebar.classList.contains('mobile-open')) {
        if (!sidebar.contains(e.target) && !document.getElementById('mobile-menu-btn')?.contains(e.target)) {
          sidebar.classList.remove('mobile-open');
        }
      }
    });

    // Theme switches
    document.getElementById('theme-toggle')?.addEventListener('click', (e) => {
      e.preventDefault();
      const nextTheme = Storage.getTheme() === 'dark' ? 'light' : 'dark';
      applyTheme(nextTheme);
      Toast.info('Theme Saved', `Appearance toggled to ${nextTheme} mode.`);
    });

    document.getElementById('settings-theme-toggle')?.addEventListener('change', (e) => {
      const theme = e.target.checked ? 'dark' : 'light';
      applyTheme(theme);
    });

    document.getElementById('stu-settings-theme-toggle')?.addEventListener('change', (e) => {
      const theme = e.target.checked ? 'dark' : 'light';
      applyTheme(theme);
    });

    // Logout
    const logoutAction = (e) => {
      e.preventDefault();
      Modal.confirm({
        title: 'Sign Out Confirmation',
        message: 'Are you sure you want to log out of the SRMS system? Your credentials will be cleared from this browser session.',
        confirmText: 'Sign Out',
        type: 'danger',
        onConfirm: () => {
          if (currentUser) {
            Storage.addActivity({
              type: 'logout',
              text: `<strong>${currentUser.fullName || currentUser.email}</strong> logged out`,
              userEmail: currentUser.email
            });
          }

          Storage.clearSession();
          Storage.clearRemember();
          currentUser = null;

          showAuthView('login');
          Toast.success('Signed Out', 'You have successfully signed out of your account.');
          
          // Clear login inputs
          const loginPass = document.getElementById('login-password');
          if (loginPass) loginPass.value = '';
        }
      });
    };

    document.getElementById('sidebar-logout')?.addEventListener('click', logoutAction);
    document.getElementById('dd-logout')?.addEventListener('click', logoutAction);
  };

  // ============================================================
  // THEME BINDINGS
  // ============================================================
  const applyTheme = (theme) => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    Storage.setTheme(theme);

    // Sync header toggle icon
    const themeIcon = document.getElementById('theme-icon');
    if (themeIcon) {
      themeIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    // Sync settings page toggle switches
    const adminToggle = document.getElementById('settings-theme-toggle');
    const studentToggle = document.getElementById('stu-settings-theme-toggle');
    if (adminToggle) adminToggle.checked = (theme === 'dark');
    if (studentToggle) studentToggle.checked = (theme === 'dark');
  };

  return {
    init,
    showAuthView,
    onLoginSuccess,
    updateUserHeaderAvatars,
  };
})();

// Bootstrap App
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
