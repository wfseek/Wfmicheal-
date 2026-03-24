// api/build.js - Deploy this to Vercel
import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
  const { prompt, apiKey } = req.body;
  
  // Run your builder logic here
  const gemini = new GoogleGenerativeAI(apiKey);
  
  // Generate code...
  
  res.status(200).json({ 
    files: generatedFiles,
    deployUrl: 'https://vercel.com/new' 
  });
}
