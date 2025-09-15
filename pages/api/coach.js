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

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { 
          role: 'system', 
          content: `You are an experienced life and career coach. Provide concise, actionable advice.

Guidelines:
- Keep responses under 120 words
- Use plain text only - no markdown, asterisks, or special formatting
- Complete all numbered points - never cut off mid-sentence
- Be direct and actionable
- Focus on 3-5 key steps maximum

User Context: ${userContext || 'New conversation'}` 
        },
        ...messages
      ],
      max_tokens: 200,
      temperature: 0.7,
    });

    res.status(200).json({
      message: completion.choices[0].message.content,
    });

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      message: 'Sorry, I encountered an error. Please try again.',
    });
  }
}
