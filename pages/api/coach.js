import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { messages, userContext } = req.body;

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
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    res.status(200).json({
      message: completion.choices[0].message.content,
    });
  } catch (error) {
    console.error('OpenAI API error:', error);
    res.status(500).json({
      message: 'Sorry, I encountered an error. Please try again.',
    });
  }
}
