import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { OperatorTodayPage } from './pages/OperatorTodayPage';
import { AdminDailyPage } from './pages/AdminDailyPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminToolsPage } from './pages/AdminToolsPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { Loader2 } from 'lucide-react';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

export const App: React.FC = () => {
  const { user, role, loading } = useAuth();
  const [adminTab, setAdminTab] = useState<'daily' | 'dashboard' | 'tools' | 'users'>('daily');
  const [drilldownDate, setDrilldownDate] = useState<string | undefined>(undefined);
  const [isDrilldown, setIsDrilldown] = useState<boolean>(false);

  // Hardware Android Back Button Handler
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let handler: any = null;
    CapApp.addListener('backButton', () => {
      // 1. Check if any active modal or lightbox consumes the back event
      const modalEvent = new CustomEvent('dismissActiveModal', { cancelable: true });
      const handled = !window.dispatchEvent(modalEvent);
      if (handled) return;

      // 2. If in Admin and not on daily, navigate back to daily tab
      if (role === 'admin' && adminTab !== 'daily') {
        setIsDrilldown(false);
        setAdminTab('daily');
        return;
      }

      // 3. Otherwise exit the application cleanly
      CapApp.exitApp();
    }).then((h) => {
      handler = h;
    });

    return () => {
      if (handler) handler.remove();
    };
  }, [role, adminTab]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        <span className="text-xs text-slate-400 font-mono tracking-wider">
          Initializing Collection Tracker...
        </span>
      </div>
    );
  }

  // If not logged in, render the login page
  if (!user) {
    return <LoginPage />;
  }

  // If Operator / Collector, strictly locked to Today's screen (no date picker/history)
  if (role === 'collector') {
    return <OperatorTodayPage />;
  }

  // Admin routing
  if (adminTab === 'dashboard') {
    return (
      <AdminDashboardPage
        onNavigateTab={(tab) => {
          setIsDrilldown(false);
          setAdminTab(tab);
        }}
        onSelectDate={(dStr) => {
          setDrilldownDate(dStr);
          setIsDrilldown(true);
          setAdminTab('daily');
        }}
      />
    );
  }

  if (adminTab === 'tools') {
    return (
      <AdminToolsPage
        onNavigateTab={(tab) => {
          setIsDrilldown(false);
          setAdminTab(tab);
        }}
      />
    );
  }

  if (adminTab === 'users') {
    return (
      <AdminUsersPage
        onNavigateTab={(tab) => {
          setIsDrilldown(false);
          setAdminTab(tab);
        }}
      />
    );
  }

  // Default Admin tab: Daily View
  return (
    <AdminDailyPage
      onNavigateTab={(tab) => {
        setIsDrilldown(false);
        setAdminTab(tab);
      }}
      initialDate={drilldownDate}
      isDrilldown={isDrilldown}
      onClearDrilldown={() => setIsDrilldown(false)}
    />
  );
};

export default App;
