import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  try {
    const { prompt } = req.body || {};

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "Missing server API key" });
    }

    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt" });
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: `
Create a Next.js website for: "${prompt}"

Return files in this exact format:

File: package.json
\`\`\`json
{ "name": "site", "dependencies": { "next": "14", "react": "^18", "react-dom": "^18" } }
\`\`\`

File: app/page.tsx
\`\`\`tsx
export default function Home() { return <div>Hello</div>; }
\`\`\`
`,
    });

    const text = response.text || "";

    const files = {};
    const regex = /File:\s*([^\n]+)\n```(?:\w+)?\n([\s\S]*?)```/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      files[match[1].trim()] = match[2].trim();
    }

    if (Object.keys(files).length === 0) {
      files["response.txt"] = text;
    }

    return res.status(200).json({
      success: true,
      files,
    });
  } catch (error) {
    console.error("API /api/generate failed:", error);

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
