import { GoogleGenerativeAI } from '@google/generative-ai';

export const config = { maxDuration: 300 };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

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
      return res.status(500).json({ error: 'Missing GEMINI_API_KEY in Vercel environment variables' });
    }

    const gemini = new GoogleGenerativeAI(apiKey);
    const model = gemini.getGenerativeModel({ model: 'gemini-1.5-pro-latest' });

    const result = await model.generateContent(`
Create a Next.js website for: "${prompt}"

Return files in this format:
File: package.json
\`\`\`json
{ "name": "site", "dependencies": { "next": "14" } }
\`\`\`

File: app/page.tsx
\`\`\`tsx
export default function Home() { return <div>Hello</div>; }
\`\`\`
`);

    const text = result.response.text();

    const files = {};
    const regex = /File:\s*([^\n]+)\n```(?:\w+)?\n([\s\S]*?)```/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      files[match[1].trim()] = match[2].trim();
    }

    if (Object.keys(files).length === 0) {
      files['response.txt'] = text;
    }

    return res.status(200).json({
      success: true,
      files
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
  }
