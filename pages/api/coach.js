import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Check if API key exists
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is not set');
    return res.status(500).json({ 
      message: 'Server configuration error. Please contact support.' 
    });
  }

  try {
    const { messages, userContext } = req.body;

    // Validate request body
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ 
        message: 'Invalid request format' 
      });
    }

    console.log('Making OpenAI API call...');

    const systemPrompt = `You are an experienced life and career coach assistant. Your role is to:

1. Help users clarify and refine their goals
2. Break down large goals into actionable steps
3. Provide motivation and accountability
4. Ask thoughtful questions to help users reflect
5. Offer practical strategies and frameworks
6. Celebrate progress and milestones

Guidelines:
- Be supportive but also challenge users when needed
- Ask follow-up questions to understand their situation better
- Provide specific, actionable advice
- Help them identify potential obstacles and solutions
- Keep responses conversational and encouraging
- Reference their previous context when relevant

User Context: ${userContext || 'New conversation'}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    console.log('OpenAI API call successful');

    if (!completion.choices || completion.choices.length === 0) {
      throw new Error('No response from OpenAI');
    }

    res.status(200).json({
      message: completion.choices[0].message.content,
    });

  } catch (error) {
    console.error('Detailed error:', {
      message: error.message,
      status: error.status,
      type: error.type,
      code: error.code,
    });

    // Handle specific OpenAI errors
    if (error.status === 401) {
      return res.status(500).json({
        message: 'Authentication error. Please check API configuration.',
      });
    }

    if (error.status === 429) {
      return res.status(500).json({
        message: 'Rate limit exceeded. Please try again in a moment.',
      });
    }

    if (error.status === 400) {
      return res.status(500).json({
        message: 'Invalid request to AI service.',
      });
    }

    // Generic error
    res.status(500).json({
      message: 'Sorry, I encountered an error. Please try again.',
    });
  }
}
