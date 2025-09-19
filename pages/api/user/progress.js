// pages/api/user/progress.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { userId, range = 'week' } = req.query;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Verify user has premium access
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('subscription_status')
      .eq('id', userId)
      .single();

    if (userError || user.subscription_status !== 'active') {
      return res.status(403).json({ message: 'Premium subscription required' });
    }

    // Calculate date ranges
    const now = new Date();
    let startDate;
    
    switch (range) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Get user's goals
    const { data: goals, error: goalsError } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (goalsError) throw goalsError;

    // Get usage logs for session analysis
    const { data: usageLogs, error: logsError } = await supabase
      .from('usage_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (logsError) throw logsError;

    // Calculate key metrics
    const totalGoals = goals.length;
    const completedGoals = goals.filter(g => g.status === 'completed').length;
    const completionRate = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

    // Calculate streak (consecutive days with activity)
    const currentStreak = calculateStreak(usageLogs);

    // Calculate average session time (in minutes)
    const sessionTimes = usageLogs
      .filter(log => log.metadata?.session_duration)
      .map(log => log.metadata.session_duration);
    const avgSessionTime = sessionTimes.length > 0 
      ? Math.round(sessionTimes.reduce((a, b) => a + b, 0) / sessionTimes.length / 60) 
      : 0;

    // Goals over time data
    const goalsOverTime = generateTimeSeriesData(goals, startDate, now, range);

    // Goal categories analysis
    const goalCategories = analyzeGoalCategories(goals);

    // Weekly activity data
    const weeklyActivity = generateWeeklyActivity(usageLogs, startDate);

    // Success rate trends
    const successTrends = generateSuccessTrends(goals, startDate, range);

    // AI-generated insights
    const insights = generateInsights({
      totalGoals,
      completedGoals,
      completionRate,
      currentStreak,
      goals,
      usageLogs
    });

    const progressData = {
      totalGoals,
      completedGoals,
      completionRate,
      currentStreak,
      avgSessionTime,
      goalsOverTime,
      goalCategories,
      weeklyActivity,
      successTrends,
      insights
    };

    res.status(200).json(progressData);

  } catch (error) {
    console.error('Progress data error:', error);
    res.status(500).json({ message: 'Failed to load progress data' });
  }
}

function calculateStreak(usageLogs) {
  if (usageLogs.length === 0) return 0;

  const today = new Date();
  const days = new Set();
  
  // Get unique days with activity
  usageLogs.forEach(log => {
    const logDate = new Date(log.created_at);
    const dateKey = logDate.toISOString().split('T')[0];
    days.add(dateKey);
  });

  const sortedDays = Array.from(days).sort().reverse();
  
  let streak = 0;
  let currentDate = new Date(today);

  // Count consecutive days backwards from today
  for (let i = 0; i < sortedDays.length; i++) {
    const dayKey = currentDate.toISOString().split('T')[0];
    
    if (sortedDays.includes(dayKey)) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

function generateTimeSeriesData(goals, startDate, endDate, range) {
  const data = [];
  const groupBy = range === 'quarter' ? 'week' : 'day';
  const interval = groupBy === 'week' ? 7 : 1;
  
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const periodEnd = new Date(current);
    periodEnd.setDate(periodEnd.getDate() + interval - 1);
    
    const goalsInPeriod = goals.filter(goal => {
      const goalDate = new Date(goal.created_at);
      return goalDate >= current && goalDate <= periodEnd;
    }).length;

    data.push({
      date: current.toISOString().split('T')[0],
      goals: goalsInPeriod
    });

    current.setDate(current.getDate() + interval);
  }

  return data;
}

function analyzeGoalCategories(goals) {
  const categories = {};
  
  goals.forEach(goal => {
    // Simple categorization based on keywords in title/description
    const text = (goal.title + ' ' + (goal.description || '')).toLowerCase();
    let category = 'Other';

    if (text.includes('fitness') || text.includes('exercise') || text.includes('workout') || text.includes('health')) {
      category = 'Health & Fitness';
    } else if (text.includes('career') || text.includes('work') || text.includes('job') || text.includes('professional')) {
      category = 'Career';
    } else if (text.includes('learning') || text.includes('skill') || text.includes('study') || text.includes('education')) {
      category = 'Learning';
    } else if (text.includes('habit') || text.includes('routine') || text.includes('daily')) {
      category = 'Habits';
    } else if (text.includes('creative') || text.includes('art') || text.includes('music') || text.includes('writing')) {
      category = 'Creative';
    }

    categories[category] = (categories[category] || 0) + 1;
  });

  return Object.entries(categories).map(([name, value]) => ({ name, value }));
}

function generateWeeklyActivity(usageLogs, startDate) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const activity = days.map(day => ({ day, sessions: 0 }));

  usageLogs.forEach(log => {
    const logDate = new Date(log.created_at);
    const dayIndex = (logDate.getDay() + 6) % 7; // Convert Sunday=0 to Monday=0
    if (dayIndex >= 0 && dayIndex < 7) {
      activity[dayIndex].sessions++;
    }
  });

  return activity;
}

function generateSuccessTrends(goals, startDate, range) {
  const data = [];
  const groupBy = range === 'quarter' ? 'week' : range === 'month' ? 'week' : 'day';
  const interval = groupBy === 'week' ? 7 : 1;
  
  const current = new Date(startDate);
  const endDate = new Date();
  
  while (current <= endDate) {
    const periodEnd = new Date(current);
    periodEnd.setDate(periodEnd.getDate() + interval - 1);
    
    const periodGoals = goals.filter(goal => {
      const goalDate = new Date(goal.created_at);
      return goalDate >= current && goalDate <= periodEnd;
    });

    const completedInPeriod = periodGoals.filter(g => g.status === 'completed').length;
    const successRate = periodGoals.length > 0 ? Math.round((completedInPeriod / periodGoals.length) * 100) : 0;

    data.push({
      period: current.toISOString().split('T')[0],
      successRate
    });

    current.setDate(current.getDate() + interval);
  }

  return data;
}

function generateInsights({ totalGoals, completedGoals, completionRate, currentStreak, goals, usageLogs }) {
  const insights = [];

  // Completion rate insights
  if (completionRate >= 80) {
    insights.push("Excellent! Your goal completion rate is outstanding. You're building strong execution habits.");
  } else if (completionRate >= 60) {
    insights.push("Good progress! Consider breaking down larger goals into smaller, more manageable steps.");
  } else if (completionRate < 40 && totalGoals > 0) {
    insights.push("Focus on fewer goals at once. Quality over quantity leads to better completion rates.");
  }

  // Streak insights
  if (currentStreak >= 7) {
    insights.push(`Amazing consistency! You've maintained activity for ${currentStreak} days straight.`);
  } else if (currentStreak >= 3) {
    insights.push("You're building good momentum. Keep up the consistent effort!");
  } else if (currentStreak === 0) {
    insights.push("Start small today. Even 5 minutes of goal work can restart your momentum.");
  }

  // Activity patterns
  const recentActivity = usageLogs.filter(log => {
    const logDate = new Date(log.created_at);
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return logDate >= dayAgo;
  });

  if (recentActivity.length === 0 && usageLogs.length > 0) {
    insights.push("You haven't been active recently. Consider scheduling a specific time for goal work.");
  }

  // Goal diversity
  const categories = analyzeGoalCategories(goals);
  if (categories.length >= 3) {
    insights.push("You're working on diverse goal areas. This balanced approach supports overall growth.");
  }

  return insights.slice(0, 4); // Limit to 4 insights
}
