import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { OperatorTodayPage } from './pages/OperatorTodayPage';
import { AdminDailyPage } from './pages/AdminDailyPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { Loader2 } from 'lucide-react';

export const App: React.FC = () => {
  const { user, role, loading } = useAuth();
  const [adminTab, setAdminTab] = useState<'daily' | 'dashboard' | 'users'>('daily');
  const [drilldownDate, setDrilldownDate] = useState<string | undefined>(undefined);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        <span className="text-xs text-slate-400 font-mono tracking-wider">
          Initializing Fortune-5 Collection Tracker...
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
        onNavigateTab={setAdminTab}
        onSelectDate={(dStr) => {
          setDrilldownDate(dStr);
          setAdminTab('daily');
        }}
      />
    );
  }

  if (adminTab === 'users') {
    return <AdminUsersPage onNavigateTab={setAdminTab} />;
  }

  // Default Admin tab: Daily View
  return (
    <AdminDailyPage
      onNavigateTab={setAdminTab}
      initialDate={drilldownDate}
    />
  );
};

export default App;
