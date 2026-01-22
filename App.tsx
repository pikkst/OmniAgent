
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Send, 
  Database, 
  Settings, 
  BrainCircuit, 
  BarChart3,
  Mail,
  LogOut
} from 'lucide-react';
import Dashboard from './views/Dashboard';
import LeadFinder from './views/LeadFinder';
import Campaigns from './views/Campaigns';
import KnowledgeBase from './views/KnowledgeBase';
import CRM from './views/CRM';
import SettingsView from './views/SettingsView';
import EmailTemplatesView from './views/EmailTemplatesView';
import OAuthCallback from './views/OAuthCallback';
import { AuthView } from './views/AuthView';
import { AppState, AgentModuleConfig } from './types';
import { loadAllData } from './services/supabase';
import { startScheduledPostsProcessor } from './services/scheduler';
import { authService } from './services/auth';

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [state, setState] = useState<AppState>({
    websiteUrl: '',
    businessContext: '',
    knowledgeBase: [],
    leads: [],
    posts: [],
    integrations: [],
    agentConfigs: [],
    totalSpend: 0,
    totalTokensUsed: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      } catch (err) {
        console.error('Auth check failed:', err);
        setUser(null);
      } finally {
        setCheckingAuth(false);
      }
    };
    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = authService.onAuthStateChange((user) => {
      setUser(user);
      if (user) {
        // Reload data when user logs in
        loadData();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load data from Supabase on mount
  const loadData = async () => {
    try {
      const data = await loadAllData();
      setState(data);
    } catch (err) {
      console.error('Failed to load data from Supabase:', err);
      setError('Failed to connect to database. Please check your configuration.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  // Start scheduled posts processor
  useEffect(() => {
    // Start processing scheduled posts every minute
    const stopProcessor = startScheduledPostsProcessor(60000);
    
    // Cleanup on unmount
    return () => stopProcessor();
  }, []);

  const updateState = (updates: Partial<AppState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const handleLogout = async () => {
    try {
      await authService.signOut();
      setUser(null);
      setState({
        websiteUrl: '',
        businessContext: '',
        knowledgeBase: [],
        leads: [],
        posts: [],
        integrations: [],
        agentConfigs: [],
        totalSpend: 0,
        totalTokensUsed: 0
      });
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <BrainCircuit className="w-12 h-12 text-indigo-600 animate-pulse mx-auto mb-4" />
          <p className="text-slate-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthView />;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <BrainCircuit className="w-12 h-12 text-indigo-600 animate-pulse mx-auto mb-4" />
          <p className="text-slate-600">Loading OmniAgent...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center bg-white p-8 rounded-2xl shadow-lg max-w-md">
          <div className="text-red-600 mb-4">⚠️</div>
          <h2 className="text-xl font-bold mb-2">Connection Error</h2>
          <p className="text-slate-600 mb-4">{error}</p>
          <p className="text-sm text-slate-500">Please update your .env file with valid Supabase credentials and refresh.</p>
        </div>
      </div>
    );
  }

  return (
    <HashRouter>
      <div className="flex min-h-screen bg-slate-50">
        <aside className="w-64 bg-slate-900 text-white flex flex-col sticky top-0 h-screen">
          <div className="p-6 flex items-center gap-3 border-b border-slate-800">
            <div className="bg-indigo-500 p-2 rounded-lg">
              <BrainCircuit className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">OmniAgent</span>
          </div>
          <nav className="flex-1 p-4 space-y-1">
            <SidebarLink to="/" icon={<LayoutDashboard size={20} />} label="Dashboard" />
            <SidebarLink to="/leads" icon={<Users size={20} />} label="Lead Finder" />
            <SidebarLink to="/campaigns" icon={<Send size={20} />} label="Campaigns" />
            <SidebarLink to="/templates" icon={<Mail size={20} />} label="Email Templates" />
            <SidebarLink to="/crm" icon={<BarChart3 size={20} />} label="CRM & Analytics" />
            <SidebarLink to="/knowledge" icon={<Database size={20} />} label="Memory Bank" />
          </nav>
          <div className="p-4 border-t border-slate-800">
            <SidebarLink to="/settings" icon={<Settings size={20} />} label="Settings" />
          </div>
        </aside>

        <main className="flex-1 overflow-auto">
          <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10">
            <h1 className="text-lg font-semibold text-slate-800">Autonomous Marketing Cloud</h1>
            <div className="flex items-center gap-6">
              <div className="flex gap-2">
                {state.integrations.map(int => (
                  <div key={int.id} title={`${int.name}: ${int.isConnected ? 'Connected' : 'Offline'}`} 
                    className={`w-2 h-2 rounded-full ${int.isConnected ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                ))}
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-600">{user?.email}</span>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Sign out"
                >
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </header>
          <div className="p-8">
            <Routes>
              <Route path="/" element={<Dashboard state={state} updateState={updateState} />} />
              <Route path="/leads" element={<LeadFinder state={state} updateState={updateState} />} />
              <Route path="/campaigns" element={<Campaigns state={state} updateState={updateState} />} />
              <Route path="/templates" element={<EmailTemplatesView />} />
              <Route path="/crm" element={<CRM state={state} updateState={updateState} />} />
              <Route path="/knowledge" element={<KnowledgeBase state={state} updateState={updateState} />} />
              <Route path="/settings" element={<SettingsView state={state} updateState={updateState} />} />
              <Route path="/oauth-callback" element={<OAuthCallback />} />
            </Routes>
          </div>
        </main>
      </div>
    </HashRouter>
  );
};

const SidebarLink: React.FC<{ to: string; icon: React.ReactNode; label: string }> = ({ to, icon, label }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link to={to} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
      {icon}
      <span className="font-medium">{label}</span>
    </Link>
  );
};

export default App;
