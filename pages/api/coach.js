// pages/api/coach.js
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { messages, userContext, userId } = req.body;
    const userAgent = req.headers['user-agent'];
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    // Get user subscription status
    let subscriptionStatus = 'free';
    let userHistory = [];
    
    if (userId) {
      const { data: user } = await supabase
        .from('users')
        .select('subscription_status')
        .eq('id', userId)
        .single();
      
      if (user) {
        subscriptionStatus = user.subscription_status;
        
        // For premium users, get conversation history for better context
        if (subscriptionStatus === 'active') {
          const { data: history } = await supabase
            .from('usage_logs')
            .select('metadata')
            .eq('user_id', userId)
            .eq('event_type', 'goal_session')
            .order('created_at', { ascending: false })
            .limit(10);
          
          userHistory = history?.map(log => log.metadata?.summary).filter(Boolean) || [];
        }
      }
    }

    // Build system prompt based on subscription status
    const systemPrompt = buildSystemPrompt(subscriptionStatus, userContext, userHistory);

    // Configure AI parameters based on subscription
    const aiConfig = {
      model: 'gpt-4o-mini',
      temperature: subscriptionStatus === 'active' ? 0.7 : 0.5,
      max_tokens: subscriptionStatus === 'active' ? 2000 : 800,
      presence_penalty: subscriptionStatus === 'active' ? 0.6 : 0.3,
      frequency_penalty: subscriptionStatus === 'active' ? 0.5 : 0.2,
    };

    const completion = await openai.chat.completions.create({
      ...aiConfig,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
    });

    const response = completion.choices[0].message.content;

    // Log the interaction
    const sessionData = {
      user_id: userId,
      ip_address: ip,
      user_agent: userAgent,
      event_type: 'goal_session',
      metadata: {
        subscription_status: subscriptionStatus,
        message_count: messages.length,
        response_length: response.length,
        tokens_used: completion.usage?.total_tokens,
        model_used: aiConfig.model,
        session_summary: generateSessionSummary(messages, response)
      },
      created_at: new Date().toISOString()
    };

    await supabase
      .from('usage_logs')
      .insert(sessionData);

    // Enhanced response for premium users
    if (subscriptionStatus === 'active') {
      const enhancedResponse = await enhanceResponse(response, messages, userId);
      return res.status(200).json({ 
        message: enhancedResponse.content,
        premium_features: enhancedResponse.features
      });
    }

    res.status(200).json({ message: response });

  } catch (error) {
    console.error('Coach API error:', error);
    res.status(500).json({ message: 'I apologize, but I encountered an error. Please try again.' });
  }
}

function buildSystemPrompt(subscriptionStatus, userContext, userHistory) {
  const basePrompt = `You are GOALVERSE, an expert AI goal coach. You help people set, plan, and achieve their goals through intelligent conversation and actionable advice.

Your coaching style is:
- Supportive but direct
- Focused on practical action steps
- Encouraging without being overly positive
- Honest about challenges and realistic timelines
- Personalized to the user's situation

${userContext ? `User context: ${userContext}` : ''}`;

  if (subscriptionStatus === 'active') {
    return `${basePrompt}

PREMIUM COACHING MODE:
- Provide comprehensive, detailed responses with specific action steps
- Include timelines, milestones, and progress checkpoints
- Reference user's conversation history for personalized advice
- Offer proactive suggestions and follow-up questions
- Provide deeper analysis of obstacles and solutions
- Include relevant frameworks and methodologies
- Create detailed action plans with accountability measures

${userHistory.length > 0 ? `Previous conversation insights: ${userHistory.join('. ')}` : ''}

Remember to be thorough, insightful, and provide premium-level value in your response.`;
  }

  return basePrompt + `

STANDARD COACHING MODE:
- Provide helpful but concise responses
- Focus on immediate next steps
- Keep advice practical and actionable
- Limit to essential information only`;
}

async function enhanceResponse(response, messages, userId) {
  const features = [];

  try {
    // Generate follow-up questions
    const followUpQuestions = await generateFollowUpQuestions(messages, response);
    if (followUpQuestions.length > 0) {
      features.push({
        type: 'follow_up_questions',
        title: 'Suggested Next Steps',
        content: followUpQuestions
      });
    }

    // Generate action plan if this seems like a goal-setting session
    const lastUserMessage = messages[messages.length - 1]?.content || '';
    if (lastUserMessage.toLowerCase().includes('goal') || 
        lastUserMessage.toLowerCase().includes('want to') ||
        lastUserMessage.toLowerCase().includes('achieve')) {
      
      const actionPlan = await generateActionPlan(lastUserMessage, response);
      if (actionPlan) {
        features.push({
          type: 'action_plan',
          title: 'Your Action Plan',
          content: actionPlan
        });
      }
    }

    // Generate progress tracking suggestions
    const trackingTips = generateTrackingTips(response);
    if (trackingTips.length > 0) {
      features.push({
        type: 'tracking_tips',
        title: 'Track Your Progress',
        content: trackingTips
      });
    }

    return {
      content: response,
      features
    };

  } catch (error) {
    console.error('Error enhancing response:', error);
    return {
      content: response,
      features: []
    };
  }
}

async function generateFollowUpQuestions(messages, response) {
  try {
    const prompt = `Based on this coaching conversation, generate 2-3 follow-up questions that would help the user dive deeper into their goals and create more specific action steps. Make them thought-provoking and actionable.

Last user message: "${messages[messages.length - 1]?.content}"
Coach response: "${response}"

Return only the questions, one per line, without numbering or bullets:`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
      temperature: 0.7,
    });

    return completion.choices[0].message.content
      .split('\n')
      .filter(q => q.trim().length > 0)
      .slice(0, 3);

  } catch (error) {
    console.error('Error generating follow-up questions:', error);
    return [];
  }
}

async function generateActionPlan(userGoal, coachResponse) {
  try {
    const prompt = `Create a structured action plan based on this goal discussion:

User goal: "${userGoal}"
Coach advice: "${coachResponse}"

Generate a concise action plan with:
- 3-4 specific steps
- Timeline for each step
- Success metrics

Format as a simple structured plan:`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 400,
      temperature: 0.5,
    });

    const plan = completion.choices[0].message.content.trim();
    return plan.length > 20 ? plan : null;

  } catch (error) {
    console.error('Error generating action plan:', error);
    return null;
  }
}

function generateTrackingTips(response) {
  const tips = [];

  if (response.toLowerCase().includes('habit')) {
    tips.push('Use a habit tracker app or simple calendar to mark daily progress');
  }
  
  if (response.toLowerCase().includes('week') || response.toLowerCase().includes('daily')) {
    tips.push('Set weekly review sessions to assess your progress');
  }

  if (response.toLowerCase().includes('goal') || response.toLowerCase().includes('target')) {
    tips.push('Write down your goal and review it every morning');
  }

  if (response.toLowerCase().includes('exercise') || response.toLowerCase().includes('fitness')) {
    tips.push('Log your workouts and track key metrics like duration and intensity');
  }

  if (response.toLowerCase().includes('skill') || response.toLowerCase().includes('learn')) {
    tips.push('Keep a learning journal to note key insights and progress milestones');
  }

  return tips.slice(0, 3);
}

function generateSessionSummary(messages, response) {
  const lastUserMessage = messages[messages.length - 1]?.content || '';
  
  // Extract key themes for session summary
  let theme = 'general coaching';
  
  if (lastUserMessage.toLowerCase().includes('fitness') || 
      lastUserMessage.toLowerCase().includes('exercise')) {
    theme = 'fitness planning';
  } else if (lastUserMessage.toLowerCase().includes('career') || 
             lastUserMessage.toLowerCase().includes('work')) {
    theme = 'career development';
  } else if (lastUserMessage.toLowerCase().includes('habit')) {
    theme = 'habit building';
  } else if (lastUserMessage.toLowerCase().includes('skill') || 
             lastUserMessage.toLowerCase().includes('learn')) {
    theme = 'skill development';
  }

  return `User discussed ${theme}. Response focused on ${response.slice(0, 100)}...`;
}
