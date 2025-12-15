
import React, { useEffect, useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, Users, TrendingUp, Sparkles, RefreshCw, Umbrella, CheckSquare, ArrowUpRight, Activity, CloudRain, Trophy, Map } from 'lucide-react';
import { generateBusinessInsights } from '../services/geminiService';
import { User, LeadStatus, WeatherAlert } from '../types';
import AICommandCenter from './AICommandCenter';
import { useStore } from '../lib/store';

const COLORS = ['#4f46e5', '#818cf8', '#a5b4fc', '#c7d2fe', '#6366f1'];

const StatCard = ({ title, value, sub, icon: Icon, colorClass }: any) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl ${colorClass} bg-opacity-10`}>
            <Icon size={22} className={colorClass.replace('bg-', 'text-')} />
        </div>
        <span className="text-xs font-medium bg-emerald-50 text-emerald-600 px-2 py-1 rounded-full flex items-center gap-1">
            <ArrowUpRight size={12}/> Live
        </span>
    </div>
    <h3 className="text-3xl font-bold text-slate-900 tracking-tight">{value}</h3>
    <div className="flex justify-between items-end mt-1">
        <p className="text-slate-500 text-sm font-medium">{title}</p>
        <p className="text-xs text-slate-400">{sub}</p>
    </div>
  </div>
);

interface DashboardProps {
  currentUser: User;
}

const Dashboard: React.FC<DashboardProps> = ({ currentUser }) => {
  const { leads, tasks, invoices } = useStore();
  const [insight, setInsight] = useState<string>("Analyzing your restoration pipeline...");
  const [loadingInsight, setLoadingInsight] = useState(true);

  // --- Real-Time Analytics ---
  const stats = useMemo(() => {
    const insuranceLeads = leads.filter(l => l.projectType === 'Insurance');
    const retailLeads = leads.filter(l => l.projectType === 'Retail');
    
    const insuranceVol = insuranceLeads.reduce((acc, curr) => acc + (curr.estimatedValue || 0), 0);
    const retailVol = retailLeads.reduce((acc, curr) => acc + (curr.estimatedValue || 0), 0);
    
    const activeClaims = leads.filter(l => [LeadStatus.CLAIM_FILED, LeadStatus.ADJUSTER_MEETING, LeadStatus.APPROVED].includes(l.status)).length;
    const pendingTasks = tasks.filter(t => t.status !== 'Done').length;

    // Source Data for Pie Chart
    const sources = leads.reduce((acc, lead) => {
        const src = lead.source || 'Other';
        acc[src] = (acc[src] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    
    const sourceChartData = Object.keys(sources).map(key => ({ name: key, value: sources[key] }));

    // Monthly Revenue (From Invoices)
    const revenueByMonth = new Array(6).fill(0); // Last 6 months
    const monthLabels: string[] = [];
    
    for(let i=5; i>=0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        monthLabels.push(d.toLocaleString('default', { month: 'short' }));
    }

    invoices.forEach(inv => {
        if(inv.status === 'Paid') {
            const date = new Date(inv.dateIssued);
            const now = new Date();
            const diffMonths = (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
            if(diffMonths >= 0 && diffMonths < 6) {
                // index 0 is 5 months ago, index 5 is current month
                revenueByMonth[5 - diffMonths] += inv.total;
            }
        }
    });

    const revenueChartData = monthLabels.map((label, idx) => ({
        name: label,
        revenue: revenueByMonth[idx]
    }));


    return { insuranceVol, retailVol, activeClaims, pendingTasks, sourceChartData, revenueChartData, totalLeads: leads.length };
  }, [leads, tasks, invoices]);

  // Mock Weather Data
  const weatherAlerts: WeatherAlert[] = [
    { id: '1', type: 'Hail', severity: 'High', location: 'North Springfield (1.5")', date: 'Today' },
    { id: '2', type: 'Wind', severity: 'Medium', location: 'West End (60mph)', date: 'Yesterday' }
  ];

  const fetchInsight = async () => {
    setLoadingInsight(true);
    // Use real stats for Gemini
    const aiStats = {
      insuranceVolume: stats.insuranceVol,
      activeClaims: stats.activeClaims,
      totalLeads: stats.totalLeads,
      pendingTasks: stats.pendingTasks
    };
    const result = await generateBusinessInsights(aiStats);
    setInsight(result);
    setLoadingInsight(false);
  };

  useEffect(() => {
    fetchInsight();
  }, [leads]); // Re-analyze when leads change

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
         <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
               Command Center
            </h1>
            <p className="text-slate-500 mt-2 text-lg">
               System Status • <span className="font-semibold text-slate-700">{currentUser.name}</span>
            </p>
         </div>
         <div className="text-right hidden md:block">
            <span className="text-sm font-medium text-slate-500">Today</span>
            <p className="text-slate-900 font-semibold">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
         </div>
      </div>

      {/* AI Analyst Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1E1B4B] via-[#312E81] to-[#4338CA] text-white shadow-xl shadow-indigo-900/20">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-indigo-500 opacity-20 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 rounded-full bg-purple-500 opacity-20 blur-3xl"></div>
        
        <div className="relative z-10 p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-inner shrink-0">
             <Sparkles className="text-indigo-200" size={28} />
          </div>
          <div className="flex-1 w-full">
            <h2 className="text-lg font-bold text-white mb-2 flex flex-wrap items-center gap-2">
               ALTUS Intelligence
               <span className="text-[10px] bg-indigo-500 px-2 py-0.5 rounded text-white/90 whitespace-nowrap">GEMINI 2.5</span>
            </h2>
            <p className="text-indigo-100 text-sm leading-relaxed max-w-3xl opacity-90">
              {loadingInsight ? "Connecting to Gemini 2.5..." : insight}
            </p>
          </div>
          <button 
            onClick={fetchInsight}
            disabled={loadingInsight}
            className="w-full md:w-auto group flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-indigo-900 hover:bg-indigo-50 rounded-lg text-sm font-semibold transition-all active:scale-95 disabled:opacity-70 shrink-0"
          >
            <RefreshCw size={16} className={`text-indigo-600 ${loadingInsight ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"}`} />
            Refresh Analysis
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard 
          title="Insurance Volume" 
          value={`$${stats.insuranceVol.toLocaleString()}`} 
          sub={`${stats.activeClaims} Active Claims`} 
          icon={Umbrella} 
          colorClass="bg-blue-500" 
        />
        <StatCard 
          title="Retail Revenue" 
          value={`$${stats.retailVol.toLocaleString()}`} 
          sub="Pipeline Value" 
          icon={DollarSign} 
          colorClass="bg-emerald-500" 
        />
        <StatCard 
          title="Total Leads" 
          value={stats.totalLeads} 
          sub="Active Pipeline" 
          icon={Users} 
          colorClass="bg-orange-500" 
        />
        <StatCard 
          title="Pending Tasks" 
          value={stats.pendingTasks} 
          sub="Action Items" 
          icon={CheckSquare} 
          colorClass="bg-purple-500" 
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Revenue & Weather */}
        <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="font-bold text-slate-800 text-lg">Financial Performance</h3>
                        <p className="text-xs text-slate-500">Collected Revenue (Last 6 Months)</p>
                    </div>
                </div>
                <div className="h-72 w-full flex items-center justify-center">
                     <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={stats.revenueChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                             <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                             <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                             <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(value) => `$${value/1000}k`} />
                             <Tooltip 
                                cursor={{fill: '#f8fafc'}} 
                                contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} 
                                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
                             />
                             <Bar dataKey="revenue" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={40} />
                         </BarChart>
                     </ResponsiveContainer>
                </div>
            </div>

            {/* Weather Widget */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 relative z-10 gap-2">
                    <div>
                        <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                             <CloudRain className="text-blue-500" size={20}/>
                             Recent Hail Activity
                        </h3>
                        <p className="text-xs text-slate-500">Based on doppler radar in your service area</p>
                    </div>
                    <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded animate-pulse whitespace-nowrap">LIVE ALERT</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                    <div className="space-y-3">
                         {weatherAlerts.map(alert => (
                             <div key={alert.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                                 <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shrink-0 ${alert.type === 'Hail' ? 'bg-indigo-500' : 'bg-blue-400'}`}>
                                     {alert.type === 'Hail' ? 'H' : 'W'}
                                 </div>
                                 <div>
                                     <p className="text-sm font-bold text-slate-800">{alert.type} Storm</p>
                                     <p className="text-xs text-slate-500">{alert.location} • {alert.date}</p>
                                 </div>
                             </div>
                         ))}
                    </div>
                    <div className="bg-slate-100 rounded-xl min-h-[120px] flex items-center justify-center border-2 border-dashed border-slate-200 text-slate-400 text-xs">
                         <Map className="mr-2" size={16}/> Simulated Radar Map Area
                    </div>
                </div>
            </div>
        </div>

        {/* Right Column: AI Command Center & Sources */}
        <div className="lg:col-span-1 space-y-6 flex flex-col">
            
            {/* AI Command Center */}
            <div className="flex-1 min-h-[400px]">
               <AICommandCenter />
            </div>

            {/* Pipeline Distribution */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col h-64">
                <h3 className="font-bold text-slate-800 text-lg mb-1">Lead Sources</h3>
                <div className="flex-1 w-full min-h-[100px]">
                    <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                        data={stats.sourceChartData}
                        innerRadius={40}
                        outerRadius={60}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                        >
                        {stats.sourceChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                        </Pie>
                        <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                    </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                    {stats.sourceChartData.slice(0, 4).map((d, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                            <div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length]}}></div>
                            {d.name}
                        </div>
                    ))}
                </div>
            </div>

        </div>

      </div>
      
    </div>
  );
};

export default Dashboard;