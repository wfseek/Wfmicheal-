import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const config = { maxDuration: 300 };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { files } = req.body || {};
  
  if (!files || Object.keys(files).length === 0) {
    return res.status(400).json({ success: false, error: 'No files provided' });
  }

  const buildId = `build-${Date.now()}`;
  const buildPath = path.join('/tmp', buildId);

  try {
    // 1. Write files
    await fs.ensureDir(buildPath);
    
    for (const [filePath, content] of Object.entries(files)) {
      const fullPath = path.join(buildPath, filePath);
      await fs.ensureDir(path.dirname(fullPath));
      await fs.writeFile(fullPath, content);
    }

    // 2. Install dependencies
    try {
      execSync('npm install', {
        cwd: buildPath,
        stdio: 'pipe',
        timeout: 120000
      });
    } catch (e) {
      // Continue even if warnings
    }

    // 3. Build
    execSync('npm run build', {
      cwd: buildPath,
      stdio: 'pipe',
      timeout: 180000,
      env: { ...process.env, NODE_ENV: 'production' }
    });

    // 4. Check build output
    const distPath = path.join(buildPath, 'dist');
    const outPath = path.join(buildPath, 'out');
    const buildOutput = await fs.pathExists(distPath) ? distPath : 
                       await fs.pathExists(outPath) ? outPath : null;

    if (!buildOutput) {
      throw new Error('Build failed - no output directory');
    }

    return res.status(200).json({
      success: true,
      buildId,
      message: 'Build successful',
      outputPath: buildOutput
    });

  } catch (error) {
    await fs.remove(buildPath).catch(() => {});
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Build failed',
      stage: 'build'
    });
  }
               }
