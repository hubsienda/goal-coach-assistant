// utils/emailTemplates.js - Smart Email Templates for Notifications (Native JS)

/**
 * Generate personalized email templates based on user data and notification type
 */
export class EmailTemplateGenerator {
  constructor() {
    this.baseStyles = this.getBaseStyles();
  }

  /**
   * Base email styles consistent with GOALVERSE branding
   */
  getBaseStyles() {
    return `
      <style>
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background-color: #0D1B2A;
          color: white;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 1px solid #374151;
        }
        .logo {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
        }
        .logo-icon {
          width: 40px;
          height: 40px;
          background-color: #00CFFF;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 10px;
        }
        .content-section {
          background-color: rgba(31, 41, 55, 0.5);
          border: 1px solid #374151;
          border-radius: 12px;
          padding: 25px;
          margin-bottom: 25px;
        }
        .progress-card {
          background-color: rgba(0, 207, 255, 0.1);
          border: 1px solid rgba(0, 207, 255, 0.3);
          border-radius: 8px;
          padding: 15px;
          margin: 15px 0;
        }
        .cta-button {
          background: linear-gradient(135deg, #00CFFF, #0EA5E9);
          color: white;
          padding: 15px 30px;
          text-decoration: none;
          border-radius: 8px;
          display: inline-block;
          font-weight: bold;
          font-size: 16px;
          margin: 20px 0;
        }
        .footer {
          border-top: 1px solid #374151;
          padding-top: 20px;
          text-align: center;
          color: #6B7280;
          font-size: 14px;
          margin-top: 30px;
        }
        .insight-item {
          display: flex;
          align-items: flex-start;
          margin: 12px 0;
          padding: 12px;
          background-color: rgba(255, 214, 10, 0.1);
          border-radius: 6px;
        }
        .streak-highlight {
          color: #10B981;
          font-weight: bold;
        }
        .goal-highlight {
          color: #00CFFF;
          font-weight: bold;
        }
        .warning-text {
          color: #F59E0B;
          font-weight: 500;
        }
      </style>
    `;
  }

  /**
   * Generate weekly progress summary email
   */
  generateWeeklySummary(userData, progressData, insights) {
    const {
      firstName = 'Goal Achiever',
      email,
      totalGoals = 0,
      completedThisWeek = 0,
      currentStreak = 0,
      longestStreak = 0
    } = userData;

    const completionRate = totalGoals > 0 ? Math.round((progressData.completedGoals / totalGoals) * 100) : 0;
    const weeklyProgress = progressData.weeklyActivity || [];
    const mostActiveDay = this.findMostActiveDay(weeklyProgress);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Weekly GOALVERSE Progress</title>
        ${this.baseStyles}
      </head>
      <body>
        <div class="email-container">
          <!-- Header -->
          <div class="header">
            <div class="logo">
              <div class="logo-icon">
                <span style="color: #0D1B2A; font-weight: bold; font-size: 20px;">G</span>
              </div>
              <h1 style="color: #00CFFF; margin: 0; font-size: 24px;">GOALVERSE</h1>
            </div>
            <h2 style="color: white; margin: 0 0 10px 0;">Your Weekly Progress Report</h2>
            <p style="color: #9CA3AF; margin: 0;">${this.formatDate(new Date())}</p>
          </div>

          <!-- Personal Greeting -->
          <div class="content-section">
            <h3 style="color: #00CFFF; margin-bottom: 15px;">Hey ${firstName}! 👋</h3>
            <p style="color: #D1D5DB; line-height: 1.6; margin-bottom: 0;">
              Here's how your goal journey progressed this week. ${this.getWeeklyMotivationalMessage(completedThisWeek, currentStreak)}
            </p>
          </div>

          <!-- Progress Stats -->
          <div class="content-section">
            <h3 style="color: white; margin-bottom: 20px;">This Week's Highlights</h3>
            
            <div style="display: grid; gap: 15px;">
              <div class="progress-card">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="color: #9CA3AF;">Goals Completed</span>
                  <span style="color: #00CFFF; font-size: 20px; font-weight: bold;">${completedThisWeek}</span>
                </div>
              </div>
              
              <div class="progress-card">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="color: #9CA3AF;">Current Streak</span>
                  <span class="streak-highlight" style="font-size: 20px;">${currentStreak} days</span>
                </div>
              </div>
              
              <div class="progress-card">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="color: #9CA3AF;">Success Rate</span>
                  <span style="color: #10B981; font-size: 20px; font-weight: bold;">${completionRate}%</span>
                </div>
              </div>
              
              ${mostActiveDay ? `
              <div class="progress-card">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="color: #9CA3AF;">Most Active Day</span>
                  <span style="color: #FFD60A; font-size: 16px; font-weight: bold;">${mostActiveDay}</span>
                </div>
              </div>
              ` : ''}
            </div>
          </div>

          <!-- AI Insights -->
          ${insights && insights.length > 0 ? `
          <div class="content-section">
            <h3 style="color: white; margin-bottom: 20px;">🎯 Personalized Insights</h3>
            ${insights.map(insight => `
              <div class="insight-item">
                <div style="color: #FFD60A; margin-right: 10px;">•</div>
                <span style="color: #D1D5DB; font-size: 14px; line-height: 1.5;">${insight}</span>
              </div>
            `).join('')}
          </div>
          ` : ''}

          <!-- Call to Action -->
          <div class="content-section" style="text-align: center;">
            <h3 style="color: white; margin-bottom: 15px;">Ready for Next Week?</h3>
            <p style="color: #D1D5DB; margin-bottom: 20px;">
              Keep the momentum going! Your next goal breakthrough is just one session away.
            </p>
            <a href="https://goalverse.app" class="cta-button">
              Continue Your Journey
            </a>
          </div>

          <!-- Footer -->
          <div class="footer">
            <p style="margin: 0 0 10px 0;">
              <strong style="color: #FFD60A;">GOALVERSE by Naralimon</strong>
            </p>
            <p style="margin: 0; font-size: 12px;">
              Progress needs direction • <a href="https://goalverse.app/unsubscribe?email=${email}" style="color: #00CFFF;">Unsubscribe</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate progress check-in reminder email
   */
  generateProgressCheckIn(userData, lastActivity, goalsSummary) {
    const { firstName = 'Goal Achiever', email } = userData;
    const daysSinceActivity = this.getDaysBetween(new Date(lastActivity), new Date());
    const urgencyLevel = this.getUrgencyLevel(daysSinceActivity);
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Time for a Goal Check-In</title>
        ${this.baseStyles}
      </head>
      <body>
        <div class="email-container">
          <!-- Header -->
          <div class="header">
            <div class="logo">
              <div class="logo-icon">
                <span style="color: #0D1B2A; font-weight: bold; font-size: 20px;">G</span>
              </div>
              <h1 style="color: #00CFFF; margin: 0; font-size: 24px;">GOALVERSE</h1>
            </div>
            <h2 style="color: white; margin: 0 0 10px 0;">${urgencyLevel.title}</h2>
            <p style="color: #9CA3AF; margin: 0;">Your goals are waiting for you</p>
          </div>

          <!-- Check-in Message -->
          <div class="content-section">
            <h3 style="color: #00CFFF; margin-bottom: 15px;">Hi ${firstName},</h3>
            <p style="color: #D1D5DB; line-height: 1.6; margin-bottom: 20px;">
              ${urgencyLevel.message}
            </p>
            
            ${daysSinceActivity > 7 ? `
            <div style="background-color: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 8px; padding: 15px; margin: 15px 0;">
              <p style="color: #F59E0B; margin: 0; font-size: 14px;">
                ⚠️ It's been ${daysSinceActivity} days since your last goal session. Consistency is key to achieving your dreams!
              </p>
            </div>
            ` : ''}
          </div>

          <!-- Active Goals Summary -->
          ${goalsSummary && goalsSummary.length > 0 ? `
          <div class="content-section">
            <h3 style="color: white; margin-bottom: 20px;">Your Active Goals</h3>
            ${goalsSummary.slice(0, 3).map(goal => `
              <div style="border-left: 3px solid #00CFFF; padding-left: 15px; margin: 15px 0;">
                <h4 style="color: #00CFFF; margin: 0 0 5px 0; font-size: 16px;">${goal.title}</h4>
                <p style="color: #9CA3AF; margin: 0; font-size: 14px;">
                  Started ${this.formatRelativeDate(goal.created_at)}
                </p>
              </div>
            `).join('')}
          </div>
          ` : ''}

          <!-- Quick Actions -->
          <div class="content-section">
            <h3 style="color: white; margin-bottom: 15px;">Quick 5-Minute Actions</h3>
            <div style="display: grid; gap: 10px;">
              <div style="background-color: rgba(16, 185, 129, 0.1); border-radius: 6px; padding: 12px;">
                <span style="color: #10B981;">✓</span> Update progress on one goal
              </div>
              <div style="background-color: rgba(16, 185, 129, 0.1); border-radius: 6px; padding: 12px;">
                <span style="color: #10B981;">✓</span> Set tomorrow's priority action
              </div>
              <div style="background-color: rgba(16, 185, 129, 0.1); border-radius: 6px; padding: 12px;">
                <span style="color: #10B981;">✓</span> Schedule this week's goal time
              </div>
            </div>
          </div>

          <!-- Call to Action -->
          <div class="content-section" style="text-align: center;">
            <a href="https://goalverse.app" class="cta-button">
              Continue Your Goals Now
            </a>
            <p style="color: #9CA3AF; margin-top: 15px; font-size: 14px;">
              Just 5 minutes can reignite your momentum
            </p>
          </div>

          <!-- Footer -->
          <div class="footer">
            <p style="margin: 0 0 10px 0;">
              <strong style="color: #FFD60A;">GOALVERSE by Naralimon</strong>
            </p>
            <p style="margin: 0; font-size: 12px;">
              Because progress needs direction • <a href="https://goalverse.app/preferences?email=${email}" style="color: #00CFFF;">Update preferences</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate streak celebration email
   */
  generateStreakCelebration(userData, streakData) {
    const { firstName = 'Goal Achiever', email } = userData;
    const { currentStreak, milestone, achievements } = streakData;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Streak Milestone Achieved!</title>
        ${this.baseStyles}
      </head>
      <body>
        <div class="email-container">
          <!-- Header -->
          <div class="header">
            <div class="logo">
              <div class="logo-icon">
                <span style="color: #0D1B2A; font-weight: bold; font-size: 20px;">G</span>
              </div>
              <h1 style="color: #00CFFF; margin: 0; font-size: 24px;">GOALVERSE</h1>
            </div>
            <h2 style="color: white; margin: 0 0 10px 0;">🎉 Streak Milestone!</h2>
            <p style="color: #9CA3AF; margin: 0;">Celebrating your consistency</p>
          </div>

          <!-- Celebration Content -->
          <div class="content-section" style="text-align: center;">
            <div style="background: linear-gradient(135deg, #00CFFF, #FFD60A); border-radius: 50%; width: 80px; height: 80px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 32px;">🔥</span>
            </div>
            
            <h3 style="color: #00CFFF; margin-bottom: 10px; font-size: 24px;">
              ${currentStreak} Day Streak!
            </h3>
            <p style="color: #FFD60A; font-size: 18px; font-weight: bold; margin-bottom: 20px;">
              ${milestone}
            </p>
            <p style="color: #D1D5DB; line-height: 1.6;">
              Amazing work, ${firstName}! You've maintained consistent goal progress for ${currentStreak} consecutive days. 
              This level of dedication is what separates dreamers from achievers.
            </p>
          </div>

          <!-- Achievements -->
          ${achievements && achievements.length > 0 ? `
          <div class="content-section">
            <h3 style="color: white; margin-bottom: 20px;">What You've Accomplished</h3>
            ${achievements.map(achievement => `
              <div style="display: flex; align-items: center; margin: 12px 0; padding: 12px; background-color: rgba(255, 214, 10, 0.1); border-radius: 6px;">
                <span style="color: #FFD60A; margin-right: 12px; font-size: 18px;">🏆</span>
                <span style="color: #D1D5DB;">${achievement}</span>
              </div>
            `).join('')}
          </div>
          ` : ''}

          <!-- Call to Action -->
          <div class="content-section" style="text-align: center;">
            <h3 style="color: white; margin-bottom: 15px;">Ready for Day ${currentStreak + 1}?</h3>
            <a href="https://goalverse.app" class="cta-button">
              Continue Your Streak
            </a>
            <p style="color: #9CA3AF; margin-top: 15px; font-size: 14px;">
              Don't break the chain now!
            </p>
          </div>

          <!-- Footer -->
          <div class="footer">
            <p style="margin: 0 0 10px 0;">
              <strong style="color: #FFD60A;">GOALVERSE by Naralimon</strong>
            </p>
            <p style="margin: 0; font-size: 12px;">
              Celebrating your journey • <a href="https://goalverse.app/achievements?email=${email}" style="color: #00CFFF;">View all achievements</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate goal completion celebration email
   */
  generateGoalCompletion(userData, goalData) {
    const { firstName = 'Goal Achiever', email } = userData;
    const { title, completionTime, category, nextSuggestions } = goalData;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Goal Completed - Celebrate Your Win!</title>
        ${this.baseStyles}
      </head>
      <body>
        <div class="email-container">
          <!-- Header -->
          <div class="header">
            <div class="logo">
              <div class="logo-icon">
                <span style="color: #0D1B2A; font-weight: bold; font-size: 20px;">G</span>
              </div>
              <h1 style="color: #00CFFF; margin: 0; font-size: 24px;">GOALVERSE</h1>
            </div>
            <h2 style="color: white; margin: 0 0 10px 0;">🎯 Goal Achieved!</h2>
            <p style="color: #9CA3AF; margin: 0;">Time to celebrate your success</p>
          </div>

          <!-- Celebration -->
          <div class="content-section" style="text-align: center;">
            <div style="background: linear-gradient(135deg, #10B981, #00CFFF); border-radius: 50%; width: 100px; height: 100px; margin: 0 auto 25px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 40px;">🏆</span>
            </div>
            
            <h3 style="color: #10B981; margin-bottom: 10px; font-size: 26px;">
              Congratulations, ${firstName}!
            </h3>
            <div style="background-color: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; padding: 20px; margin: 20px 0;">
              <h4 style="color: #00CFFF; margin: 0 0 10px 0; font-size: 20px;">
                "${title}"
              </h4>
              <p style="color: #D1D5DB; margin: 0;">
                Completed in ${completionTime} • ${category}
              </p>
            </div>
          </div>

          <!-- Next Steps -->
          ${nextSuggestions && nextSuggestions.length > 0 ? `
          <div class="content-section">
            <h3 style="color: white; margin-bottom: 20px;">What's Next?</h3>
            <p style="color: #D1D5DB; margin-bottom: 20px;">
              Build on this momentum with these personalized suggestions:
            </p>
            ${nextSuggestions.map((suggestion, index) => `
              <div style="border-left: 3px solid #FFD60A; padding-left: 15px; margin: 15px 0;">
                <h4 style="color: #FFD60A; margin: 0 0 5px 0; font-size: 16px;">${index + 1}. ${suggestion.title}</h4>
                <p style="color: #9CA3AF; margin: 0; font-size: 14px;">${suggestion.description}</p>
              </div>
            `).join('')}
          </div>
          ` : ''}

          <!-- Call to Action -->
          <div class="content-section" style="text-align: center;">
            <h3 style="color: white; margin-bottom: 15px;">Ready for Your Next Challenge?</h3>
            <a href="https://goalverse.app" class="cta-button">
              Set Your Next Goal
            </a>
            <p style="color: #9CA3AF; margin-top: 15px; font-size: 14px;">
              Winners keep winning
            </p>
          </div>

          <!-- Footer -->
          <div class="footer">
            <p style="margin: 0 0 10px 0;">
              <strong style="color: #FFD60A;">GOALVERSE by Naralimon</strong>
            </p>
            <p style="margin: 0; font-size: 12px;">
              Celebrating your victories • <a href="https://goalverse.app/share-success?email=${email}" style="color: #00CFFF;">Share your success</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Helper methods using native JavaScript
  formatDate(date) {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  getDaysBetween(date1, date2) {
    const diffTime = Math.abs(date2 - date1);
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  formatRelativeDate(dateString) {
    const days = this.getDaysBetween(new Date(dateString), new Date());
    if (days === 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return `${Math.floor(days / 30)} months ago`;
  }

  getWeeklyMotivationalMessage(completedThisWeek, currentStreak) {
    if (completedThisWeek >= 3) {
      return "You're absolutely crushing it this week! Your dedication is inspiring.";
    } else if (currentStreak >= 7) {
      return `Your ${currentStreak}-day streak shows incredible consistency. Keep the momentum rolling!`;
    } else if (completedThisWeek >= 1) {
      return "Great progress this week! Every step forward counts.";
    } else {
      return "This week is a fresh start. Your goals are waiting for your attention.";
    }
  }

  getUrgencyLevel(daysSinceActivity) {
    if (daysSinceActivity <= 2) {
      return {
        title: "Keep the Momentum Going!",
        message: "You're doing great with your goals! A quick check-in will help maintain your progress streak."
      };
    } else if (daysSinceActivity <= 5) {
      return {
        title: "Time for a Goal Check-In",
        message: "It's been a few days since we've seen you. Your goals are waiting for your attention!"
      };
    } else if (daysSinceActivity <= 10) {
      return {
        title: "Your Goals Miss You",
        message: "It's been over a week since your last goal session. Small consistent actions lead to big results - let's get back on track!"
      };
    } else {
      return {
        title: "Ready to Restart Your Journey?",
        message: "Life gets busy, but your dreams don't have to wait. It's never too late to refocus on what matters most to you."
      };
    }
  }

  findMostActiveDay(weeklyActivity) {
    if (!weeklyActivity || weeklyActivity.length === 0) return null;
    
    const maxSessions = Math.max(...weeklyActivity.map(day => day.sessions));
    const mostActiveDay = weeklyActivity.find(day => day.sessions === maxSessions);
    return mostActiveDay ? mostActiveDay.day : null;
  }
}

export default EmailTemplateGenerator;
