import React, { useState, useEffect } from 'react';
import type { Application } from './types';
import { api, getAuthToken } from './services/api';
import { Header } from './components/common/Header';
import { Footer } from './components/common/Footer';
import { HomePage } from './pages/HomePage';
import { AppsPage } from './pages/AppsPage';
import { AppDetailPage } from './pages/AppDetailPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { AboutPage } from './pages/AboutPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';

export default function App() {
  // Current route pathname
  const [currentPath, setCurrentPath] = useState<string>(() => {
    // Check hash first (for iframe support), then window.location.pathname
    if (window.location.hash && window.location.hash.startsWith('#/')) {
      return window.location.hash.slice(1);
    }
    return window.location.pathname || '/';
  });

  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [authChecked, setAuthChecked] = useState<boolean>(false);

  // Check admin status on load
  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    const token = await getAuthToken();
    if (token) {
      const res = await api.checkAdminStatus();
      setIsAdmin(res.authenticated);
    } else {
      setIsAdmin(false);
    }
    setAuthChecked(true);
  };

  // Sync route on popstate / hashchange
  useEffect(() => {
    const handlePopState = () => {
      if (window.location.hash && window.location.hash.startsWith('#/')) {
        setCurrentPath(window.location.hash.slice(1));
      } else {
        setCurrentPath(window.location.pathname || '/');
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, []);

  // Handle URL changes
  const navigate = (path: string) => {
    setCurrentPath(path);
    // Push both browser history and hash for seamless compatibility in iframes and static servers
    try {
      window.history.pushState(null, '', path);
    } catch {
      // ignore
    }
    window.location.hash = `#${path}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // If path is `/app/:slug`, load app details if not loaded
  useEffect(() => {
    if (currentPath.startsWith('/app/')) {
      const slug = currentPath.replace('/app/', '').split('?')[0];
      if (slug && (!selectedApp || selectedApp.slug !== slug)) {
        api.getAppBySlug(slug)
          .then((app) => setSelectedApp(app))
          .catch((err) => {
            console.warn('Could not load app with slug:', slug, err);
          });
      }
    }
  }, [currentPath]);

  // Navigate to single app detail page
  const handleSelectApp = (app: Application) => {
    setSelectedApp(app);
    navigate(`/app/${app.slug}`);
  };

  // Navigate to category page
  const handleSelectCategory = (cat: string) => {
    setSelectedCategory(cat);
    navigate('/apps');
  };

  // Render current view
  const renderView = () => {
    if (currentPath === '/admin') {
      if (!isAdmin) {
        return (
          <AdminLoginPage
            onLoginSuccess={() => {
              setIsAdmin(true);
              navigate('/admin');
            }}
            onCancel={() => navigate('/')}
          />
        );
      }
      return (
        <AdminDashboardPage
          onExitAdmin={() => navigate('/')}
          onViewPublicApp={handleSelectApp}
        />
      );
    }

    if (currentPath === '/admin/login') {
      return (
        <AdminLoginPage
          onLoginSuccess={() => {
            setIsAdmin(true);
            navigate('/admin');
          }}
          onCancel={() => navigate('/')}
        />
      );
    }

    if (currentPath.startsWith('/app/')) {
      if (selectedApp) {
        return (
          <AppDetailPage
            app={selectedApp}
            onBack={() => navigate('/apps')}
            onSelectCategory={handleSelectCategory}
          />
        );
      }
      return (
        <div className="py-20 text-center text-sm text-[#736555] dark:text-[#8e8273]">
          Loading application details...
        </div>
      );
    }

    if (currentPath.startsWith('/apps')) {
      return (
        <AppsPage
          onSelectApp={handleSelectApp}
          initialCategory={selectedCategory}
        />
      );
    }

    if (currentPath === '/categories') {
      return (
        <CategoriesPage
          onSelectCategory={(cat) => {
            setSelectedCategory(cat);
            navigate('/apps');
          }}
        />
      );
    }

    if (currentPath === '/about') {
      return <AboutPage />;
    }

    // Default: Home
    return (
      <HomePage
        onSelectApp={handleSelectApp}
        onNavigate={navigate}
      />
    );
  };

  const isAdminDashboard = currentPath === '/admin' && isAdmin;

  return (
    <div className="min-h-screen flex flex-col font-sans transition-colors duration-200 bg-[#f9f5ee] text-[#1c1713] dark:bg-[#121110] dark:text-[#f8f5ee]">
      {/* Header */}
      {!isAdminDashboard && (
        <Header
          currentPath={currentPath}
          onNavigate={navigate}
          isAdmin={isAdmin}
        />
      )}

      {/* Main Page Content */}
      <main className={`flex-1 ${isAdminDashboard ? 'p-4 sm:p-6 max-w-7xl w-full mx-auto' : 'max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4'}`}>
        {renderView()}
      </main>

      {/* Footer */}
      {!isAdminDashboard && (
        <Footer onNavigate={navigate} />
      )}
    </div>
  );
}
