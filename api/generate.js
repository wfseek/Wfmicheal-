import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "POST only"
    });
  }

  try {
    const { prompt } = req.body || {};
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: "Missing GEMINI_API_KEY in Vercel environment variables"
      });
    }

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({
        success: false,
        error: "Missing prompt"
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: `
Create a production-ready Next.js website for this request:

"${prompt}"

Return ONLY file blocks in this exact format:

File: package.json
\`\`\`json
{
  "name": "site",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}
\`\`\`

File: app/layout.tsx
\`\`\`tsx
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
\`\`\`

File: app/page.tsx
\`\`\`tsx
export default function Home() {
  return <main>Hello</main>;
}
\`\`\`

If needed, also include additional files such as:
- app/globals.css
- components/*
- lib/*
- public/*

Rules:
- Use Next.js App Router
- Make the design modern and responsive
- Keep the code production-ready
- Do not write any explanation outside file blocks
`
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
      files
    });
  } catch (error) {
    console.error("API /api/generate failed:", error);

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown server error"
    });
  }
}
