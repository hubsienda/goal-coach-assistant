// components/ProgressDashboard.js
import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Calendar, TrendingUp, Target, Award, Clock, Download } from 'lucide-react';

export default function ProgressDashboard({ userId, subscription_status }) {
  const [progressData, setProgressData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('week'); // 'week', 'month', 'quarter'

  useEffect(() => {
    if (subscription_status === 'active' && userId) {
      loadProgressData();
    }
  }, [userId, subscription_status, timeRange]);

  const loadProgressData = async () => {
    try {
      const response = await fetch(`/api/user/progress?userId=${userId}&range=${timeRange}`);
      if (response.ok) {
        const data = await response.json();
        setProgressData(data);
      }
    } catch (error) {
      console.error('Error loading progress data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportProgress = async (format) => {
    try {
      const response = await fetch(`/api/user/export?userId=${userId}&format=${format}&range=${timeRange}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `goalverse-progress-${timeRange}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  if (subscription_status !== 'active') {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-8 text-center">
        <Target className="w-12 h-12 text-gray-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Premium Feature</h3>
        <p className="text-gray-400 mb-4">
          Advanced progress tracking is available for Premium subscribers only.
        </p>
        <button className="bg-[#00CFFF] text-[#0D1B2A] px-6 py-2 rounded-lg font-medium hover:bg-[#00CFFF]/90 transition-colors">
          Upgrade to Premium
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-700 rounded w-1/3"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-700 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  const COLORS = ['#00CFFF', '#FFD60A', '#10B981', '#F59E0B', '#EF4444'];

  return (
    <div className="space-y-6">
      {/* Header with Time Range Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
          <TrendingUp className="w-6 h-6 text-[#00CFFF]" />
          <span>Progress Analytics</span>
        </h2>
        
        <div className="flex items-center space-x-4">
          <div className="flex bg-gray-800 rounded-lg p-1">
            {['week', 'month', 'quarter'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  timeRange === range
                    ? 'bg-[#00CFFF] text-[#0D1B2A]'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => exportProgress('pdf')}
              className="bg-gray-700 text-white px-3 py-2 rounded-lg text-sm hover:bg-gray-600 transition-colors flex items-center space-x-1"
            >
              <Download className="w-4 h-4" />
              <span>PDF</span>
            </button>
            <button
              onClick={() => exportProgress('csv')}
              className="bg-gray-700 text-white px-3 py-2 rounded-lg text-sm hover:bg-gray-600 transition-colors flex items-center space-x-1"
            >
              <Download className="w-4 h-4" />
              <span>CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-[#00CFFF]/20 to-[#00CFFF]/10 border border-[#00CFFF]/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <Target className="w-8 h-8 text-[#00CFFF]" />
            <span className="text-2xl font-bold text-white">{progressData?.totalGoals || 0}</span>
          </div>
          <h3 className="text-[#00CFFF] font-medium">Total Goals</h3>
          <p className="text-gray-400 text-sm">All time</p>
        </div>

        <div className="bg-gradient-to-r from-[#FFD60A]/20 to-[#FFD60A]/10 border border-[#FFD60A]/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <Award className="w-8 h-8 text-[#FFD60A]" />
            <span className="text-2xl font-bold text-white">{progressData?.completedGoals || 0}</span>
          </div>
          <h3 className="text-[#FFD60A] font-medium">Completed</h3>
          <p className="text-gray-400 text-sm">
            {progressData?.completionRate || 0}% completion rate
          </p>
        </div>

        <div className="bg-gradient-to-r from-green-500/20 to-green-500/10 border border-green-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <Calendar className="w-8 h-8 text-green-400" />
            <span className="text-2xl font-bold text-white">{progressData?.currentStreak || 0}</span>
          </div>
          <h3 className="text-green-400 font-medium">Current Streak</h3>
          <p className="text-gray-400 text-sm">Days consistent</p>
        </div>

        <div className="bg-gradient-to-r from-purple-500/20 to-purple-500/10 border border-purple-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-8 h-8 text-purple-400" />
            <span className="text-2xl font-bold text-white">{progressData?.avgSessionTime || 0}m</span>
          </div>
          <h3 className="text-purple-400 font-medium">Avg Session</h3>
          <p className="text-gray-400 text-sm">Minutes per session</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Goals Over Time */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Goals Created Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={progressData?.goalsOverTime || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }} 
              />
              <Line 
                type="monotone" 
                dataKey="goals" 
                stroke="#00CFFF" 
                strokeWidth={2}
                dot={{ fill: '#00CFFF', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Goal Categories */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Goal Categories</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={progressData?.goalCategories || []}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {(progressData?.goalCategories || []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly Activity */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Weekly Activity</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={progressData?.weeklyActivity || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="day" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }} 
              />
              <Bar dataKey="sessions" fill="#00CFFF" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Success Rate Trends */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Success Rate Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={progressData?.successTrends || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="period" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }} 
              />
              <Line 
                type="monotone" 
                dataKey="successRate" 
                stroke="#10B981" 
                strokeWidth={2}
                dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Insights Section */}
      {progressData?.insights && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">AI Insights</h3>
          <div className="space-y-3">
            {progressData.insights.map((insight, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-gray-700/50 rounded-lg">
                <div className="w-2 h-2 bg-[#00CFFF] rounded-full mt-2"></div>
                <p className="text-gray-300 text-sm">{insight}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
