import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomeView } from './views/HomeView';
import { CatalogView } from './views/CatalogView';
import { AppDetailsView } from './views/AppDetailsView';
import { AboutView } from './views/AboutView';
import { ContactView } from './views/ContactView';
import { AdminView } from './views/AdminView';
import { DownloadModal } from './components/DownloadModal';
import { SetupGuideModal } from './components/SetupGuideModal';
import { AppListing } from './types';
import { fetchApps, checkAdminStatus, adminLogout } from './api';

export default function App() {
  const [currentView, setCurrentView] = useState<string>('home');
  const [apps, setApps] = useState<AppListing[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [downloadingApp, setDownloadingApp] = useState<AppListing | null>(null);
  
  // Admin authentication state
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [hasConfiguredPassword, setHasConfiguredPassword] = useState<boolean>(true);

  // Setup Guide modal
  const [isDeployGuideOpen, setIsDeployGuideOpen] = useState<boolean>(false);

  // Fetch apps from server
  const loadApps = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await fetchApps();
      setApps(data);
    } catch (err) {
      console.error('Failed to load apps:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check initial admin session status
  const checkAuth = useCallback(async () => {
    try {
      const status = await checkAdminStatus();
      setIsAdminAuthenticated(status.isAuthenticated);
      setHasConfiguredPassword(status.hasConfiguredPassword);
    } catch (err) {
      console.error('Failed to verify admin status:', err);
    }
  }, []);

  useEffect(() => {
    loadApps();
    checkAuth();

    // Support browser back/forward buttons with simple hash
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash.startsWith('app/')) {
        const id = hash.replace('app/', '');
        setSelectedAppId(id);
        setCurrentView('app-details');
      } else if (['home', 'catalog', 'about', 'contact', 'admin'].includes(hash)) {
        setCurrentView(hash);
      }
    };

    if (window.location.hash) {
      handleHashChange();
    }

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [loadApps, checkAuth]);

  // Navigation handler
  const handleNavigate = (view: string, params?: Record<string, string>) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (params?.category !== undefined) {
      setSelectedCategory(params.category);
    }
    if (view === 'home' || view === 'catalog' || view === 'about' || view === 'contact' || view === 'admin') {
      window.location.hash = view;
      setCurrentView(view);
    }
  };

  // Select single app
  const handleSelectApp = (id: string) => {
    setSelectedAppId(id);
    window.location.hash = `app/${id}`;
    setCurrentView('app-details');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Download Trigger
  const handleQuickDownload = (app: AppListing) => {
    setDownloadingApp(app);
  };

  // Handle successful login
  const handleAuthSuccess = () => {
    setIsAdminAuthenticated(true);
    setHasConfiguredPassword(true);
    loadApps();
  };

  // Handle admin logout
  const handleLogout = async () => {
    await adminLogout();
    setIsAdminAuthenticated(false);
    handleNavigate('home');
  };

  // App details data
  const selectedApp = apps.find((a) => a.id === selectedAppId);
  const relatedApps = selectedApp
    ? apps.filter((a) => a.category === selectedApp.category && a.id !== selectedApp.id)
    : [];

  return (
    <div className="min-h-screen flex flex-col bg-[#f7f4ee] text-[#281e16] selection:bg-[#d8c5b0] selection:text-[#281e16]">
      
      {/* Navigation Header */}
      <Navbar
        currentView={currentView}
        onNavigate={handleNavigate}
        isAdminAuthenticated={isAdminAuthenticated}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Main View Router */}
      <main className="flex-1 w-full">
        {currentView === 'home' && (
          <HomeView
            apps={apps}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onNavigate={handleNavigate}
            onSelectApp={handleSelectApp}
            onQuickDownload={handleQuickDownload}
            isLoading={isLoading}
          />
        )}

        {currentView === 'catalog' && (
          <CatalogView
            apps={apps}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSelectApp={handleSelectApp}
            onQuickDownload={handleQuickDownload}
            onNavigate={handleNavigate}
            isLoading={isLoading}
          />
        )}

        {currentView === 'app-details' && (
          selectedApp ? (
            <AppDetailsView
              app={selectedApp}
              relatedApps={relatedApps}
              onSelectApp={handleSelectApp}
              onDownload={handleQuickDownload}
              onNavigate={handleNavigate}
            />
          ) : (
            <div className="max-w-md mx-auto py-20 px-4 text-center space-y-4">
              <h2 className="text-xl font-bold text-[#281e16]">App Not Found</h2>
              <p className="text-xs text-[#705e4f]">
                This app may have been moved or removed.
              </p>
              <button
                onClick={() => handleNavigate('catalog')}
                className="px-4 py-2 rounded-xl bg-[#6b4423] hover:bg-[#543318] text-[#fdfcf9] text-xs font-semibold shadow-sm transition-colors"
              >
                Browse All Apps
              </button>
            </div>
          )
        )}

        {currentView === 'about' && (
          <AboutView 
            onNavigate={handleNavigate} 
            onOpenDeployGuide={() => setIsDeployGuideOpen(true)} 
          />
        )}

        {currentView === 'contact' && (
          <ContactView />
        )}

        {currentView === 'admin' && (
          <AdminView
            apps={apps}
            isAuthenticated={isAdminAuthenticated}
            hasConfiguredPassword={hasConfiguredPassword}
            onRefreshApps={loadApps}
            onAuthSuccess={handleAuthSuccess}
            onLogout={handleLogout}
            onSelectApp={handleSelectApp}
            onOpenDeployGuide={() => setIsDeployGuideOpen(true)}
          />
        )}
      </main>

      {/* Footer */}
      <Footer
        onNavigate={handleNavigate}
        onOpenDeployGuide={() => setIsDeployGuideOpen(true)}
      />

      {/* Download Action Modal */}
      <DownloadModal
        app={downloadingApp}
        onClose={() => setDownloadingApp(null)}
        onDownloaded={(appId) => {
          // Increment locally in app state
          setApps((prev) =>
            prev.map((a) => (a.id === appId ? { ...a, downloadsCount: (a.downloadsCount || 0) + 1 } : a))
          );
        }}
      />

      {/* Setup & Firebase Deployment Guide Modal */}
      <SetupGuideModal
        isOpen={isDeployGuideOpen}
        onClose={() => setIsDeployGuideOpen(false)}
      />

    </div>
  );
}
