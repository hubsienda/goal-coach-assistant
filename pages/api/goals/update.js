// pages/api/goals/update.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { userId, goalId, action, data = {} } = req.body;

    if (!userId || !goalId || !action) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Verify user owns this goal
    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .select('*')
      .eq('id', goalId)
      .eq('user_id', userId)
      .single();

    if (goalError || !goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }

    let updateData = {
      updated_at: new Date().toISOString()
    };

    switch (action) {
      case 'update_progress':
        const { progress } = data;
        if (typeof progress !== 'number' || progress < 0 || progress > 100) {
          return res.status(400).json({ message: 'Progress must be a number between 0 and 100' });
        }
        updateData.progress = progress;
        
        // Auto-complete if progress reaches 100%
        if (progress === 100 && goal.status !== 'completed') {
          updateData.status = 'completed';
        }
        break;

      case 'mark_completed':
        updateData.status = 'completed';
        updateData.progress = 100;
        updateData.completion_notes = data.notes || null;
        updateData.satisfaction_rating = data.rating || null;
        break;

      case 'mark_active':
        updateData.status = 'active';
        break;

      case 'mark_paused':
        updateData.status = 'paused';
        break;

      case 'update_details':
        if (data.title) updateData.title = data.title;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.category) updateData.category = data.category;
        if (data.difficulty) updateData.difficulty = data.difficulty;
        break;

      case 'set_milestone':
        // Add milestone completion tracking
        const milestones = goal.milestones || [];
        const { milestoneIndex, completed } = data;
        
        if (typeof milestoneIndex === 'number' && milestoneIndex < milestones.length) {
          milestones[milestoneIndex] = {
            ...milestones[milestoneIndex],
            completed: completed === true,
            completed_at: completed ? new Date().toISOString() : null
          };
          updateData.milestones = milestones;
          
          // Update overall progress based on milestone completion
          const completedMilestones = milestones.filter(m => m.completed).length;
          const progressFromMilestones = Math.round((completedMilestones / milestones.length) * 100);
          updateData.progress = Math.max(goal.progress || 0, progressFromMilestones);
        }
        break;

      default:
        return res.status(400).json({ message: 'Invalid action' });
    }

    // Update the goal
    const { data: updatedGoal, error: updateError } = await supabase
      .from('goals')
      .update(updateData)
      .eq('id', goalId)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('Goal update error:', updateError);
      return res.status(500).json({ message: 'Failed to update goal' });
    }

    // Log the goal update
    await supabase
      .from('usage_logs')
      .insert({
        user_id: userId,
        event_type: 'goal_updated',
        metadata: {
          goal_id: goalId,
          action: action,
          old_status: goal.status,
          new_status: updatedGoal.status,
          old_progress: goal.progress,
          new_progress: updatedGoal.progress,
          update_data: data
        },
        created_at: new Date().toISOString()
      });

    // If goal was completed, trigger completion notification
    if (action === 'mark_completed' || (action === 'update_progress' && updateData.status === 'completed')) {
      try {
        await fetch(`${process.env.NEXTAUTH_URL}/api/notifications/scheduler`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            notificationType: 'goal_completion',
            scheduledFor: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes from now
            data: {
              title: updatedGoal.title,
              category: updatedGoal.category || 'General',
              completionTime: calculateCompletionTime(goal.created_at, updatedGoal.updated_at),
              satisfaction_rating: updatedGoal.satisfaction_rating
            }
          })
        });
      } catch (notificationError) {
        console.error('Failed to schedule completion notification:', notificationError);
        // Don't fail the main update for notification issues
      }
    }

    res.status(200).json({
      success: true,
      goal: updatedGoal,
      message: `Goal ${action.replace('_', ' ')} successfully`
    });

  } catch (error) {
    console.error('Goal update API error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

function calculateCompletionTime(createdAt, completedAt) {
  const days = Math.floor((new Date(completedAt) - new Date(createdAt)) / (1000 * 60 * 60 * 24));
  if (days === 0) return "same day";
  if (days === 1) return "1 day";
  if (days < 7) return `${days} days`;
  if (days < 30) return `${Math.floor(days / 7)} weeks`;
  return `${Math.floor(days / 30)} months`;
}
