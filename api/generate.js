import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
  console.log('API hit:', req.method);

  try {
    console.log('Before reading body');
    console.log('req.body is:', req.body);

    const prompt = req.body?.prompt;
    console.log('Prompt value:', prompt);

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'POST only' });
    }

    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    console.log('API key exists:', !!apiKey);

    if (!apiKey) {
      return res.status(500).json({ error: 'Missing GEMINI_API_KEY' });
    }

    const gemini = new GoogleGenerativeAI(apiKey);
    const model = gemini.getGenerativeModel({ model: 'gemini-1.5-pro-latest' });

    console.log('Calling Gemini...');

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    console.log('Success');

    return res.status(200).json({
      success: true,
      text
    });
  } catch (error) {
    console.error('ERROR:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
      }
