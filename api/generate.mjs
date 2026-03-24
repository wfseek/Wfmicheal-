import { GoogleGenerativeAI } from '@google/generative-ai';

export const config = {
  maxDuration: 300
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { prompt, apiKey } = req.body;
    
    if (!apiKey || !prompt) {
      return res.status(400).json({ error: 'API key and prompt required' });
    }

    const gemini = new GoogleGenerativeAI(apiKey);
    const model = gemini.getGenerativeModel({ model: 'gemini-1.5-pro-latest' });

    const result = await model.generateContent(`
Create a Next.js website for: "${prompt}"

Return ONLY valid JSON like this (no markdown, no code blocks):
{
  "files": {
    "package.json": "{ \\"name\\": \\"site\\", \\"dependencies\\": {}}",
    "app/page.tsx": "export default function Home() { return <div>Hello</div>; }"
  }
}
`);

    const text = result.response.text();
    
    // Extract JSON
    let data;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      data = JSON.parse(jsonMatch[0]);
    } catch (e) {
      return res.status(200).json({
        success: true,
        files: { 'response.txt': text }
      });
    }

    return res.status(200).json({
      success: true,
      files: data.files || { 'response.txt': text }
    });

  } catch (error) {
    return res.status(500).json({ 
      success: false,
      error: error.message
    });
  }
}
