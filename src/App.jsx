/**
 * App.jsx – Root SPA orchestrator: loading screen, routing, layout
 */
import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Toast from './components/Toast.jsx';
import Modal from './components/Modal.jsx';
import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';
import Login from './pages/Login.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import StudentDashboard from './pages/StudentDashboard.jsx';

/* ── Loading Screen ─────────────────────────────────────────── */
function LoadingScreen({ visible }) {
  return (
    <div id="loading-screen" className={`loading-screen${visible ? '' : ' fade-out'}`} style={{ display: visible ? undefined : 'none' }}>
      <div className="loading-logo">
        <div className="loading-icon"><i className="fas fa-graduation-cap"></i></div>
        <h1 className="loading-title">SRMS</h1>
        <p className="loading-subtitle">Student Registration &amp; Management System</p>
        <div className="loading-bar"><div className="loading-progress"></div></div>
      </div>
    </div>
  );
}

/* ── Inner App (needs AuthContext) ──────────────────────────── */
function InnerApp() {
  const { currentUser, loading } = useAuth();
  const [showLoader, setShowLoader] = useState(true);
  const [activeView, setActiveView] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchVal, setSearchVal] = useState('');

  // Hide loader after init
  useEffect(() => {
    if (!loading) {
      const t = setTimeout(() => setShowLoader(false), 400);
      return () => clearTimeout(t);
    }
  }, [loading]);

  // Set default view when user changes
  useEffect(() => {
    if (currentUser) {
      setActiveView(currentUser.role === 'admin' ? 'admin-dashboard' : 'student-dashboard');
      setMobileOpen(false);
    } else {
      setActiveView(null);
    }
  }, [currentUser?.email, currentUser?.role]);

  // Forward global search to AdminDashboard via window bridge
  useEffect(() => {
    if (window._adminSetSearch) window._adminSetSearch(searchVal);
  }, [searchVal]);

  const navigate = (view) => {
    setActiveView(view);
    setMobileOpen(false);
  };

  // Loading phase
  if (loading || showLoader) {
    return <LoadingScreen visible={true} />;
  }

  // Not logged in → show Login
  if (!currentUser) {
    return (
      <>
        <Toast />
        <Modal />
        <Login />
      </>
    );
  }

  // Logged in → full app layout
  return (
    <>
      <Toast />
      <Modal />
      <div id="app" className="app-root">
        <div id="page-app" className="page">
          <Sidebar
            activeView={activeView}
            onNavigate={navigate}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(c => !c)}
            mobileOpen={mobileOpen}
            onCloseMobile={() => setMobileOpen(false)}
          />
          <div className={`main-wrapper${sidebarCollapsed ? ' sidebar-collapsed' : ''}`} id="main-wrapper">
            <Header
              activeView={activeView}
              onNavigate={navigate}
              onMobileMenuOpen={() => setMobileOpen(true)}
              onSearch={(q) => { setSearchVal(q); navigate('admin-students'); }}
            />
            {currentUser.role === 'admin'
              ? <AdminDashboard activeView={activeView} onNavigate={navigate} />
              : <StudentDashboard activeView={activeView} onNavigate={navigate} />
            }
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Root Export ─────────────────────────────────────────────── */
export default function App() {
  return (
    <AuthProvider>
      <InnerApp />
    </AuthProvider>
  );
}
