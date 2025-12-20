import React, { useEffect, useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { 
    DollarSign, Users, Sparkles, RefreshCw, Umbrella, CheckSquare, 
    ArrowUpRight, CloudRain, Map, Wind, ThermometerSun, AlertTriangle, Droplets
} from 'lucide-react';
import { generateBusinessInsights } from '../services/geminiService';
import { User, LeadStatus } from '../types';
import AICommandCenter from './AICommandCenter';
import { useStore } from '../lib/store';

const COLORS = ['#4f46e5', '#818cf8', '#a5b4fc', '#c7d2fe', '#6366f1'];

// --- Weather Types ---
interface WeatherData {
    current: {
        temp: number;
        windSpeed: number;
        conditionCode: number;
    };
    daily: {
        date: string;
        maxTemp: number;
        minTemp: number;
        rainChance: number;
        maxWind: number;
    }[];
    loading: boolean;
    error: string | null;
}

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
  
  // Weather State
  const [weather, setWeather] = useState<WeatherData>({
      current: { temp: 0, windSpeed: 0, conditionCode: 0 },
      daily: [],
      loading: true,
      error: null
  });

  // --- Real-Time Analytics ---
  const stats = useMemo(() => {
    const insuranceLeads = leads.filter(l => l.projectType === 'Insurance' || l.source === 'Storm');
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

  // --- Fetch Weather ---
  useEffect(() => {
      const getCoords = async () => {
          if (!navigator.geolocation) {
              setWeather(prev => ({...prev, loading: false, error: "Geolocation not supported"}));
              return;
          }
          navigator.geolocation.getCurrentPosition(async (position) => {
              try {
                  const lat = position.coords.latitude;
                  const lon = position.coords.longitude;
                  
                  // Using Open-Meteo for Roofing Data (Wind Gusts & Rain)
                  const res = await fetch(
                      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_gusts_10m_max&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=auto`
                  );
                  
                  if(!res.ok) throw new Error("Failed to fetch weather");
                  
                  const data = await res.json();
                  
                  const dailyData = data.daily.time.slice(0, 3).map((time: string, index: number) => ({
                      date: new Date(time).toLocaleDateString('en-US', { weekday: 'short' }),
                      maxTemp: Math.round(data.daily.temperature_2m_max[index]),
                      minTemp: Math.round(data.daily.temperature_2m_min[index]),
                      rainChance: data.daily.precipitation_probability_max[index],
                      maxWind: Math.round(data.daily.wind_gusts_10m_max[index])
                  }));

                  setWeather({
                      current: {
                          temp: Math.round(data.current.temperature_2m),
                          windSpeed: Math.round(data.current.wind_speed_10m),
                          conditionCode: data.current.weather_code
                      },
                      daily: dailyData,
                      loading: false,
                      error: null
                  });

              } catch (err) {
                  console.error(err);
                  setWeather(prev => ({...prev, loading: false, error: "Weather unavailable"}));
              }
          }, (err) => {
              setWeather(prev => ({...prev, loading: false, error: "Location access denied"}));
          });
      };

      getCoords();
  }, []);

  const fetchInsight = async () => {
    setLoadingInsight(true);
    try {
      const aiStats = {
        insuranceVolume: stats.insuranceVol,
        activeClaims: stats.activeClaims,
        totalLeads: stats.totalLeads,
        pendingTasks: stats.pendingTasks
      };
      const result = await generateBusinessInsights(aiStats);
      setInsight(result);
    } catch (error) {
      console.error('Insight Error:', error);
      setInsight("AI insights temporarily unavailable.");
    } finally {
      setLoadingInsight(false);
    }
  };

  useEffect(() => {
    fetchInsight();
  }, [leads]);

  // Helper to interpret weather codes
  const getWeatherIcon = (code: number) => {
      if(code <= 3) return <ThermometerSun className="text-orange-500" size={20}/>;
      if(code >= 51 && code <= 67) return <CloudRain className="text-blue-500" size={20}/>;
      if(code >= 95) return <AlertTriangle className="text-red-500" size={20}/>; // Storm
      return <Wind className="text-slate-400" size={20}/>;
  };

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
               RAFTER Intelligence
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

            {/* REAL-TIME WEATHER WIDGET */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 relative z-10 gap-2">
                    <div>
                        <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                             <CloudRain className="text-blue-600" size={20}/>
                             Roofing Weather Intelligence
                        </h3>
                        <p className="text-xs text-slate-500">Live conditions & 3-day risk forecast</p>
                    </div>
                    {weather.loading ? (
                        <span className="text-xs text-slate-400 animate-pulse">Scanning local doppler...</span>
                    ) : (
                        <div className="flex items-center gap-3">
                            <span className="text-3xl font-bold text-slate-900">{weather.current.temp}°</span>
                            <div className="text-xs text-slate-500 text-right">
                                <p className="font-bold flex items-center gap-1"><Wind size={10}/> {weather.current.windSpeed} mph</p>
                                <p>Current Wind</p>
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Weather Grid */}
                {!weather.loading && !weather.error ? (
                    <div className="grid grid-cols-3 gap-4 relative z-10">
                        {weather.daily.map((day, i) => (
                            <div key={i} className={`p-4 rounded-xl border ${day.maxWind > 35 || day.rainChance > 50 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100'} flex flex-col gap-2`}>
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-slate-700 text-sm">{i === 0 ? 'Today' : day.date}</span>
                                    {getWeatherIcon(weather.current.conditionCode)}
                                </div>
                                
                                {/* Wind Risk */}
                                <div className="mt-1">
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-slate-500 flex items-center gap-1"><Wind size={10}/> Gusts</span>
                                        <span className={`font-bold ${day.maxWind > 35 ? 'text-red-600' : 'text-slate-700'}`}>{day.maxWind} mph</span>
                                    </div>
                                    {/* Progress Bar for Wind (Max 60mph) */}
                                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full ${day.maxWind > 40 ? 'bg-red-500' : day.maxWind > 25 ? 'bg-amber-400' : 'bg-emerald-400'}`} 
                                            style={{width: `${Math.min(day.maxWind / 60 * 100, 100)}%`}}
                                        ></div>
                                    </div>
                                </div>

                                {/* Rain Risk */}
                                <div>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-slate-500 flex items-center gap-1"><Droplets size={10}/> Precip</span>
                                        <span className={`font-bold ${day.rainChance > 40 ? 'text-blue-600' : 'text-slate-700'}`}>{day.rainChance}%</span>
                                    </div>
                                </div>

                                {day.maxWind > 40 && (
                                    <div className="mt-2 text-[10px] font-bold text-red-600 bg-red-100 px-2 py-1 rounded flex items-center gap-1 justify-center">
                                        <AlertTriangle size={10}/> STORM RISK
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="h-32 flex items-center justify-center text-slate-400 text-sm bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        {weather.error || "Loading Weather Data..."}
                    </div>
                )}
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