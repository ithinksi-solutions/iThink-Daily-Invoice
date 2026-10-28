import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { OperatorTodayPage } from './pages/OperatorTodayPage';
import { AdminDailyPage } from './pages/AdminDailyPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminToolsPage } from './pages/AdminToolsPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { TaskMatrixHeader } from './modules/tasks/TaskMatrixHeader';
import { TaskAdminDesk } from './modules/tasks/TaskAdminDesk';
import { TaskWorkerDesk } from './modules/tasks/TaskWorkerDesk';
import { Loader2 } from 'lucide-react';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

export const App: React.FC = () => {
  const { user, role, loading } = useAuth();
  const [activeModule, setActiveModule] = useState<'billing' | 'tasks'>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'tasks' || params.get('module') === 'tasks') return 'tasks';
    return (localStorage.getItem('ithink_active_module') as 'billing' | 'tasks') || 'billing';
  });
  const [taskView, setTaskView] = useState<'tasks' | 'vault'>('tasks');
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

      // 2. If in TaskMatrix OS, return back to billing
      if (activeModule === 'tasks') {
        setActiveModule('billing');
        localStorage.setItem('ithink_active_module', 'billing');
        return;
      }

      // 3. If in Admin and not on daily, navigate back to daily tab
      if (role === 'admin' && adminTab !== 'daily') {
        setIsDrilldown(false);
        setAdminTab('daily');
        return;
      }

      // 4. Otherwise exit the application cleanly
      CapApp.exitApp();
    }).then((h) => {
      handler = h;
    });

    return () => {
      if (handler) handler.remove();
    };
  }, [role, adminTab, activeModule]);

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

  // TaskMatrix OS Terminal (Frontline Worker or Enterprise Admin)
  if (activeModule === 'tasks') {
    const isAdmin = role === 'admin';
    return (
      <div className="h-[100dvh] w-full min-h-[100dvh] overflow-hidden bg-[#07090E] text-slate-100 flex flex-col justify-between selection:bg-indigo-500/30 selection:text-cyan-300">
        <TaskMatrixHeader
          currentView={taskView}
          onViewChange={setTaskView}
          onBackToBilling={() => {
            setActiveModule('billing');
            localStorage.setItem('ithink_active_module', 'billing');
          }}
          isAdmin={isAdmin}
        />
        {isAdmin ? (
          <TaskAdminDesk currentView={taskView} />
        ) : (
          <TaskWorkerDesk />
        )}
      </div>
    );
  }

  // Operator / Collector view: locked to Today's screen with direct switch to Tasks
  if (role === 'collector') {
    return (
      <OperatorTodayPage
        onOpenTasks={() => {
          setActiveModule('tasks');
          localStorage.setItem('ithink_active_module', 'tasks');
        }}
      />
    );
  }

  // Admin routing helper
  const handleNavigateTab = (tab: 'daily' | 'dashboard' | 'tools' | 'users' | 'tasks') => {
    if (tab === 'tasks') {
      setActiveModule('tasks');
      localStorage.setItem('ithink_active_module', 'tasks');
      return;
    }
    setIsDrilldown(false);
    setAdminTab(tab);
  };

  // Admin routing
  if (adminTab === 'dashboard') {
    return (
      <AdminDashboardPage
        onNavigateTab={handleNavigateTab}
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
        onNavigateTab={handleNavigateTab}
      />
    );
  }

  if (adminTab === 'users') {
    return (
      <AdminUsersPage
        onNavigateTab={handleNavigateTab}
      />
    );
  }

  // Default Admin tab: Daily View
  return (
    <AdminDailyPage
      onNavigateTab={handleNavigateTab}
      initialDate={drilldownDate}
      isDrilldown={isDrilldown}
      onClearDrilldown={() => setIsDrilldown(false)}
    />
  );
};

export default App;
