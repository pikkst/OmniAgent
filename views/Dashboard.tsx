
import React from 'react';
import { AppState, AgentModuleConfig } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';
import { Users, Mail, Share2, Target, Zap, DollarSign, Cpu, CheckCircle } from 'lucide-react';

const Dashboard: React.FC<{ state: AppState; updateState: (u: Partial<AppState>) => void }> = ({ state, updateState }) => {
  const stats = {
    new: state.leads.filter(l => l.status === 'new').length,
    contacted: state.leads.filter(l => l.status === 'contacted').length,
    replied: state.leads.filter(l => l.status === 'replied' || l.status === 'need_info').length,
    converted: state.leads.filter(l => l.status === 'converted').length,
  };

  const funnelData = [
    { name: 'Discovery', count: stats.new, fill: '#6366f1' },
    { name: 'Contacted', count: stats.contacted, fill: '#8b5cf6' },
    { name: 'Replied', count: stats.replied, fill: '#ec4899' },
    { name: 'Converted', count: stats.converted, fill: '#10b981' },
  ];

  const costData = state.agentConfigs.map(config => ({
    name: config.role,
    value: config.selectedModel.includes('pro') ? 1.5 : 0.15, // Simplified ratio for demo
    fill: config.role === 'Researcher' ? '#6366f1' : config.role === 'Copywriter' ? '#8b5cf6' : config.role === 'CRM' ? '#ec4899' : '#f59e0b'
  }));

  return (
    <div className="space-y-8">
      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Leads" value={state.leads.length.toString()} icon={<Users className="text-indigo-600" />} trend="+12%" />
        <StatCard title="Total API Spend" value={`$${state.totalSpend.toFixed(2)}`} icon={<DollarSign className="text-emerald-600" />} trend="Current" />
        <StatCard title="Memory Bank" value={`${state.knowledgeBase.length} Facts`} icon={<Share2 className="text-purple-600" />} trend="Learning" />
        <StatCard title="Agent Efficiency" value="98.2%" icon={<Cpu className="text-rose-600" />} trend="+0.4%" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Conversion Funnel */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
            <Target className="text-indigo-600" />
            Conversion Funnel
          </h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} />
                <Tooltip cursor={{fill: '#f8fafc'}} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {funnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Agent Cost Distribution */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
            <DollarSign className="text-emerald-600" />
            Agent Cost Distribution
          </h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={costData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                  {costData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 text-xs font-bold text-slate-500">
             {costData.map(c => (
               <div key={c.name} className="flex items-center gap-1">
                 <div className="w-2 h-2 rounded-full" style={{backgroundColor: c.fill}} />
                 {c.name}
               </div>
             ))}
          </div>
        </div>
      </div>

      {/* Active Modules Configuration */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
          <Cpu className="text-indigo-600" />
          Active Agent Modules & Tech Stack
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {state.agentConfigs.map(agent => (
            <div key={agent.role} className="p-5 border border-slate-100 rounded-xl bg-slate-50/50">
              <div className="flex justify-between items-start mb-3">
                <span className="font-black text-xs uppercase tracking-widest text-slate-400">{agent.role}</span>
                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${agent.selectedModel.includes('pro') ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {agent.selectedModel.split('-')[2].toUpperCase()} Tier
                </span>
              </div>
              <div className="font-bold text-slate-800 text-sm mb-3 truncate" title={agent.selectedModel}>{agent.selectedModel}</div>
              <div className="space-y-1.5">
                {agent.modules.map(mod => (
                  <div key={mod} className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                    <CheckCircle size={10} className="text-emerald-500" />
                    {mod}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Activity Log */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-lg font-bold">Autonomous Agent Log</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {state.leads.length > 0 ? (
             state.leads.slice(0, 5).map(lead => (
               <ActivityItem 
                  key={lead.id}
                  agent={lead.status === 'new' ? "Researcher" : "CRM"} 
                  action={`${lead.status === 'new' ? 'Found' : 'Monitoring'} ${lead.company} (${lead.language})`} 
                  time="Recently" 
                  color={lead.status === 'new' ? "bg-indigo-500" : "bg-emerald-500"}
               />
             ))
          ) : (
            <div className="p-8 text-center text-slate-400 italic">No activity yet. Start by finding leads.</div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; trend: string }> = ({ title, value, icon, trend }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
    <div className="flex justify-between items-start mb-4">
      <div className="p-2 bg-slate-50 rounded-lg">{icon}</div>
      <span className={`text-xs font-bold px-2 py-1 rounded-full ${trend.startsWith('+') ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-600'}`}>
        {trend}
      </span>
    </div>
    <div className="text-2xl font-bold text-slate-900">{value}</div>
    <div className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">{title}</div>
  </div>
);

const ActivityItem: React.FC<{ agent: string; action: string; time: string; color: string }> = ({ agent, action, time, color }) => (
  <div className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
    <div className={`w-1.5 h-10 rounded-full ${color}`} />
    <div className="flex-1">
      <div className="flex justify-between">
        <span className="font-bold text-slate-800 text-sm">{agent} Agent</span>
        <span className="text-[10px] font-bold text-slate-400 uppercase">{time}</span>
      </div>
      <p className="text-sm text-slate-600">{action}</p>
    </div>
  </div>
);

export default Dashboard;
