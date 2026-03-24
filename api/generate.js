import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
  console.log('API hit:', req.method);

  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'POST only' });
    }

    const body =
      typeof req.body === 'string'
        ? JSON.parse(req.body || '{}')
        : (req.body || {});

    console.log('Body received:', body);

    const prompt = body.prompt;
    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    console.log('API key exists:', Boolean(apiKey));

    if (!apiKey) {
      return res.status(500).json({ error: 'Missing GEMINI_API_KEY' });
    }

    const gemini = new GoogleGenerativeAI(apiKey);
    const model = gemini.getGenerativeModel({ model: 'gemini-1.5-pro-latest' });

    console.log('Sending prompt to Gemini...');

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    console.log('Gemini response received');

    return res.status(200).json({
      success: true,
      text
    });
  } catch (error) {
    console.error('Generate API error:', error);

    return res.status(500).json({
      success: false,
      error: error?.message || String(error),
      stack: error?.stack || null
    });
  }
}
