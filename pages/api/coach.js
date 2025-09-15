import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ message: 'Invalid messages format' });
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { 
          role: 'system', 
          content: 'You are a helpful goal coach. Keep responses under 150 words.' 
        },
        ...messages
      ],
      max_tokens: 150,
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
