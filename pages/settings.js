// pages/settings.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Bell, Crown, Check, X, Clock, Mail, Zap } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';

export default function Settings() {
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState('free');

  const {
    preferences,
    updatePreferences,
    getNotificationStats,
    getUpcomingNotifications,
    triggerSmartNotifications
  } = useNotifications(userId);

  useEffect(() => {
    // Get user from cookie
    const authCookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('goalverse_auth='));
    
    if (authCookie) {
      const userIdFromCookie = authCookie.split('=')[1];
      setUserId(userIdFromCookie);
      checkSubscriptionStatus(userIdFromCookie);
    } else {
      router.push('/');
    }
  }, []);

  const checkSubscriptionStatus = async (userId) => {
    try {
      const response = await fetch(`/api/user/usage?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setSubscriptionStatus(data.subscription_status);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePreferenceChange = async (key, value) => {
    if (!preferences) return;

    setSaving(true);
    try {
      const newPreferences = {
        ...preferences,
        [key]: value
      };

      const success = await updatePreferences(newPreferences);
      if (!success) {
        alert('Failed to update preferences. Please try again.');
      }
    } catch (error) {
      console.error('Error updating preferences:', error);
      alert('Failed to update preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleTriggerNotifications = async () => {
    setSaving(true);
    try {
      const result = await triggerSmartNotifications();
      if (result.success) {
        alert(`Smart notifications triggered! ${result.scheduledCount} notifications scheduled.`);
      } else {
        alert('Failed to trigger notifications. Please try again.');
      }
    } catch (error) {
      console.error('Error triggering notifications:', error);
      alert('Failed to trigger notifications. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D1B2A] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#00CFFF]/30 border-t-[#00CFFF] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">Loading settings...</p>
        </div>
      </div>
    );
  }

  const stats = getNotificationStats();
  const upcomingNotifications = getUpcomingNotifications();

  return (
    <div className="min-h-screen bg-[#0D1B2A] text-white">
      {/* Header */}
      <div className="border-b border-gray-700 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => router.push('/')}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-bold text-white">Notification Settings</h1>
            {subscriptionStatus === 'active' && (
              <Crown className="w-5 h-5 text-[#FFD60A]" />
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        
        {/* Notification Stats */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Bell className="w-5 h-5 text-[#00CFFF] mr-2" />
            Notification Overview
          </h2>
          
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-[#00CFFF]">{stats.totalSent}</div>
              <div className="text-sm text-gray-400">Total Sent</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{stats.openRate}%</div>
              <div className="text-sm text-gray-400">Open Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#FFD60A]">{upcomingNotifications.length}</div>
              <div className="text-sm text-gray-400">Upcoming</div>
            </div>
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white flex items-center">
              <Mail className="w-5 h-5 text-[#00CFFF] mr-2" />
              Email Preferences
            </h2>
            
            {subscriptionStatus === 'active' && (
              <button
                onClick={handleTriggerNotifications}
                disabled={saving}
                className="bg-[#00CFFF] text-[#0D1B2A] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#00CFFF]/90 disabled:opacity-50 flex items-center space-x-2"
              >
                <Zap className="w-4 h-4" />
                <span>Trigger Smart Notifications</span>
              </button>
            )}
          </div>

          {subscriptionStatus !== 'active' && (
            <div className="bg-[#FFD60A]/20 border border-[#FFD60A]/30 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-2">
                <Crown className="w-5 h-5 text-[#FFD60A]" />
                <span className="text-[#FFD60A] font-medium">
                  Smart notifications are a Premium feature
                </span>
              </div>
              <p className="text-gray-300 text-sm mt-2">
                Upgrade to Premium to receive personalized progress updates and goal reminders.
              </p>
            </div>
          )}

          <div className="space-y-4">
            {[
              {
                key: 'email_notifications',
                title: 'Email Notifications',
                description: 'Receive all email notifications',
                premium: false
              },
              {
                key: 'weekly_summary',
                title: 'Weekly Progress Summary',
                description: 'Get a weekly report of your goal progress',
                premium: true
              },
              {
                key: 'progress_checkin',
                title: 'Progress Check-ins',
                description: 'Gentle reminders to update your goal progress',
                premium: true
              },
              {
                key: 'streak_celebration',
                title: 'Streak Celebrations',
                description: 'Celebrate your consistency milestones',
                premium: true
              },
              {
                key: 'goal_completion',
                title: 'Goal Completion',
                description: 'Celebrate when you complete goals',
                premium: true
              },
              {
                key: 'inactivity_reminder',
                title: 'Inactivity Reminders',
                description: 'Gentle nudges when you haven\'t been active',
                premium: true
              }
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-medium text-white">{item.title}</h3>
                    {item.premium && subscriptionStatus !== 'active' && (
                      <Crown className="w-4 h-4 text-[#FFD60A]" />
                    )}
                  </div>
                  <p className="text-gray-400 text-sm">{item.description}</p>
                </div>
                
                <button
                  onClick={() => handlePreferenceChange(item.key, !preferences?.[item.key])}
                  disabled={saving || (item.premium && subscriptionStatus !== 'active')}
                  className={`w-12 h-6 rounded-full transition-colors relative ${
                    preferences?.[item.key] && (subscriptionStatus === 'active' || !item.premium)
                      ? 'bg-[#00CFFF]'
                      : 'bg-gray-600'
                  } ${saving || (item.premium && subscriptionStatus !== 'active') ? 'opacity-50' : ''}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                    preferences?.[item.key] && (subscriptionStatus === 'active' || !item.premium)
                      ? 'translate-x-6'
                      : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Timing Preferences */}
        {subscriptionStatus === 'active' && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Clock className="w-5 h-5 text-[#00CFFF] mr-2" />
              Timing Preferences
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Preferred Time
                </label>
                <select
                  value={preferences?.preferred_time || '09:00'}
                  onChange={(e) => handlePreferenceChange('preferred_time', e.target.value)}
                  disabled={saving}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#00CFFF]"
                >
                  <option value="06:00">6:00 AM</option>
                  <option value="07:00">7:00 AM</option>
                  <option value="08:00">8:00 AM</option>
                  <option value="09:00">9:00 AM</option>
                  <option value="10:00">10:00 AM</option>
                  <option value="12:00">12:00 PM</option>
                  <option value="18:00">6:00 PM</option>
                  <option value="19:00">7:00 PM</option>
                  <option value="20:00">8:00 PM</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Frequency
                </label>
                <select
                  value={preferences?.reminder_frequency || 'smart'}
                  onChange={(e) => handlePreferenceChange('reminder_frequency', e.target.value)}
                  disabled={saving}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#00CFFF]"
                >
                  <option value="smart">Smart (AI-based)</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="never">Never</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Upcoming Notifications */}
        {upcomingNotifications.length > 0 && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Upcoming Notifications</h2>
            <div className="space-y-3">
              {upcomingNotifications.map((notification, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                  <div>
                    <div className="font-medium text-white capitalize">
                      {notification.notification_type.replace('_', ' ')}
                    </div>
                    <div className="text-sm text-gray-400">
                      {new Date(notification.scheduled_for).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-xs bg-[#00CFFF]/20 text-[#00CFFF] px-2 py-1 rounded">
                    Scheduled
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
