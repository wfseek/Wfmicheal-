import Groq from "groq-sdk";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "POST only" });

  try {
    const { prompt } = req.body || {};
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) return res.status(500).json({ success: false, error: "Missing GROQ_API_KEY" });
    if (!prompt || !prompt.trim()) return res.status(400).json({ success: false, error: "Missing prompt" });

    const groq = new Groq({ apiKey });

    // === FULL MULTI-AGENT FLOW (simulated in one fast chain) ===
    const systemPrompt = `You are a team of specialized AI agents building a complete production-ready Next.js 14+ App Router website.

Agents:
- Planner Agent: creates architecture & tech stack
- Auth Agent: builds login/register if needed
- API Agent: builds API routes & database if needed
- UI Agent: builds modern responsive Tailwind UI + components
- E2E Agent: adds tests & makes sure everything works

Return ONLY file blocks in this exact format. No explanations.

File: package.json
\`\`\`json
{...}
\`\`\`

File: app/layout.tsx
\`\`\`tsx
{...}
\`\`\`

... (include every file needed)

Rules:
- Use Next.js App Router + Tailwind
- Modern, clean, responsive design
- Production-ready code
- If auth is needed → include full NextAuth or Clerk-style setup
- Output ONLY the File: blocks`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      temperature: 0.6,
      max_tokens: 12000
    });

    const text = completion.choices[0]?.message?.content || "";

    const files = {};
    const regex = /File:\s*([^\n]+)\n(?:```[\w]*\n)?([\s\S]*?)(?:```)?/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      const path = match[1].trim();
      let content = match[2].trim();
      content = content.replace(/^```[\w]*\n/, '').replace(/\n```$/, '');
      if (path && content) files[path] = content;
    }

    if (Object.keys(files).length === 0) {
      files["response.txt"] = text;
    }

    return res.status(200).json({ success: true, files, agentsUsed: true });

  } catch (error) {
    console.error("Generate error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown server error"
    });
  }
  }
