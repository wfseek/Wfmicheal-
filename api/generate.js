import { GoogleGenerativeAI } from '@google/generative-ai';

export const config = {
  maxDuration: 300 // 5 minutes timeout
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  
  const { prompt, apiKey } = req.body;
  const gemini = new GoogleGenerativeAI(apiKey);
  
  // Generate files (simplified version)
  const model = gemini.getGenerativeModel({ model: 'gemini-1.5-pro-latest' });
  
  const result = await model.generateContent(`
    Create a Next.js website for: ${prompt}
    Generate package.json, page.tsx, layout.tsx, globals.css
    Return as JSON with filename: content pairs
  `);
  
  res.status(200).json({ 
    files: result.response.text(),
    message: 'Generated successfully'
  });
}
