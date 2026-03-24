import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  try {
    const { prompt } = req.body || {};

    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Missing GEMINI_API_KEY' });
    }

    const gemini = new GoogleGenerativeAI(apiKey);
    const model = gemini.getGenerativeModel({ model: 'gemini-1.5-pro-latest' });

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return res.status(200).json({ success: true, text });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
      }
