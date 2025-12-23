import React, { useState, useEffect } from 'react';
import { User, Lead, Task } from '../types';
import { ArrowLeft, TrendingUp, DollarSign, CheckCircle, ListTodo, BarChart3, Target } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface UserAnalyticsProps {
  user: User;
  onBack: () => void;
}

interface UserMetrics {
  totalLeads: number;
  totalValue: number;
  closedDeals: number;
  closedValue: number;
  activeTasks: number;
  completedTasks: number;
  leadsByStatus: { status: string; count: number }[];
  conversionRate: number;
}

const STATUS_COLORS = {
  'New Lead': '#3b82f6',
  'Inspection': '#8b5cf6',
  'Claim Filed': '#f59e0b',
  'Adjuster Mtg': '#ec4899',
  'Approved': '#10b981',
  'Production': '#06b6d4',
  'Supplementing': '#f97316',
  'Closed': '#22c55e'
};

const UserAnalytics: React.FC<UserAnalyticsProps> = ({ user, onBack }) => {
  const [metrics, setMetrics] = useState<UserMetrics>({
    totalLeads: 0,
    totalValue: 0,
    closedDeals: 0,
    closedValue: 0,
    activeTasks: 0,
    completedTasks: 0,
    leadsByStatus: [],
    conversionRate: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserMetrics();
  }, [user.id]);

  const fetchUserMetrics = async () => {
    try {
      setLoading(true);

      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .eq('assigned_to', user.id);

      if (leadsError) throw leadsError;

      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('assigned_to', user.id);

      if (tasksError) throw tasksError;

      const totalLeads = leads?.length || 0;
      const totalValue = leads?.reduce((sum, lead) => sum + (Number(lead.estimated_value) || 0), 0) || 0;
      const closedLeads = leads?.filter(lead => lead.status === 'Closed') || [];
      const closedDeals = closedLeads.length;
      const closedValue = closedLeads.reduce((sum, lead) => sum + (Number(lead.estimated_value) || 0), 0);
      const activeTasks = tasks?.filter(task => task.status !== 'Done').length || 0;
      const completedTasks = tasks?.filter(task => task.status === 'Done').length || 0;

      const statusCounts: Record<string, number> = {};
      leads?.forEach(lead => {
        statusCounts[lead.status] = (statusCounts[lead.status] || 0) + 1;
      });

      const leadsByStatus = Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count
      }));

      const conversionRate = totalLeads > 0 ? (closedDeals / totalLeads) * 100 : 0;

      setMetrics({
        totalLeads,
        totalValue,
        closedDeals,
        closedValue,
        activeTasks,
        completedTasks,
        leadsByStatus,
        conversionRate
      });
    } catch (error) {
      console.error('Error fetching user metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{user.name} - Performance Analytics</h2>
          <p className="text-slate-500">{user.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600 text-sm font-medium">Total Leads</span>
            <Target className="text-blue-600" size={20} />
          </div>
          <div className="text-3xl font-bold text-slate-900">{metrics.totalLeads}</div>
          <div className="text-sm text-slate-500 mt-1">Assigned leads</div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600 text-sm font-medium">Pipeline Value</span>
            <DollarSign className="text-green-600" size={20} />
          </div>
          <div className="text-3xl font-bold text-slate-900">${metrics.totalValue.toLocaleString()}</div>
          <div className="text-sm text-slate-500 mt-1">Total estimated value</div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600 text-sm font-medium">Closed Deals</span>
            <CheckCircle className="text-green-600" size={20} />
          </div>
          <div className="text-3xl font-bold text-slate-900">{metrics.closedDeals}</div>
          <div className="text-sm text-green-600 mt-1">${metrics.closedValue.toLocaleString()} revenue</div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600 text-sm font-medium">Conversion Rate</span>
            <TrendingUp className="text-blue-600" size={20} />
          </div>
          <div className="text-3xl font-bold text-slate-900">{metrics.conversionRate.toFixed(1)}%</div>
          <div className="text-sm text-slate-500 mt-1">Leads to closed</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <BarChart3 size={20} className="text-blue-600" />
            Leads by Status
          </h3>
          {metrics.leadsByStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics.leadsByStatus}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="status"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  tick={{ fontSize: 12 }}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-slate-500 py-12">No leads assigned yet</div>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <ListTodo size={20} className="text-green-600" />
            Task Performance
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div>
                <div className="text-sm text-green-700 font-medium">Completed Tasks</div>
                <div className="text-2xl font-bold text-green-900">{metrics.completedTasks}</div>
              </div>
              <CheckCircle className="text-green-600" size={32} />
            </div>
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div>
                <div className="text-sm text-blue-700 font-medium">Active Tasks</div>
                <div className="text-2xl font-bold text-blue-900">{metrics.activeTasks}</div>
              </div>
              <ListTodo className="text-blue-600" size={32} />
            </div>
            {(metrics.completedTasks + metrics.activeTasks) > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <div className="text-sm text-slate-600 mb-2">Completion Rate</div>
                <div className="w-full bg-slate-200 rounded-full h-3">
                  <div
                    className="bg-green-600 h-3 rounded-full transition-all"
                    style={{
                      width: `${((metrics.completedTasks / (metrics.completedTasks + metrics.activeTasks)) * 100).toFixed(1)}%`
                    }}
                  ></div>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {((metrics.completedTasks / (metrics.completedTasks + metrics.activeTasks)) * 100).toFixed(1)}% tasks completed
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {metrics.leadsByStatus.length > 0 && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-semibold text-lg mb-4">Lead Status Distribution</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {metrics.leadsByStatus.map(item => (
              <div key={item.status} className="p-4 bg-slate-50 rounded-lg">
                <div className="text-sm text-slate-600 mb-1">{item.status}</div>
                <div className="text-2xl font-bold text-slate-900">{item.count}</div>
                <div className="text-xs text-slate-500 mt-1">
                  {((item.count / metrics.totalLeads) * 100).toFixed(1)}% of total
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserAnalytics;
