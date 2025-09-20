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
            .limit(5);
          
          userHistory = history?.map(log => log.metadata?.session_summary).filter(Boolean) || [];
        }
      }
    }

    // Build system prompt based on subscription status
    const systemPrompt = buildSystemPrompt(subscriptionStatus, userContext, userHistory);

    // Configure AI parameters based on subscription
    const aiConfig = {
      model: 'gpt-4o-mini',
      temperature: 0.3, // Lower for more consistent, direct responses
      max_tokens: subscriptionStatus === 'active' ? 400 : 250, // Shorter responses overall
      presence_penalty: 0.4,
      frequency_penalty: 0.3,
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
    res.status(500).json({ message: 'I encountered an error. Please try again.' });
  }
}

function buildSystemPrompt(subscriptionStatus, userContext, userHistory) {
  const basePrompt = `You are GOALVERSE, a direct and focused goal coach. You help people achieve their goals through step-by-step guidance, NOT generic advice.

CORE COACHING PRINCIPLES:
- Be concise and direct (2-4 sentences maximum)
- Give ONE specific action step at a time
- Always ask a follow-up question to move forward
- Focus on immediate next steps, not long-term planning
- Suggest specific milestones and measurable KPIs when relevant
- Avoid lists of multiple guidelines - they're overwhelming
- Skip motivational fluff - be practical and actionable

RESPONSE STRUCTURE:
1. Brief acknowledgment (1 sentence)
2. One specific action step (1-2 sentences)
3. Direct question to progress forward

EXAMPLES OF GOOD RESPONSES:
"Start with 20 minutes of walking, 3 times this week. Pick your exact days and times right now. What days work best for your schedule?"

"Track your daily water intake for one week first. Use a simple app or write it down. How many glasses did you drink today?"

"Choose one skill to focus on this month. Dedicate 30 minutes daily to practice. What specific skill interests you most?"

AVOID:
- Long paragraphs with multiple suggestions
- Generic motivational language
- Overwhelming lists of steps
- Vague advice without specific actions

${userContext ? `User context: ${userContext}` : ''}`;

  if (subscriptionStatus === 'active') {
    return `${basePrompt}

PREMIUM COACHING MODE:
- Reference previous conversation patterns for personalized guidance
- Suggest specific KPIs and measurement methods
- Provide milestone recommendations with timelines
- Offer accountability check-in questions
- Include relevant frameworks when appropriate (but keep concise)

${userHistory.length > 0 ? `Previous session insights: ${userHistory.join('. ')}` : ''}

Remember: Even premium responses must be concise and action-focused.`;
  }

  return basePrompt + `

STANDARD COACHING MODE:
- Keep responses under 3 sentences
- Focus on immediate next step only
- Ask one clear follow-up question`;
}

async function enhanceResponse(response, messages, userId) {
  const features = [];

  try {
    // Generate specific milestone suggestions
    const lastUserMessage = messages[messages.length - 1]?.content || '';
    
    if (lastUserMessage.toLowerCase().includes('goal') || 
        lastUserMessage.toLowerCase().includes('want to') ||
        lastUserMessage.toLowerCase().includes('achieve')) {
      
      const milestones = await generateMilestones(lastUserMessage, response);
      if (milestones && milestones.length > 0) {
        features.push({
          type: 'milestones',
          title: 'Suggested Milestones',
          content: milestones
        });
      }
    }

    // Generate KPI suggestions
    const kpis = generateKPIs(lastUserMessage, response);
    if (kpis.length > 0) {
      features.push({
        type: 'kpis',
        title: 'Track These Metrics',
        content: kpis
      });
    }

    // Generate next check-in question
    const checkIn = generateCheckInQuestion(response);
    if (checkIn) {
      features.push({
        type: 'check_in',
        title: 'Follow-up Question',
        content: [checkIn]
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

async function generateMilestones(userGoal, coachResponse) {
  try {
    const prompt = `Based on this goal discussion, create 3 specific, measurable milestones with timeframes:

User goal: "${userGoal}"
Coach advice: "${coachResponse}"

Return only 3 milestones, each on one line, format: "Week X: Specific measurable outcome"

Example format:
Week 2: Complete 6 workout sessions
Week 4: Lose 3 pounds
Week 8: Run 5K without stopping`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150,
      temperature: 0.3,
    });

    return completion.choices[0].message.content
      .split('\n')
      .filter(m => m.trim().length > 0)
      .slice(0, 3);

  } catch (error) {
    console.error('Error generating milestones:', error);
    return [];
  }
}

function generateKPIs(userMessage, response) {
  const kpis = [];
  const content = (userMessage + ' ' + response).toLowerCase();

  // Fitness KPIs
  if (content.includes('fitness') || content.includes('exercise') || content.includes('workout')) {
    kpis.push('Weekly workout sessions completed');
    kpis.push('Total exercise minutes per week');
  }

  // Weight/Health KPIs
  if (content.includes('weight') || content.includes('lose') || content.includes('health')) {
    kpis.push('Weekly weight measurement');
    kpis.push('Daily water intake (glasses)');
  }

  // Productivity KPIs
  if (content.includes('productivity') || content.includes('work') || content.includes('task')) {
    kpis.push('Daily tasks completed');
    kpis.push('Weekly focus hours logged');
  }

  // Learning KPIs
  if (content.includes('learn') || content.includes('skill') || content.includes('study')) {
    kpis.push('Daily practice minutes');
    kpis.push('Weekly learning sessions');
  }

  // Habit KPIs
  if (content.includes('habit') || content.includes('routine') || content.includes('daily')) {
    kpis.push('Daily habit completion rate');
    kpis.push('Weekly consistency streak');
  }

  // Business KPIs
  if (content.includes('business') || content.includes('revenue') || content.includes('sales')) {
    kpis.push('Weekly revenue growth');
    kpis.push('Monthly customer acquisition');
  }

  return kpis.slice(0, 3); // Limit to 3 KPIs
}

function generateCheckInQuestion(response) {
  const content = response.toLowerCase();

  if (content.includes('week') || content.includes('daily')) {
    return "When will you review your progress this week?";
  }
  
  if (content.includes('start') || content.includes('begin')) {
    return "What's stopping you from starting today?";
  }
  
  if (content.includes('track') || content.includes('measure')) {
    return "How will you remember to track this daily?";
  }
  
  if (content.includes('time') || content.includes('schedule')) {
    return "What time of day works best for this?";
  }

  return "What's your first step tomorrow?";
}

function generateSessionSummary(messages, response) {
  const lastUserMessage = messages[messages.length - 1]?.content || '';
  
  // Extract key themes for session summary
  let theme = 'goal discussion';
  
  if (lastUserMessage.toLowerCase().includes('fitness') || 
      lastUserMessage.toLowerCase().includes('exercise')) {
    theme = 'fitness goal';
  } else if (lastUserMessage.toLowerCase().includes('career') || 
             lastUserMessage.toLowerCase().includes('work')) {
    theme = 'career planning';
  } else if (lastUserMessage.toLowerCase().includes('habit')) {
    theme = 'habit formation';
  } else if (lastUserMessage.toLowerCase().includes('skill') || 
             lastUserMessage.toLowerCase().includes('learn')) {
    theme = 'skill development';
  } else if (lastUserMessage.toLowerCase().includes('business')) {
    theme = 'business planning';
  }

  return `Step-by-step coaching for ${theme}`;
}
